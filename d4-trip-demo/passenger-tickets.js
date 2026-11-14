(()=>{'use strict';
const seed=['4445391086','4765359971','4445389483'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=()=>window.D4TripTicketsBridge;
let selected=0,editing=false;
function tickets(){const data=api()?.read();return Array.isArray(data)?data:seed.map(pnr=>({pnr,passengers:[],imageName:''}));}
function save(data){if(!api()?.canEdit())return alert('Only admins can edit tickets');api().save(data);editing=false;draw();}
function draw(){
const host=document.getElementById('d4-passenger-tickets');if(!host)return;
const all=tickets();selected=Math.max(0,Math.min(selected,all.length-1));const t=all[selected]||{pnr:'',passengers:[]};const admin=api()?.canEdit();
host.innerHTML='<div class="d4-pt-head"><h3>🎟️ Passenger E-Tickets</h3><p>PNR-wise passenger names, coach, seat and berth details</p></div>'+
'<div class="d4-pt-tabs">'+all.map((x,i)=>'<button type="button" data-pt-tab="'+i+'" class="'+(selected===i?'active':'')+'">Ticket '+(i+1)+'</button>').join('')+'</div>'+
'<div class="d4-pt-paper"><small>PNR NUMBER</small><h2>'+esc(t.pnr)+'</h2><div class="d4-pt-people">'+(t.passengers?.length?t.passengers.map((p,i)=>'<div class="d4-pt-person"><span>👤</span><div><strong>'+esc(p.name||'Passenger '+(i+1))+'</strong><small>'+esc(p.coach||'Coach pending')+' · '+esc(p.seat||'Seat pending')+' · '+esc(p.berth||'Berth pending')+'</small></div></div>').join(''):'<p class="d4-pt-empty">Passenger names not added yet. Upload your ticket or add details manually.</p>')+'</div>'+(t.imageName?'<small>📎 '+esc(t.imageName)+' (file name only)</small>':'')+'</div>'+
(admin?'<div class="d4-pt-actions"><button type="button" data-pt-edit>✏️ Edit Ticket</button><button type="button" data-pt-add>＋ Add Ticket</button><button type="button" data-pt-passenger>＋ Add Passenger</button></div>':'<p class="d4-pt-empty">Members can view saved ticket details.</p>')+
(editing&&admin?'<form id="d4-pt-form"><label>PNR <input name="pnr" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" required value="'+esc(t.pnr)+'"></label><div id="d4-pt-fields">'+(t.passengers||[]).map(personFields).join('')+'</div><button type="button" data-pt-more>＋ Add Passenger</button><label>Ticket reference file <input type="file" accept="image/*,.pdf" id="d4-pt-file"></label><small>File is not uploaded; only its name is saved. Enter passenger details manually.</small><div class="d4-pt-actions"><button type="submit">Save Ticket</button><button type="button" data-pt-cancel>Cancel</button><button type="button" data-pt-delete>Delete Ticket</button></div></form>':'');
}
function personFields(p={}){return '<div class="d4-pt-fields"><label>Passenger name<input name="name" value="'+esc(p.name||'')+'" placeholder="Full name"></label><label>Coach<input name="coach" value="'+esc(p.coach||'')+'" placeholder="S1"></label><label>Seat number<input name="seat" value="'+esc(p.seat||'')+'" placeholder="42"></label><label>Berth<select name="berth">'+['','Lower','Middle','Upper','Side Lower','Side Upper'].map(x=>'<option '+(x===(p.berth||'')?'selected':'')+'>'+x+'</option>').join('')+'</select></label><button type="button" data-pt-remove>Remove passenger</button></div>';}
document.addEventListener('click',e=>{const h=e.target.closest('#d4-passenger-tickets');if(!h)return;const b=e.target.closest('button');if(!b)return;
if(b.hasAttribute('data-pt-tab')){selected=Number(b.dataset.ptTab);editing=false;draw();}
if(!api()?.canEdit())return;
if(b.hasAttribute('data-pt-edit')||b.hasAttribute('data-pt-passenger')){editing=true;draw();if(b.hasAttribute('data-pt-passenger'))document.querySelector('#d4-pt-fields')?.insertAdjacentHTML('beforeend',personFields());}
if(b.hasAttribute('data-pt-add')){const a=tickets();a.push({pnr:'',passengers:[]});selected=a.length-1;editing=true;draw();}
if(b.hasAttribute('data-pt-more'))document.querySelector('#d4-pt-fields')?.insertAdjacentHTML('beforeend',personFields());
if(b.hasAttribute('data-pt-remove'))b.closest('.d4-pt-fields')?.remove();
if(b.hasAttribute('data-pt-cancel')){editing=false;draw();}
if(b.hasAttribute('data-pt-delete')){if(!confirm('Delete this ticket?'))return;const a=tickets();a.splice(selected,1);selected=0;save(a);}
});
document.addEventListener('submit',e=>{if(e.target.id!=='d4-pt-form')return;e.preventDefault();if(!api()?.canEdit())return;const f=e.target;const pnr=f.elements.pnr.value.trim();if(!/^\d{10}$/.test(pnr))return alert('Enter a valid 10-digit PNR');const a=tickets();if(a.some((x,i)=>i!==selected&&x.pnr===pnr))return alert('PNR already added');const passengers=[...f.querySelectorAll('.d4-pt-fields')].map(x=>Object.fromEntries(['name','coach','seat','berth'].map(k=>[k,x.querySelector('[name="'+k+'"]').value.trim()]))).filter(x=>x.name||x.coach||x.seat||x.berth);a[selected]={pnr,passengers,imageName:f.querySelector('#d4-pt-file')?.files?.[0]?.name||a[selected]?.imageName||''};save(a);});
const observer=new MutationObserver(()=>{if(document.getElementById('d4-passenger-tickets')&&!document.getElementById('d4-pt-form'))draw();});let last=null;setInterval(()=>{const h=document.getElementById('d4-passenger-tickets');if(h!==last){last=h;if(h)draw();}},450);
})();