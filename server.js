'use strict';
const express = require('express'), multer = require('multer');
const { Pool } = require('pg');
const crypto = require('crypto'), path = require('path'), fs = require('fs');

const { ADMIN_PASSWORD, SESSION_SECRET, DATA_KEY, DATABASE_URL } = process.env;
if (!ADMIN_PASSWORD || !SESSION_SECRET || !DATABASE_URL || !/^[0-9a-f]{64}$/i.test(DATA_KEY || '')) {
  console.error('Weka ADMIN_PASSWORD, SESSION_SECRET, DATABASE_URL na DATA_KEY (hex 64)');
  process.exit(1);
}
const KEY = Buffer.from(DATA_KEY, 'hex');
const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILES = path.join(DIR, 'files');
fs.mkdirSync(FILES, { recursive: true });

// ---- Database: Neon (Postgres) ----
const pool = new Pool({ connectionString: DATABASE_URL.replace('&channel_binding=require', '') });
pool.on('error', e => console.error('Pool:', e.message));
process.on('unhandledRejection', e => console.error('Rejection:', e));
process.on('uncaughtException', e => console.error('Exception:', e));
const q = (sql, p = []) => { let i = 0;
  return pool.query(sql.replace(/\?/g, () => '$' + (++i)), p).then(r => r.rows); };
const db = { prepare: sql => ({
  run: (...p) => q(sql, p),
  get: async (...p) => (await q(sql, p))[0],
  all: (...p) => q(sql, p) }) };
pool.query(`
CREATE TABLE IF NOT EXISTS workers(
  id SERIAL PRIMARY KEY, name TEXT, phone TEXT, age INTEGER, gender TEXT, origin TEXT,
  exp INTEGER, educ TEXT, jobs TEXT, notes TEXT, nida TEXT, photo TEXT, clearance TEXT,
  approved INTEGER DEFAULT 0, found INTEGER DEFAULT 0, created TEXT);
CREATE TABLE IF NOT EXISTS employers(
  id SERIAL PRIMARY KEY, name TEXT, phone TEXT, location TEXT, nida TEXT,
  jobs TEXT, need TEXT, offer TEXT, found INTEGER DEFAULT 0, created TEXT);`)
  .then(() => console.log('Neon imeunganishwa'))
  .catch(e => { console.error('DB:', e.message); process.exit(1); });
const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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
app.post('/api/workers', limit(15, 36e5), upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'clearance', maxCount: 1 }]), ah(async (req, res) => {
  const b = req.body, nida = str(b.nida, 40).replace(/\D/g, ''), age = parseInt(b.age, 10), exp = parseInt(b.exp, 10);
  const pic = req.files?.photo?.[0], jobs = jobsOf(b.jobs);
  if (b.consent !== 'on') return res.status(400).json({ error: 'Kubali matumizi ya taarifa zako.', code: 'consent' });
  if (!str(b.name, 80) || !str(b.phone, 20) || !str(b.origin, 80) || !(age >= 18 && age <= 70) || !(exp >= 0 && exp <= 50) || !jobs.length)
    return res.status(400).json({ error: 'Jaza taarifa zote muhimu kwa usahihi.', code: 'fields' });
  if (nida.length !== 20) return res.status(400).json({ error: 'Namba ya NIDA lazima iwe na tarakimu 20.', code: 'nida' });
  if (pic && !sniff(pic.buffer)) return res.status(400).json({ error: 'Picha ya wasifu haikubaliki.', code: 'photo' });
  await db.prepare(`INSERT INTO workers(name,phone,age,gender,origin,exp,educ,jobs,notes,nida,photo,clearance,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(str(b.name, 80), str(b.phone, 20), age, str(b.gender, 12), str(b.origin, 80), exp, str(b.educ, 40), JSON.stringify(jobs),
      str(b.notes, 500), encText(nida), pic ? save(pic.buffer, false) : null, null, new Date().toISOString());
  notifyAdmin(`Mfanyakazi mpya: ${str(b.name, 80)}, simu ${str(b.phone, 20)}. Fungua Admin kuidhinisha.`);
  res.json({ ok: true });
}));
app.post('/api/employers', limit(15, 36e5), ah(async (req, res) => {
  const b = req.body, nida = str(b.nida, 40).replace(/\D/g, '');
  if (b.consent !== 'on') return res.status(400).json({ error: 'Kubali matumizi ya taarifa zako.', code: 'consent' });
  if (!str(b.name, 80) || !str(b.phone, 20) || !str(b.location, 120) || !str(b.need, 800))
    return res.status(400).json({ error: 'Jaza taarifa zote muhimu.', code: 'fields' });
  if (nida.length !== 20) return res.status(400).json({ error: 'Namba ya NIDA lazima iwe na tarakimu 20.', code: 'nida' });
  await db.prepare(`INSERT INTO employers(name,phone,location,nida,jobs,need,offer,created) VALUES(?,?,?,?,?,?,?,?)`)
    .run(str(b.name, 80), str(b.phone, 20), str(b.location, 120), encText(nida), JSON.stringify(jobsOf(b.jobs)), str(b.need, 800), str(b.offer, 12), new Date().toISOString());
  notifyAdmin(`Ombi jipya la mwajiri: ${str(b.name, 80)}, simu ${str(b.phone, 20)}, ${str(b.location, 60)}.`);
  res.json({ ok: true });
}));
app.get('/api/public/workers', ah(async (req, res) => {
  const rows = await db.prepare('SELECT id,name,age,origin,exp,educ,jobs,photo FROM workers WHERE approved=1 AND found=0 ORDER BY id DESC').all();
  res.json(rows.map(w => ({ id: w.id, name: w.name.split(' ')[0], age: w.age, origin: w.origin, exp: w.exp, educ: w.educ, jobs: JSON.parse(w.jobs), photo: !!w.photo })));
}));
app.get('/api/photo/:id', ah(async (req, res) => {
  const w = await db.prepare('SELECT photo,approved FROM workers WHERE id=?').get(+req.params.id);
  if (!w || !w.photo || (!w.approved && !isAdmin(req))) return res.sendStatus(404);
  res.type(EXT[path.extname(w.photo)] || 'image/jpeg').set('Cache-Control', 'private, max-age=300')
    .send(fs.readFileSync(path.join(FILES, path.basename(w.photo))));
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use((err, req, res, next) => { console.error(err.message); res.status(400).json({ code: err.code === 'LIMIT_FILE_SIZE' ? 'size' : 'bad' }); });
app.listen(process.env.PORT || 3000, () => console.log('Home Connect inafanya kazi kwenye port ' + (process.env.PORT || 3000)));
