'use strict';
const express = require('express'), multer = require('multer'), Database = require('better-sqlite3');
const crypto = require('crypto'), path = require('path'), fs = require('fs');

const { ADMIN_PASSWORD, SESSION_SECRET, DATA_KEY } = process.env;
if (!ADMIN_PASSWORD || !SESSION_SECRET || !/^[0-9a-f]{64}$/i.test(DATA_KEY || '')) {
  console.error('Weka ADMIN_PASSWORD, SESSION_SECRET na DATA_KEY (hex 64) kwenye .env');
  process.exit(1);
}
const KEY = Buffer.from(DATA_KEY, 'hex');
const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILES = path.join(DIR, 'files');
fs.mkdirSync(FILES, { recursive: true });
const db = new Database(path.join(DIR, 'homeconnect.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS workers(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, age INTEGER, gender TEXT, origin TEXT,
  exp INTEGER, educ TEXT, jobs TEXT, notes TEXT, nida TEXT, photo TEXT, clearance TEXT,
  approved INTEGER DEFAULT 0, found INTEGER DEFAULT 0, created TEXT);
CREATE TABLE IF NOT EXISTS employers(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, location TEXT, nida TEXT,
  jobs TEXT, need TEXT, offer TEXT, found INTEGER DEFAULT 0, created TEXT);`);

// ---- usimbaji fiche (AES-256-GCM) ----
const enc = b => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([c.update(b), c.final()]); return Buffer.concat([iv, c.getAuthTag(), ct]); };
const dec = b => { const d = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]); };
const encText = t => enc(Buffer.from(t)).toString('base64');
const decText = t => { try { return dec(Buffer.from(t, 'base64')).toString(); } catch { return ''; } };

// ---- vifaa vidogo ----
const sign = v => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('hex');
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(a => a[0]));
const isAdmin = req => { const [exp, sig] = (cookies(req).adm || '').split('.');
  return !!exp && Number(exp) > Date.now() && sig && sig.length === 64 &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp))); };
const needAdmin = (req, res, next) => isAdmin(req) ? next() : res.status(401).json({ error: 'Hairuhusiwi', code: 'auth' });
const hits = new Map();
const limit = (max, ms) => (req, res, next) => { const k = req.ip + req.path, n = Date.now(), h = hits.get(k);
  if (!h || n - h.t > ms) { hits.set(k, { n: 1, t: n }); return next(); }
  if (++h.n > max) return res.status(429).json({ error: 'Umejaribu mara nyingi. Subiri kidogo.', code: 'rate' }); next(); };
setInterval(() => { const n = Date.now(); for (const [k, h] of hits) if (n - h.t > 36e5) hits.delete(k); }, 6e5).unref();
const sniff = b => b[0] === 0xFF && b[1] === 0xD8 ? ['image/jpeg', '.jpg'] :
  b.subarray(0, 4).toString('hex') === '89504e47' ? ['image/png', '.png'] :
  b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? ['image/webp', '.webp'] : null;
const EXT = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const str = (v, n) => String(v ?? '').trim().slice(0, n);
const save = (buf, encrypt) => { const t = sniff(buf); if (!t) return null;
  const name = crypto.randomBytes(16).toString('hex') + t[1] + (encrypt ? '.enc' : '');
  fs.writeFileSync(path.join(FILES, name), encrypt ? enc(buf) : buf); return name; };
const rm = n => { if (n) fs.rm(path.join(FILES, path.basename(n)), { force: true }, () => {}); };
const jobsOf = v => [].concat(v || []).map(j => str(j, 40)).filter(Boolean).slice(0, 12);

// ---- Arifa kwa WhatsApp (WhatsApp Cloud API ya Meta) ----
const WA = { token: process.env.WA_TOKEN, id: process.env.WA_PHONE_ID, to: process.env.WA_ADMIN_TO,
  tpl: process.env.WA_TEMPLATE, lang: process.env.WA_TEMPLATE_LANG || 'sw' };
function notifyAdmin(text) {
  if (!WA.token || !WA.id || !WA.to || !WA.tpl) return;
  fetch(`https://graph.facebook.com/v20.0/${WA.id}/messages`, { method: 'POST',
    headers: { Authorization: 'Bearer ' + WA.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: WA.to, type: 'template',
      template: { name: WA.tpl, language: { code: WA.lang },
        components: [{ type: 'body', parameters: [{ type: 'text', text: text.slice(0, 500) }] }] } }) })
    .then(r => { if (!r.ok) r.text().then(t => console.error('WhatsApp:', r.status, t)); })
    .catch(e => console.error('WhatsApp:', e.message));
}

db.exec(`CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT UNIQUE, role TEXT, ref INTEGER, salt TEXT, hash TEXT);`);
const normPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length === 10 && d[0] === '0' ? '255' + d.slice(1) : d; };
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const pwBad = b => { if (normPhone(b.phone).length < 9) return 'Namba ya simu si sahihi.';
  if (String(b.password || '').length < 6) return 'Nywila iwe na angalau herufi 6.';
  if (db.prepare('SELECT 1 FROM accounts WHERE phone=?').get(normPhone(b.phone))) return 'Namba hii imeshasajiliwa. Tafadhali ingia.'; return null; };
