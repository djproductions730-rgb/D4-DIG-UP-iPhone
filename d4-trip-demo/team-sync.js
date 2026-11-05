import {doc,getDoc,setDoc,deleteDoc,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const local=window.D4TripLocal;
const id=local.teamId;
let generation=0,role='',revision=0,latest=null,queued=null,writing=false,stops=[];
const cloud=()=>window.D4TripCloud;
const user=()=>cloud()?.auth?.currentUser;
const ref=tripId=>doc(cloud().cloudDb,'teamTrips',tripId);
const grant=(tripId,email)=>doc(ref(tripId),'access',email);
const say=message=>local.toast(message);
const canEdit=()=>!!user()?.emailVerified && (role==='owner'||role==='admin');
const link=tripId=>{const url=new URL(location.href);url.search='';url.searchParams.set('team',tripId);url.hash='';return url.href};
function clear(){
 generation++;for(const stop of stops)stop();stops=[];role='';revision=0;latest=null;queued=null;writing=false;
 if(id)local.showTeam(null);
}
function connect(){
 clear();
 if(!id||!user()?.emailVerified)return;
 const token=generation;
 const failed=e=>{if(token===generation){clear();say('Trip access unavailable: '+e.message)}};
 const subscribe=()=>{stops.push(onSnapshot(ref(id),{includeMetadataChanges:true},s=>{
   if(token!==generation||s.metadata.hasPendingWrites||s.metadata.fromCache)return;
   if(!s.exists()){failed(Error('Trip does not exist'));return}
   latest=s.data();if(!writing&&!queued){revision=latest.revision;local.showTeam(structuredClone(latest.trip))}
 },failed))};
 if(cloud().isVerifiedOwner()){role='owner';subscribe();return}
 stops.push(onSnapshot(grant(id,user().email.toLowerCase()),{includeMetadataChanges:true},s=>{
   if(token!==generation||s.metadata.fromCache)return;
   if(!s.exists()){failed(Error('Ask your trip admin to invite this email.'));return}
   const initial=!role;role=s.data().role;if(initial)subscribe();else local.render();
 },failed));
}
async function drain(){
 if(writing||!queued)return;
 const token=generation,uid=user().uid;writing=true;
 try{while(queued&&token===generation){
   const trip=queued;queued=null;const expected=revision;
   await runTransaction(cloud().cloudDb,async tx=>{
     if(token!==generation||user()?.uid!==uid||!canEdit())throw Error('Account or access changed');
     const r=ref(id),s=await tx.get(r);
     if(s.data()?.revision!==expected)throw Error('Another admin changed this trip. Reopen it and retry.');
     tx.set(r,{trip,revision:expected+1,updatedBy:uid,updatedAt:serverTimestamp()});
   });
   if(token===generation){revision=expected+1;say('Shared trip saved');}
 }}catch(e){if(token===generation){say('Change not saved: '+e.message);connect()}}
 finally{if(token===generation){writing=false;if(latest&&latest.revision>revision){revision=latest.revision;local.showTeam(structuredClone(latest.trip))}}}
}
function save(t){
 if(!t||t.id!==id||!canEdit()){if(latest)local.showTeam(structuredClone(latest.trip));say('Only trip admins can save changes.');return false}
 queued=structuredClone(t);cloud().status='Saving shared trip';void drain();return true;
}
function controls(t){
 if(!id)return cloud()?.isVerifiedOwner()?'<section class="card"><h3>Team access</h3><button class="btn mint" data-team="publish">Open shared copy</button></section>':'';
 if(!canEdit())return '<p class="notice">Team trip · Member view</p>';
 return '<section class="card"><h3>Team access</h3><p>Invite a verified email or issue a one-time code. Members only view; Admins can edit. Main Admin alone can assign Admins.</p><div class="row"><button class="btn mint" data-team="invite">Invite member</button>'+(role==='owner'?'<button class="btn" data-team="admin">Assign trip admin</button>':'')+'<button class="btn" data-team="revoke">Remove access</button><button class="btn" data-team="copy">Copy trip link</button>'+(window.D4TripInvite?.available?'<button class="btn mint" data-team="member-code">Generate Member Code</button>'+(role==='owner'?'<button class="btn" data-team="admin-code">Generate Admin Code</button>':''):'')+'</div>'+(window.D4TripInvite?.available?'':'<p class="tiny">Secure code joining awaits Firebase Functions and App Check activation. For now, invite a verified email and share the trip link.</p>')+'</section>';
}
function library(){
 return '<section class="card"><h3>Team trips</h3><button class="btn mint" data-team="open">Open invited trip link</button></section>';
}
function displayCode(result){
 const host=document.querySelector('[data-team="member-code"]')?.closest('section');
 if(!host)return;
 document.getElementById('teamInviteResult')?.remove();
 const box=document.createElement('section');box.id='teamInviteResult';box.className='card';box.style.marginTop='12px';box.setAttribute('role','status');
 const heading=document.createElement('h3');heading.textContent=(result.role==='admin'?'Admin':'Member')+' invitation — one use';
 const note=document.createElement('p');note.textContent='Expires in 7 days. Share privately with one verified Firebase account. Create a new code for each person.';
 const input=document.createElement('input');input.className='input';input.readOnly=true;input.value=result.code;input.setAttribute('aria-label','Secure invitation code');
 const button=document.createElement('button');button.className='btn mint';button.type='button';button.textContent='Copy Code';
 button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(input.value);say('Invitation code copied');}catch{input.focus();input.select();say('Select and copy the highlighted code');}});
 box.append(heading,note,input,button);host.insertAdjacentElement('afterend',box);
}
document.addEventListener('click',async event=>{
 const action=event.target.closest('[data-team]')?.dataset.team;if(!action)return;
 try{
 if(action==='open'){
  const input=prompt('Paste the trip link your admin shared');if(!input)return;
  const url=new URL(input,location.href),tripId=url.searchParams.get('team');
  if(url.origin!==location.origin||!tripId||!/^[a-zA-Z0-9_-]{1,100}$/.test(tripId))throw Error('Use a trip link from this app');
  location.assign(link(tripId));return;
 }
 if(action==='publish'){
  if(id||!cloud()?.isVerifiedOwner())return;
  const trip=structuredClone(local.currentTrip());const r=ref(trip.id);
  if(!(await getDoc(r)).exists()){
   if(!confirm('Create a shared copy of this trip, including its roster, expenses, payments, plans, notes and files? Chat history is excluded. Continue editing the shared copy with your team.'))return;
   trip.chats={group:[],admins:[]};
   await runTransaction(cloud().cloudDb,async tx=>{if(!(await tx.get(r)).exists())tx.set(r,{trip,revision:1,updatedBy:user().uid,updatedAt:serverTimestamp()})});
  }
  location.assign(link(trip.id));return;
 }
 if(!id||!canEdit())return;
 if(action==='member-code'||action==='admin-code'){
  const invite=window.D4TripInvite;
  if(!invite?.available)throw Error('Code joining is not enabled on this app yet');
  const result=await invite.issue(id,action==='admin-code'?'admin':'member');
  displayCode(result);say('One-time invitation created');return;
 }
 if(action==='copy'){await navigator.clipboard.writeText(link(id));say('Trip link copied');return}
 const input=prompt('Team member’s verified Firebase email');if(!input)return;
 const email=input.trim().toLowerCase();
 if(!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email))throw Error('Enter a valid email');
 const r=grant(id,email);
 if(action==='revoke'){if(confirm('Remove trip access for '+email+'?')){await deleteDoc(r);say('Access removed')}return}
 if(action==='admin'&&role!=='owner')return;
 await setDoc(r,{role:action==='admin'?'admin':'member'});say('Access saved. Copy the trip link to share it.');
 }catch(e){say('Team access: '+e.message)}
});
window.D4Team={save,controls,canEdit,library};
window.addEventListener('d4-auth',connect);
if(cloud()?.ready)connect();
