const JOBS=['Kulea watoto','Kupika','Usafi','Kufua','Kuhudumia wazee','Mlinzi','Bustani'];
const WA='255685573088';/* weka namba yako ya WhatsApp hapa, mfano 2557XXXXXXXX */
const $=s=>document.querySelector(s),main=$('#main');$('#wa').href='https://wa.me/'+WA;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jobBoxes=()=>`<label>Kazi</label><div class="chk">${JOBS.map(j=>`<label><input type="checkbox" name="jobs" value="${j}"> ${j}</label>`).join('')}</div>`;
const consent=`<label><input type="checkbox" name="consent" value="on"> Nakubali taarifa zangu zitumike</label>`;
const msg=(t,ok)=>`<div class="msg ${ok?'ok':'err'}">${esc(t)}</div>`;
async function api(u,o){const r=await fetch(u,o);let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'Hitilafu imetokea');return d}
function go(t){({find:'tf',worker:'tw',employer:'te'});['tw','te','tf'].forEach(i=>$('#'+i).classList.toggle('on',{worker:'tw',employer:'te',find:'tf'}[t]===i));
 ({find,worker,employer,admin})[t]();main.scrollIntoView({behavior:'smooth'})}
document.body.addEventListener('click',e=>{const t=e.target.dataset.t;if(t)go(t)});
api('/api/public/workers').then(w=>$('#cnt').textContent=w.length).catch(()=>{});
async function find(){main.innerHTML='<p>Inapakia...</p>';
 try{const w=await api('/api/public/workers');main.innerHTML=w.length?w.map(x=>`<div class="card">${x.photo?`<img src="/api/photo/${x.id}" alt="">`:''}<b>${esc(x.name)}</b>, miaka ${x.age}<br><small>${esc(x.origin)} · uzoefu miaka ${x.exp} · ${esc(x.educ)}</small><br>${x.jobs.map(esc).join(', ')}</div>`).join(''):'<p>Hakuna wafanyakazi bado.</p>'}
 catch(e){main.innerHTML=msg(e.message)}}
function worker(){main.innerHTML=`<form id="f"><h3>Usajili wa mfanyakazi</h3>
<label>Jina kamili</label><input name="name" required><label>Simu</label><input name="phone" type="tel" required>
<label>Umri</label><input name="age" type="number" min="18" max="70" required><label>Jinsia</label><select name="gender"><option>Mwanamke</option><option>Mwanaume</option></select>
<label>Mahali ulipotoka</label><input name="origin" required><label>Uzoefu (miaka)</label><input name="exp" type="number" min="0" max="50" required>
<label>Elimu</label><select name="educ"><option>Msingi</option><option>Sekondari</option><option>Chuo</option></select>${jobBoxes()}
<label>Namba ya NIDA (tarakimu 20)</label><input name="nida" inputmode="numeric" required>
<label>Picha yako (si lazima)</label><input name="photo" type="file" accept="image/*">
<label>Hati safi ya Polisi (picha)</label><input name="clearance" type="file" accept="image/*" required>
<label>Maelezo</label><textarea name="notes" rows="3"></textarea>${consent}<button class="btn">Tuma</button><div id="o"></div></form>`;
 $('#f').onsubmit=async e=>{e.preventDefault();$('#o').innerHTML='Inatuma...';
  try{await api('/api/workers',{method:'POST',body:new FormData(e.target)});e.target.reset();$('#o').innerHTML=msg('Asante! Umesajiliwa, subiri idhini ya admin.',1)}catch(x){$('#o').innerHTML=msg(x.message)}}}