const mkAcct = (role, b) => { const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO accounts(phone,role,ref,salt,hash) VALUES(?,?,?,?,?)').run(normPhone(b.phone), role, db.prepare('SELECT last_insert_rowid() id').get().id, salt, hashPw(String(b.password), salt)); };
const userOf = req => { const [id, exp, sig] = (cookies(req).usr || '').split('.');
  if (!id || !exp || !sig || sig.length !== 64 || Number(exp) < Date.now()) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign('u' + id + '.' + exp)))) return null;
  return db.prepare('SELECT * FROM accounts WHERE id=?').get(+id) || null; };
const SEC = process.env.NODE_ENV === 'production' ? '; Secure' : '';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'" });
  if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000');
  next(); });
app.use(express.json({ limit: '10kb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6e6, files: 2 } });

// ---- umma ----
app.post('/api/workers', limit(15, 36e5), upload.fields([{ name: 'photo', maxCount: 1 }]), (req, res) => {
  const b = req.body, nida = str(b.nida, 40).replace(/\D/g, ''), age = parseInt(b.age, 10), exp = parseInt(b.exp, 10);
  const pic = req.files?.photo?.[0], jobs = jobsOf(b.jobs);
  if (b.consent !== 'on') return res.status(400).json({ error: 'Kubali matumizi ya taarifa zako.', code: 'consent' });
  if (!str(b.name, 80) || !str(b.phone, 20) || !str(b.origin, 80) || !(age >= 18 && age <= 70) || !(exp >= 0 && exp <= 50) || !jobs.length)
    return res.status(400).json({ error: 'Jaza taarifa zote muhimu kwa usahihi.', code: 'fields' });
  if (nida && nida.length !== 20) return res.status(400).json({ error: 'Ukiweka NIDA, iwe na tarakimu 20.', code: 'nida' });
  if (pic && !sniff(pic.buffer)) return res.status(400).json({ error: 'Picha ya wasifu haikubaliki.', code: 'photo' });
  { const pe = pwBad(b); if (pe) return res.status(400).json({ error: pe, code: 'acct' }); }
  db.prepare(`INSERT INTO workers(name,phone,age,gender,origin,exp,educ,jobs,notes,nida,photo,clearance,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(str(b.name, 80), str(b.phone, 20), age, str(b.gender, 12), str(b.origin, 80), exp, str(b.educ, 40), JSON.stringify(jobs),
      str(b.notes, 500), encText(nida), pic ? save(pic.buffer, false) : null, null, new Date().toISOString());
  mkAcct('worker', b);
  notifyAdmin(`Mfanyakazi mpya: ${str(b.name, 80)}, simu ${str(b.phone, 20)}. Fungua Admin kuidhinisha.`);
  res.json({ ok: true });
});
app.post('/api/employers', limit(15, 36e5), (req, res) => {
  const b = req.body, nida = str(b.nida, 40).replace(/\D/g, '');
  if (b.consent !== 'on') return res.status(400).json({ error: 'Kubali matumizi ya taarifa zako.', code: 'consent' });
  if (!str(b.name, 80) || !str(b.phone, 20) || !str(b.location, 120) || !str(b.need, 800))
    return res.status(400).json({ error: 'Jaza taarifa zote muhimu.', code: 'fields' });
  if (nida && nida.length !== 20) return res.status(400).json({ error: 'Ukiweka NIDA, iwe na tarakimu 20.', code: 'nida' });
  { const pe = pwBad(b); if (pe) return res.status(400).json({ error: pe, code: 'acct' }); }
  db.prepare(`INSERT INTO employers(name,phone,location,nida,jobs,need,offer,created) VALUES(?,?,?,?,?,?,?,?)`)
    .run(str(b.name, 80), str(b.phone, 20), str(b.location, 120), encText(nida), JSON.stringify(jobsOf(b.jobs)), str(b.need, 800), str(b.offer, 12), new Date().toISOString());
  mkAcct('employer', b);
  notifyAdmin(`Ombi jipya la mwajiri: ${str(b.name, 80)}, simu ${str(b.phone, 20)}, ${str(b.location, 60)}.`);
  res.json({ ok: true });
});
app.get('/api/public/workers', (req, res) => {
  const rows = db.prepare('SELECT id,name,age,origin,exp,educ,jobs,photo FROM workers WHERE approved=1 AND found=0 ORDER BY id DESC').all();
  res.json(rows.map(w => ({ id: w.id, name: w.name.split(' ')[0], age: w.age, origin: w.origin, exp: w.exp, educ: w.educ, jobs: JSON.parse(w.jobs), photo: !!w.photo })));
});
app.get('/api/photo/:id', (req, res) => {
  const w = db.prepare('SELECT photo,approved FROM workers WHERE id=?').get(+req.params.id);
  if (!w || !w.photo || (!w.approved && !isAdmin(req))) return res.sendStatus(404);
  res.type(EXT[path.extname(w.photo)] || 'image/jpeg').set('Cache-Control', 'private, max-age=300')
    .send(fs.readFileSync(path.join(FILES, path.basename(w.photo))));
});

app.post('/api/login', limit(10, 9e5), (req, res) => {
  const a = db.prepare('SELECT * FROM accounts WHERE phone=?').get(normPhone(req.body.phone));
  const ok = a && crypto.timingSafeEqual(Buffer.from(hashPw(String(req.body.password || ''), a.salt)), Buffer.from(a.hash));
  if (!ok) return res.status(401).json({ error: 'Namba au nywila si sahihi', code: 'login' });
  const exp = String(Date.now() + 30 * 864e5);
  res.set('Set-Cookie', `usr=${a.id}.${exp}.${sign('u' + a.id + '.' + exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${SEC}`);
  res.json({ ok: true }); });
app.post('/api/logout', (req, res) => { res.set('Set-Cookie', 'usr=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/me', (req, res) => { const a = userOf(req); if (!a) return res.status(401).json({ error: 'Hujaingia' });
  const r = db.prepare(`SELECT * FROM ${a.role === 'worker' ? 'workers' : 'employers'} WHERE id=?`).get(a.ref) || {};
  res.set('Cache-Control', 'no-store').json({ role: a.role, name: r.name, phone: r.phone, approved: !!r.approved, found: !!r.found, jobs: r.jobs ? JSON.parse(r.jobs) : [] }); });

// ---- admin ----
app.post('/api/admin/login', limit(8, 9e5), (req, res) => {
  const a = Buffer.from(sign(String(req.body.password || ''))), b = Buffer.from(sign(ADMIN_PASSWORD));
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Nywila si sahihi', code: 'login' });
  const exp = String(Date.now() + 12 * 36e5);
  res.set('Set-Cookie', `adm=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.post('/api/admin/logout', (req, res) => { res.set('Set-Cookie', 'adm=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/admin/data', needAdmin, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const workers = db.prepare('SELECT * FROM workers ORDER BY id DESC').all().map(w => ({ ...w, jobs: JSON.parse(w.jobs), nida: decText(w.nida), photo: !!w.photo, clearance: !!w.clearance }));
  const employers = db.prepare('SELECT * FROM employers ORDER BY id DESC').all().map(e => ({ ...e, jobs: JSON.parse(e.jobs), nida: decText(e.nida) }));
  res.json({ workers, employers });
});
app.get('/api/admin/clearance/:id', needAdmin, (req, res) => {
  const w = db.prepare('SELECT clearance FROM workers WHERE id=?').get(+req.params.id);
  if (!w || !w.clearance) return res.sendStatus(404);
  const base = w.clearance.replace(/\.enc$/, '');
  res.set('Cache-Control', 'no-store').type(EXT[path.extname(base)] || 'image/jpeg')
    .send(dec(fs.readFileSync(path.join(FILES, path.basename(w.clearance)))));
});
const FIELDS = { workers: ['approved', 'found'], employers: ['found'] };
app.patch('/api/admin/:kind/:id', needAdmin, (req, res) => {
  const f = FIELDS[req.params.kind];
  if (!f || !f.includes(req.body.field)) return res.sendStatus(400);
  db.prepare(`UPDATE ${req.params.kind} SET ${req.body.field}=? WHERE id=?`).run(req.body.value ? 1 : 0, +req.params.id);
  res.json({ ok: true });
});
app.delete('/api/admin/:kind/:id', needAdmin, (req, res) => {
  if (!FIELDS[req.params.kind]) return res.sendStatus(400);
  const r = db.prepare(`SELECT * FROM ${req.params.kind} WHERE id=?`).get(+req.params.id);
  if (r) { rm(r.photo); rm(r.clearance); db.prepare(`DELETE FROM ${req.params.kind} WHERE id=?`).run(r.id); }
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));
app.use((err, req, res, next) => res.status(400).json({ code: err.code === 'LIMIT_FILE_SIZE' ? 'size' : 'bad' }));
app.listen(process.env.PORT || 3000, () => console.log('Home Connect inafanya kazi kwenye port ' + (process.env.PORT || 3000)));
app.get('/api/public/employers', (req, res) => {
  const mask = t => String(t || '').replace(/\+?\d[\d\s().-]{5,}\d/g, '[namba imefichwa]');
  const rows = db.prepare('SELECT id,name,location,jobs,need,offer,created FROM employers WHERE approved=1 AND found=0 ORDER BY id DESC LIMIT 100').all();
  res.json(rows.map(e => ({ id: e.id, name: e.name.split(' ')[0], location: mask(e.location), jobs: JSON.parse(e.jobs), need: mask(e.need), offer: mask(e.offer), created: e.created })));
});
try { db.exec('ALTER TABLE employers ADD COLUMN approved INTEGER DEFAULT 0'); } catch {}
FIELDS.employers.push('approved');
