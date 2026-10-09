const JOBS=['Kulea watoto','Kupika','Usafi','Kufua','Kuhudumia wazee','Mlinzi','Bustani'];
const $=s=>document.querySelector(s),main=$('#main');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jobBoxes=()=>`<label>Kazi</label><div class="chk">${JOBS.map(j=>`<label><input type="checkbox" name="jobs" value="${j}"> ${j}</label>`).join('')}</div>`;
const consent=`<label><input type="checkbox" name="consent" value="on"> Nakubali taarifa zangu zitumike</label>`;
const msg=(t,ok)=>`<div class="msg ${ok?'ok':'err'}">${esc(t)}</div>`;
const tabs={find:'Tafuta',worker:'Mfanyakazi',employer:'Mwajiri',admin:'Admin'};
$('#nav').innerHTML=Object.entries(tabs).map(([k,v])=>`<button data-t="${k}">${v}</button>`).join('');
$('#nav').onclick=e=>e.target.dataset.t&&go(e.target.dataset.t);
async function api(u,o){const r=await fetch(u,o);let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'Hitilafu imetokea');return d}
function go(t){document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));({find,worker,employer,admin})[t]()}
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
go('find');
