import {doc,getDoc,getDocFromServer,getDocsFromServer,collection,setDoc,deleteDoc,onSnapshot,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const local=window.D4TripLocal;
const id=local.teamId;
let generation=0,role='',revision=0,latest=null,queued=null,writing=false,stops=[],invited=[];
const cloud=()=>window.D4TripCloud;
const user=()=>cloud()?.auth?.currentUser;
const ref=tripId=>doc(cloud().cloudDb,'teamTrips',tripId);
const grant=(tripId,email)=>doc(ref(tripId),'access',email);
const say=message=>local.toast(message);
const htmlSafe=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canEdit=()=>!!user()?.emailVerified && (role==='owner'||role==='admin');
const canRemove=()=>!!user()?.emailVerified && role==='owner' && cloud()?.isVerifiedOwner?.()===true;
const link=tripId=>{const url=new URL(location.href);url.search='';url.searchParams.set('team',tripId);url.hash='';return url.href};
function clear(){
 generation++;for(const stop of stops)stop();stops=[];role='';revision=0;latest=null;queued=null;writing=false;invited=[];
 if(id)local.showTeam(null);
}
function connect(){
 clear();
 if(!id||!user())return;
 const token=generation;
 const failed=e=>{if(token===generation){say('Trip access unavailable: '+e.message);clear()}};
 let subscribed=false,emailRole='',uidRole='';
 const subscribe=()=>{
   if(subscribed)return;
   subscribed=true;
   stops.push(onSnapshot(ref(id),{includeMetadataChanges:true},s=>{
     if(token!==generation||s.metadata.hasPendingWrites||s.metadata.fromCache)return;
     if(!s.exists()){failed(Error('Trip does not exist'));return}
     latest=s.data();
     if(!writing&&!queued){revision=latest.revision;local.showTeam(structuredClone(latest.trip))}
   },failed));
 };
 const setRole=()=>{
   if(token!==generation)return;
   const next=emailRole==='admin'?'admin':emailRole==='member'?'member':uidRole==='member'?'member':'';
   if(role===next)return;
   const wasAuthorized=!!role;
   role=next;
   if(next)subscribe();
   if(wasAuthorized&&!next){connect();return}
   local.render();
   window.D4TripJoin?.accessChanged?.();
 };
 if(cloud().isVerifiedOwner()){
   role='owner';subscribe();
   stops.push(onSnapshot(collection(ref(id),'access'),{includeMetadataChanges:true},snap=>{
     if(token!==generation||snap.metadata.fromCache)return;
     invited=snap.docs.map(d=>({email:d.id,role:d.data().role})).sort((a,b)=>a.email.localeCompare(b.email));
     local.render();
   },failed));
   window.D4TripJoin?.accessChanged?.();
   return;
 }
 stops.push(onSnapshot(doc(ref(id),'accessUid',user().uid),{includeMetadataChanges:true},s=>{
   if(token!==generation||s.metadata.fromCache)return;
   uidRole=s.exists()?s.data().role:'';
   setRole();
 },failed));
 if(user().emailVerified&&user().email){
   stops.push(onSnapshot(grant(id,user().email.toLowerCase()),{includeMetadataChanges:true},s=>{
     if(token!==generation||s.metadata.fromCache)return;
     emailRole=s.exists()?s.data().role:'';
     setRole();
   },failed));
 }
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
async function inviteMember(email){
 if(!id||!canEdit())throw Error('Only Main Admin and Trip Admin can add a member');
 const normalized=String(email||'').trim().toLowerCase();
 if(!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(normalized))throw Error('Enter a valid Firebase account email');
 await setDoc(grant(id,normalized),{role:'member'});
 return normalized;
}
function controls(t){
 const accounts=canRemove()?'<div class="card" style="margin-top:12px"><h4>Joined Firebase accounts</h4><p class="tiny">Only Main Admin can remove access. Payment and expense history remains saved.</p>'+
  (invited.length?invited.map(g=>'<div class="list-row" style="gap:10px;display:flex;justify-content:space-between;align-items:center"><span style="overflow-wrap:anywhere"><b>'+htmlSafe(g.email)+'</b><small>'+htmlSafe(g.role)+'</small></span><button type="button" class="btn small negative" data-team="revoke-email" data-email="'+htmlSafe(g.email)+'">Remove</button></div>').join(''):'<p class="tiny">No invited accounts yet.</p>')+'</div>':'';
 if(!id)return cloud()?.isVerifiedOwner()?'<section class="card"><h3>Team access</h3><button class="btn mint" data-team="publish">Open shared copy</button></section>':'';
 if(!canEdit())return '<p class="notice">Team trip · Member view</p>';
 return (window.D4TripJoin?.adminPanel?.()||'')+'<section class="card"><h3>🔗 Share Trip Link</h3>'+
 '<p>Friends open your trip link and enter only their name. Main Admin or Trip Admin reviews and approves each request. Only Main Admin can remove access.</p>'+
 '<div class="row">'+(canRemove()?'<button class="btn" data-team="admin">Assign Trip Admin</button><button class="btn" data-team="revoke">Remove Access</button>':'')+
 '<button class="btn mint" data-team="copy">📋 Copy Trip Join Link</button></div>'+accounts+'</section>';
}
async function deleteTrip(tripId,expectedName){
 if(!id||tripId!==id||!user()?.emailVerified||!cloud()?.isVerifiedOwner?.())throw Error('Only verified Main Admin can delete a shared trip.');
 if(!latest||!Number.isInteger(latest.revision))throw Error('Wait for the shared trip to finish loading.');
 const expectedRevision=latest.revision,originalUid=user().uid,token=generation;
 const r=ref(id);
 const current=await getDocFromServer(r);
 if(!current.exists()||current.data().trip?.id!==id||current.data().trip?.name!==expectedName)throw Error('Trip changed; reopen it before deleting.');
 if(current.data().revision!==expectedRevision)throw Error('A trip update was detected. Refresh and confirm again.');
 const grants=await getDocsFromServer(collection(r,'access'));
 const uidGrants=await getDocsFromServer(collection(r,'accessUid'));
 const joinRequests=await getDocsFromServer(collection(r,'joinRequests'));
 if(grants.size+uidGrants.size+joinRequests.size>450)throw Error('Too many grants or requests to delete safely. Contact support.');
 await runTransaction(cloud().cloudDb,async tx=>{
   if(token!==generation||user()?.uid!==originalUid||!cloud()?.isVerifiedOwner?.())throw Error('Owner account changed; deletion cancelled.');
   const snapshot=await tx.get(r);
   if(!snapshot.exists()||snapshot.data().revision!==expectedRevision||snapshot.data().trip?.name!==expectedName)throw Error('Trip was edited after confirmation. Reload before deleting.');
   for(const access of [...grants.docs,...uidGrants.docs,...joinRequests.docs])tx.delete(access.ref);
   tx.delete(r);
 });
 if(token===generation){clear();location.assign(new URL('./',location.href).href);}
 return true;
}
function library(){
 if(id)return window.D4TripJoin?.guestPanel?.()||'<section class="card">Loading join request…</section>';
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
 if(action==='revoke-email'){
  if(!canRemove())throw Error('Only Main Admin can remove a joined user');
  const email=event.target.closest('[data-team]')?.dataset.email;
  if(!invited.some(g=>g.email===email))throw Error('User already removed or list is out of date');
  if(confirm('Remove '+email+' from this shared trip? Existing payments and expenses will be preserved.')){
    await deleteDoc(grant(id,email));say('Access removed by Main Admin');
  }
  return;
 }
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
 if(action==='revoke'){
  if(!canRemove())throw Error('Only Main Admin can remove a joined user');
  if(confirm('Remove trip access for '+email+'? Historical payments and expenses will remain saved.')){
    await deleteDoc(r);say('Access removed by Main Admin');
  }
  return;
 }
 if(action==='admin'&&role!=='owner')return;
 await setDoc(r,{role:action==='admin'?'admin':'member'});say('Access saved. Copy the trip link to share it.');
 }catch(e){say('Team access: '+e.message)}
});
window.D4Team={save,controls,canEdit,canRemove,hasAccess:()=>!!role,inviteMember,library,deleteTrip};
window.addEventListener('d4-auth',connect);
if(cloud()?.ready)connect();