function employer(){main.innerHTML=`<form id="f"><h3>Ombi la mwajiri</h3>
<label>Jina kamili</label><input name="name" required><label>Simu</label><input name="phone" type="tel" required>
<label>Mahali unapoishi</label><input name="location" required>${jobBoxes()}<label>Unahitaji nini?</label><textarea name="need" rows="3" required></textarea>
<label>Mshahara unaotoa</label><input name="offer" maxlength="12"><label>Namba ya NIDA (tarakimu 20)</label><input name="nida" inputmode="numeric" required>${consent}<button class="btn">Tuma</button><div id="o"></div></form>`;
 $('#f').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target),b=Object.fromEntries(fd);b.jobs=fd.getAll('jobs');
  try{await api('/api/employers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});e.target.reset();$('#o').innerHTML=msg('Asante! Ombi lako limepokelewa.',1)}catch(x){$('#o').innerHTML=msg(x.message)}}}
async function admin(){try{const d=await api('/api/admin/data');panel(d)}catch{main.innerHTML=`<form id="f"><h3>Admin</h3><label>Nywila</label><input name="password" type="password" required><button class="btn">Ingia</button><div id="o"></div></form>`;
 $('#f').onsubmit=async e=>{e.preventDefault();try{await api('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:e.target.password.value})});admin()}catch(x){$('#o').innerHTML=msg(x.message)}}}}
function panel(d){const row=(k,x)=>`<div class="card"><b>${esc(x.name)}</b> · ${esc(x.phone)}<br><small>${esc(x.origin||x.location)} · NIDA ${esc(x.nida)}</small><br>${x.jobs.map(esc).join(', ')}<br>${esc(x.need||x.notes||'')}<br>
${k==='workers'?`<button class="btn" data-a="p" data-k="${k}" data-id="${x.id}" data-f="approved" data-v="${x.approved?0:1}">${x.approved?'Ondoa idhini':'Idhinisha'}</button>${x.clearance?`<a class="btn grey" href="/api/admin/clearance/${x.id}" target="_blank">Hati</a>`:''}`:''}
<button class="btn grey" data-a="p" data-k="${k}" data-id="${x.id}" data-f="found" data-v="${x.found?0:1}">${x.found?'Rudisha':'Amepatikana'}</button><button class="btn red" data-a="d" data-k="${k}" data-id="${x.id}">Futa</button></div>`;
 main.innerHTML=`<button class="btn grey" id="out">Toka</button><h3>Wafanyakazi (${d.workers.length})</h3>${d.workers.map(x=>row('workers',x)).join('')}<h3>Waajiri (${d.employers.length})</h3>${d.employers.map(x=>row('employers',x)).join('')}`;
 $('#out').onclick=async()=>{await api('/api/admin/logout',{method:'POST'});admin()};
 main.onclick=async e=>{const b=e.target.dataset;if(!b.a)return;if(b.a==='d'&&!confirm('Futa kabisa?'))return;
  await api(`/api/admin/${b.k}/${b.id}`,b.a==='d'?{method:'DELETE'}:{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({field:b.f,value:+b.v})});admin()}}
go('worker');window.scrollTo(0,0);
/* --- AKAUNTI NA KUINGIA --- */
(function(){
const pw='<label>Nywila ya akaunti (angalau herufi 6)</label><input name="password" type="password" minlength="6" required>';
const fix=()=>{const c=document.querySelector('#f input[name=consent]');
 if(c&&!document.querySelector('#f input[name=password]'))c.closest('label').insertAdjacentHTML('beforebegin',pw)};
fix();new MutationObserver(fix).observe(main,{childList:true,subtree:true});
document.querySelector('footer').insertAdjacentHTML('afterbegin','<button id="lg" class="lnk">Ingia</button> ');
$('#lg').onclick=()=>login();
})();
function login(){main.innerHTML=`<form id="f"><h3>Ingia</h3><label>Namba ya simu</label><input name="phone" type="tel" required><label>Nywila</label><input name="password" type="password" required><button class="btn">Ingia</button><div id="o"></div></form>`;
 $('#f').onsubmit=async e=>{e.preventDefault();try{await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});account()}catch(x){$('#o').innerHTML=msg(x.message)}}}
async function account(){try{const m=await api('/api/me');
 const st=m.role==='worker'?(m.approved?'Umeidhinishwa, unaonekana kwenye orodha.':'Unasubiri idhini ya admin.'):'Ombi lako limepokelewa, admin atawasiliana nawe.';
 main.innerHTML=`<div class="card"><h3>Karibu, ${esc(m.name)}</h3><p>${m.role==='worker'?'Mfanyakazi':'Mwajiri'} · ${esc(m.phone)}</p><p>${m.found?'Umepata muunganisho.':st}</p><button class="btn grey" id="out">Toka</button></div>`;
 $('#out').onclick=async()=>{await api('/api/logout',{method:'POST'});login()}}catch{login()}}
/* --- NIDA SI LAZIMA --- */
(function(){
const fixN=()=>{const n=document.querySelector('#f input[name=nida]');
 if(n&&n.required){n.required=false;const l=n.previousElementSibling;if(l)l.textContent='Namba ya NIDA (si lazima)'}};
fixN();new MutationObserver(fixN).observe(main,{childList:true,subtree:true});
})();
/* --- KITUFE CHA KUPIGA SIMU --- */
if(!document.querySelector('.tel'))document.body.insertAdjacentHTML('beforeend','<a class="wa tel" href="tel:+255683560657">📞 Piga simu</a>');
/* --- KITUFE CHA KUPIGA SIMU --- */
if(!document.querySelector('.tel'))document.body.insertAdjacentHTML('beforeend','<a class="wa tel" href="tel:+255683560657">📞 Piga simu</a>');

/* --- KITUFE CHA KUPIGA SIMU (toleo imara) --- */
document.querySelectorAll('.tel').forEach(e=>e.remove());
document.body.insertAdjacentHTML('beforeend','<a href="tel:+255683560657" style="position:fixed;right:10px;bottom:78px;z-index:99;background:#1b7a5a;color:#fff;font-weight:700;font-size:16px;padding:12px 18px;border-radius:40px;text-decoration:none;box-shadow:0 3px 8px #0003">📞 Piga simu</a>');
/* --- MAOMBI YA WAAJIRI (bila namba za simu) --- */
(function(){
$('#tf').insertAdjacentHTML('afterend','<button id="tr">Maombi ya waajiri</button>');
$('#tr').onclick=async()=>{['tw','te','tf'].forEach(i=>$('#'+i).classList.remove('on'));$('#tr').classList.add('on');
 main.innerHTML='<p>Inapakia...</p>';
 try{const r=await api('/api/public/employers');
  const w=typeof WA!=='undefined'?WA:'';
  main.innerHTML=r.length?r.map(x=>`<div class="card"><b>${esc(x.name)}</b> · ${esc(x.location)}<br>${x.jobs.map(esc).join(', ')}<p>${esc(x.need)}</p>${x.offer?`<small>Mshahara: ${esc(x.offer)}</small><br>`:''}<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${w}?text=${encodeURIComponent('Nina nia na ombi la mwajiri namba '+x.id)}">Nina nia</a></div>`).join(''):'<p>Hakuna maombi kwa sasa.</p>';
 }catch(e){main.innerHTML=msg(e.message)}main.scrollIntoView({behavior:'smooth'})};
})();
/* --- IDHINI YA MAOMBI YA WAAJIRI (admin) --- */
(function(){const _p=panel;
panel=function(d){_p(d);
 document.querySelectorAll('[data-a=d][data-k=employers]').forEach(b=>{const e=d.employers.find(x=>x.id==b.dataset.id);if(!e)return;
  b.insertAdjacentHTML('beforebegin',`<button class="btn" data-a="p" data-k="employers" data-id="${e.id}" data-f="approved" data-v="${e.approved?0:1}">${e.approved?'Ondoa idhini':'Idhinisha'}</button>`)})};
})();
/* --- ENGLISH / KISWAHILI --- */
(function(){
const D={'Pata msaidizi wa ndani unayemwamini, kwa haraka na usalama':'Find a trusted house helper, quickly and safely','Natafuta kazi':"I'm looking for work",'Nahitaji msaidizi':'I need a helper','Wafanyakazi':'Workers','Wanakaguliwa':'Verified','1. Jisajili':'1. Register','2. Admin anakagua':'2. Admin verifies','3. Mkataba na kuunganishwa':'3. Contract and connection','Wafanyakazi walio tayari':'Available workers','Maombi ya waajiri':'Employer requests','Ingia':'Log in','Toka':'Log out','📞 Piga simu':'📞 Call',
'Usajili wa mfanyakazi':'Worker registration','Ombi la mwajiri':'Employer request','Jina kamili':'Full name','Simu':'Phone','Umri':'Age','Jinsia':'Gender','Mwanamke':'Female','Mwanaume':'Male','Mahali ulipotoka':'Place of origin','Uzoefu (miaka)':'Experience (years)','Elimu':'Education','Msingi':'Primary','Sekondari':'Secondary','Chuo':'College','Kazi':'Jobs',
'Kulea watoto':'Childcare','Kupika':'Cooking','Usafi':'Cleaning','Kufua':'Laundry','Kuhudumia wazee':'Elderly care','Mlinzi':'Security guard','Bustani':'Gardening',
'Namba ya NIDA (si lazima)':'NIDA number (optional)','Namba ya NIDA (tarakimu 20)':'NIDA number (20 digits)','Namba ya NIDA (si lazima, tarakimu 20)':'NIDA number (optional, 20 digits)','Picha yako (si lazima)':'Your photo (optional)','Picha yako (si lazima, ila inasaidia kupata kazi)':'Your photo (optional, but it helps you get work)','Hati safi ya Polisi (picha)':'Police clearance certificate (photo)','Maelezo':'Notes',
'Nakubali taarifa zangu zitumike':'I agree to my information being used','Tuma':'Submit','Nywila ya akaunti (angalau herufi 6)':'Account password (at least 6 characters)','Mahali unapoishi':'Where you live','Unahitaji nini?':'What do you need?','Mshahara unaotoa':'Salary offered','Namba ya simu':'Phone number','Nywila':'Password','Inapakia...':'Loading...','Inatuma...':'Sending...','Hakuna wafanyakazi bado.':'No workers yet.','Hakuna maombi kwa sasa.':'No requests right now.','Nina nia':"I'm interested",
'Idhinisha':'Approve','Ondoa idhini':'Remove approval','Amepatikana':'Found','Rudisha':'Restore','Futa':'Delete','Hati':'Document','Nywila (admin)':'Password',
'Asante! Umesajiliwa, subiri idhini ya admin.':'Thank you! You are registered, please wait for admin approval.','Asante! Ombi lako limepokelewa.':'Thank you! Your request has been received.',
'Kubali matumizi ya taarifa zako.':'Please accept the use of your information.','Jaza taarifa zote muhimu kwa usahihi.':'Fill in all required details correctly.','Jaza taarifa zote muhimu.':'Fill in all required details.','Pakia picha ya hati safi ya Polisi (JPG/PNG).':'Upload a photo of your police clearance (JPG/PNG).','Picha ya wasifu haikubaliki.':'The profile photo is not accepted.','Namba hii imeshasajiliwa. Tafadhali ingia.':'This number is already registered. Please log in.','Nywila iwe na angalau herufi 6.':'Password must be at least 6 characters.','Namba ya simu si sahihi.':'Phone number is not valid.','Namba au nywila si sahihi':'Wrong number or password','Umejaribu mara nyingi. Subiri kidogo.':'Too many attempts. Please wait a moment.','Ukiweka NIDA, iwe na tarakimu 20.':'If you enter NIDA, it must have 20 digits.','Hitilafu imetokea':'An error occurred'};
const R=[[/miaka (\d+)/g,'$1 yrs'],[/uzoefu/g,'experience'],[/Karibu, /g,'Welcome, '],[/Mshahara:/g,'Salary:'],[/Umeidhinishwa, unaonekana kwenye orodha\./g,'You are approved and listed.'],[/Unasubiri idhini ya admin\./g,'Waiting for admin approval.']];
const tr=s=>{const t=s.trim();if(D[t])return s.replace(t,D[t]);let o=s;R.forEach(([a,b])=>{o=o.replace(a,b)});return o};
const nodes=new Map();let en=false;
const walk=()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let x;
 while(x=w.nextNode()){const p=x.parentNode;if(!p||['SCRIPT','STYLE'].includes(p.tagName)||p.id==='lang')continue;
  if(p.tagName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',x.data.trim());
  if(!nodes.has(x)){const t=tr(x.data);if(t!==x.data){nodes.set(x,x.data);x.data=t}}}};
const btn=document.createElement('button');btn.id='lang';
btn.style.cssText='position:absolute;top:14px;right:12px;z-index:50;background:#ffffff33;color:#fff;border:0;border-radius:20px;padding:8px 14px;font-size:15px';
document.body.appendChild(btn);
const set=v=>{en=v;btn.textContent=v?'Kiswahili':'English';try{localStorage.setItem('lang',v?'en':'sw')}catch{}
 if(v)walk();else{nodes.forEach((o,x)=>{if(x.isConnected)x.data=o});nodes.clear()}};
btn.onclick=()=>set(!en);
new MutationObserver(()=>{if(en)walk()}).observe(document.body,{childList:true,subtree:true});
let s=null;try{s=localStorage.getItem('lang')}catch{}
set(s==='en');
})();
/* --- ADMIN: DALILI YA KUPAKIA NA KUPANDA JUU --- */
(function(){const _a=admin;
admin=async function(){main.innerHTML='<p>Inapakia...</p>';window.scrollTo({top:0,behavior:'smooth'});await _a();window.scrollTo({top:0,behavior:'smooth'})};
})();
