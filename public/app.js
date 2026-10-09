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
