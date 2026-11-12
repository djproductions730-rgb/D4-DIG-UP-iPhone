/* D4 Trip: Spark-compatible, approval-only join by link and display name.
 * No Cloud Functions required. All authorization is enforced in firestore.rules.
 * The team trip document is NEVER fetched before the user has a grant.
 */
import {signInAnonymously} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {collection,doc,onSnapshot,runTransaction,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const teamId=window.D4TripLocal?.teamId;
const cloud=()=>window.D4TripCloud;
const authUser=()=>cloud()?.auth?.currentUser;
const db=()=>cloud()?.cloudDb;
const tripRef=()=>doc(db(),'teamTrips',teamId);
const requestsRef=()=>collection(tripRef(),'joinRequests');
const ownRequestRef=uid=>doc(requestsRef(),uid);
const uidGrantRef=uid=>doc(tripRef(),'accessUid',uid);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const toast=s=>window.D4TripLocal?.toast?.(s);
const rerender=()=>window.D4TripLocal?.render?.();
const editor=()=>window.D4Team?.canEdit?.()===true;
const owner=()=>window.D4Team?.canRemove?.()===true;
let ownRequest=null,requests=[],members=[],stops=[],accountUid='',adminWatching=false,busy=false,seenDecisions=null,seenPending=null;
const formatError=e=>String(e?.message||e||'Try again').slice(0,240);
const pendingNameKey='d4_trip_join_name_v1_'+teamId;
let sendingAuto=false;
async function sendSavedJoinRequest(){
 if(!teamId||sendingAuto||!cloud()?.ready||!db()||!cloud()?.auth)return;
 let name;
 try{name=sessionStorage.getItem(pendingNameKey)}catch(_){return;}
 if(!name)return;
 if(ownRequest?.status==='pending'||ownRequest?.status==='approved'){
   try{sessionStorage.removeItem(pendingNameKey)}catch(_){}
   return;
 }
 sendingAuto=true;
 try{
   await requestJoin(name);
   try{sessionStorage.removeItem(pendingNameKey)}catch(_){}
 }catch(err){
   toast('Could not send join request: '+formatError(err));
   // Leave the name queued so the guest can use the visible request form.
 }finally{
   sendingAuto=false;
   rerender();
 }
}

function stop(){
 for(const stop of stops)stop();
 stops=[];ownRequest=null;requests=[];members=[];accountUid='';adminWatching=false;seenDecisions=null;seenPending=null;
}
function watchUser(){
 const u=authUser();
 if(!teamId||!db()||!u){stop();rerender();return;}
 if(accountUid===u.uid)return;
 stop();accountUid=u.uid;
 const watchUid=u.uid;
 stops.push(onSnapshot(ownRequestRef(u.uid),s=>{
   if(authUser()?.uid!==watchUid)return;
   ownRequest=s.exists()?s.data():null;rerender();
   void sendSavedJoinRequest();
 },e=>toast('Join request: '+formatError(e))));
 accessChanged();
}
function accessChanged(){
 const u=authUser();
 if(!teamId||!u||!db())return;
 if(accountUid!==u.uid){watchUser();return;}
 if(!editor()||adminWatching)return;
 adminWatching=true;
 stops.push(onSnapshot(requestsRef(),snap=>{
   if(authUser()?.uid!==accountUid)return;
   const next=snap.docs.map(d=>({...d.data(),uid:d.id}));
   if(seenPending){
     for(const rq of next){
       const old=seenPending.get(rq.uid),fresh=rq.createdAt?.seconds||0;
       if(rq.status==='pending'&&old&&fresh>old)toast('🔔 '+rq.name+' resent a join request');
     }
   }
   seenPending=new Map(next.filter(r=>r.status==='pending').map(r=>[r.uid,r.createdAt?.seconds||0]));
   if(owner()&&seenDecisions){
     for(const change of next){
       if(change.status==='pending'||change.decidedByUid===authUser()?.uid)continue;
       if(seenDecisions.get(change.uid)==='pending'){
         toast('🔔 Trip Admin '+(change.decidedByEmail||'')+' '+(change.status==='approved'?'approved ':'rejected ')+change.name);
       }
     }
   }
   seenDecisions=new Map(next.map(r=>[r.uid,r.status]));
   requests=next;
   requests.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
   rerender();
 },e=>{adminWatching=false;toast('Join notifications unavailable: '+formatError(e));}));
 if(owner()){
   stops.push(onSnapshot(collection(tripRef(),'accessUid'),snap=>{
     if(authUser()?.uid!==accountUid)return;
     members=snap.docs.map(d=>({uid:d.id,...d.data()}));rerender();
   },e=>toast('Joined users unavailable: '+formatError(e))));
 }
}
function readSavedName(){
 try{return sessionStorage.getItem(pendingNameKey)||''}catch(_){return ''}
}
function guestPanel(){
 if(!teamId)return '';
 if(window.D4Team?.hasAccess?.())return '';
 const u=authUser();
 const status=ownRequest?.status||'';
 let message='<p>Enter your name to request access. Main Admin or Trip Admin must approve you first.</p>';
 if(status==='pending')message='<div class="notice" role="status">⏳ Your join request is pending. An admin will review it.</div>';
 if(status==='approved')message='<div class="notice" role="status">✅ Approved. Opening your trip… If access was removed, contact Main Admin.</div>';
 if(status==='rejected')message='<div class="notice" role="status">❌ Request declined. Contact your trip admin for help.</div>';
 const form=status==='approved'?'':`<form id="d4-join-request" style="display:grid;gap:12px">
   <label for="d4-join-name">Your name</label>
   <input id="d4-join-name" class="input" name="name" type="text" minlength="2" maxlength="50" autocomplete="name" required value="${safe(ownRequest?.name||readSavedName())}" placeholder="Enter your name">
   <button class="btn mint" type="submit" ${busy?'disabled':''} style="min-height:48px">${busy?'Sending request…':status==='pending'?'↻ Resend Join Request':status==='rejected'?'↻ Request Again':'Request to Join'}</button>
 </form>`;
 return `<section class="card" id="d4-link-join" style="margin-bottom:16px"><h3>🔗 Join this Trip</h3>${message}${form}
 <p class="tiny">Join requests use a private Firebase account ID. You cannot view payments, members or trip details until approved.</p>
 ${!u?'<p class="tiny">A free guest sign-in is created automatically when you send a request.</p>':''}</section>`;
}

/* Main Admin's normal app URL has no ?team= parameter. Subscribe to requests
 * for the trips already visible in Main Admin's local trip library. This is
 * independent of the team-specific listener used on shared links. */
const mainInbox=new Map();
const mainInboxStops=new Map();
const mainGrants=new Map();
const mainGrantStops=new Map();
let mainInboxUid='',mainInboxCatalogStop=null,mainInboxCatalog=new Map();
function clearMainInbox(){
 for(const unsubscribe of mainInboxStops.values())unsubscribe();
 for(const unsubscribe of mainGrantStops.values())unsubscribe();
 mainGrantStops.clear();mainGrants.clear();
 mainInboxStops.clear();mainInbox.clear();mainInboxUid='';
 if(mainInboxCatalogStop)mainInboxCatalogStop();mainInboxCatalogStop=null;mainInboxCatalog.clear();
}
function isBaseMainAdmin(){
 return !teamId && cloud()?.ready && !!db() &&
   cloud()?.isVerifiedOwner?.()===true && !!authUser()?.emailVerified;
}
function watchMainInbox(){
 if(!isBaseMainAdmin()){if(mainInboxUid)clearMainInbox();return;}
 const uid=authUser()?.uid;
 if(mainInboxUid!==uid){clearMainInbox();mainInboxUid=uid;}
 const trips=window.D4TripLocal?.getData?.()?.trips||[];
 const byId=new Map();
 for(const t of [...trips,...mainInboxCatalog.values()]){
  if(t&&typeof t.id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(t.id))byId.set(t.id,t);
 }
 const valid=[...byId.values()].slice(0,100);
 const allowed=new Set(valid.map(t=>t.id));
 for(const [trip,unsubscribe] of mainInboxStops){
  if(!allowed.has(trip)){unsubscribe();mainInboxStops.delete(trip);mainInbox.delete(trip);}
 }
 for(const [trip,unsubscribe] of mainGrantStops){
  if(!allowed.has(trip)){unsubscribe();mainGrantStops.delete(trip);mainGrants.delete(trip);}
 }
 for(const trip of valid){
  if(mainInboxStops.has(trip.id))continue;
  const tripId=trip.id;
  let initialized=false;
  const unsubscribe=onSnapshot(collection(doc(db(),'teamTrips',tripId),'joinRequests'),snap=>{
   if(!isBaseMainAdmin()||authUser()?.uid!==uid)return;
   const previous=mainInbox.get(tripId)||[];
   const current=snap.docs.map(d=>({...d.data(),uid:d.id,tripId,tripName:trip.name}));
   const pending=current.filter(x=>x.status==='pending');
   const previousTimes=new Map(previous.filter(x=>x.status==='pending').map(x=>[x.uid,x.createdAt?.seconds||0]));
   const newlyPending=pending.filter(x=>!previousTimes.has(x.uid)||
     (x.createdAt?.seconds||0)>previousTimes.get(x.uid));
   if(initialized&&newlyPending.length){
    toast('🔔 '+newlyPending.length+' new join request'+(newlyPending.length>1?'s':'')+
     ' for '+trip.name);
   }else if(!initialized&&pending.length){
    toast('🔔 '+pending.length+' pending join request'+(pending.length>1?'s':'')+
     ' for '+trip.name);
   }
   initialized=true;
   mainInbox.set(tripId,current);
   rerender();
  },error=>{
   if(!isBaseMainAdmin())return;
   // A private trip not yet published does not have a shared inbox.
   const message=formatError(error);
   if(!/permission|not.found/i.test(message))toast('Join inbox: '+message);
  });
  mainInboxStops.set(tripId,unsubscribe);
  mainGrantStops.set(tripId,onSnapshot(collection(doc(db(),'teamTrips',tripId),'accessUid'),snap=>{
    if(!isBaseMainAdmin()||authUser()?.uid!==uid)return;
    mainGrants.set(tripId,new Map(snap.docs.map(d=>[d.id,{uid:d.id,...d.data()}])));
    rerender();
  },e=>{
    if(!/permission|not.found/i.test(formatError(e)))toast('Approved members: '+formatError(e));
  }));
 }
 if(!mainInboxCatalogStop){
  // Main Admin can also discover shared trips missing from this device's
  // local backup; Firestore rules restrict listing to this verified UID.
  mainInboxCatalogStop=onSnapshot(collection(db(),'teamTrips'),snap=>{
   if(!isBaseMainAdmin()||authUser()?.uid!==uid)return;
   mainInboxCatalog=new Map(snap.docs.map(d=>[d.id,{
    id:d.id,name:String(d.data()?.trip?.name||'Trip')
   }]));
   watchMainInbox();
  },e=>toast('Cannot monitor all shared trips: '+formatError(e)));
 }
}

function isMainOwnerOfTrip(){
 return isBaseMainAdmin() || !!teamId&&owner();
}
function approvedRosterRows(tripFilter=''){
 if(!isMainOwnerOfTrip())return [];
 if(isBaseMainAdmin())watchMainInbox();
 const all=isBaseMainAdmin()
  ?[...mainInbox.values()].flat()
  :requests.map(r=>({...r,tripId:teamId,tripName:window.D4TripLocal?.currentTrip?.()?.name||'Trip'}));
 return all.filter(r=>r.status==='approved'&&(!tripFilter||r.tripId===tripFilter))
  .map(r=>{
    const grants=isBaseMainAdmin()?mainGrants.get(r.tripId):null;
    const fromGuest=members.find(g=>g.uid===r.uid);
    const grant=grants?.get(r.uid)||fromGuest;
    // Do not include revoked users once the active grant snapshot has arrived.
    if(grants&&!grant)return null;
    return {...r,joinedName:r.joinedName||grant?.name||r.name,role:grant?.role||'member'};
  }).filter(Boolean).sort((a,b)=>String(a.joinedName).localeCompare(String(b.joinedName)));
}
function approvedMembersPanel(tripFilter=''){
 if(!isMainOwnerOfTrip())return '';
 const rows=approvedRosterRows(tripFilter);
 const cards=rows.map(r=>'<div class="d4-home-request-item d4-approved-member">'+
  '<div><strong>👤 '+safe(r.joinedName)+'</strong><small>'+safe(r.tripName||'Trip')+
  ' · '+(r.role==='admin'?'🛡️ Trip Admin':'✅ Approved Member')+'</small></div>'+
  '<div class="d4-home-request-actions">'+
  '<button type="button" class="btn small '+(r.role==='admin'?'ghost':'mint')+
  '" data-join-role="'+(r.role==='admin'?'member':'admin')+'" data-trip-id="'+safe(r.tripId)+
  '" data-uid="'+safe(r.uid)+'">'+(r.role==='admin'?'↘ Remove Admin':'🛡️ Make Admin')+'</button></div></div>').join('');
 return '<section class="card d4-home-join-requests d4-approved-members-panel" aria-label="Approved link members">'+
  '<div class="space-between"><h3>👥 Approved Members</h3><span class="pill">'+rows.length+'</span></div>'+
  '<p class="tiny">Approved link members are saved in Firebase. Only Main Admin can change their admin access.</p>'+
  (cards||'<p class="tiny">No approved link members yet.</p>')+'</section>';
}
async function changeUidRole(uid,role,tripId){
 if(!isMainOwnerOfTrip()||!cloud()?.isVerifiedOwner?.()||!authUser()?.emailVerified)
  throw Error('Only verified Main Admin can change roles.');
 if(!['member','admin'].includes(role)||!/^[A-Za-z0-9_-]{1,128}$/.test(uid)
   ||!/^[A-Za-z0-9_-]{1,100}$/.test(tripId))throw Error('Invalid member or role.');
 await runTransaction(db(),async tx=>{
  if(!cloud()?.isVerifiedOwner?.()||!authUser()?.emailVerified)
   throw Error('Main Admin account changed.');
  const tr=doc(db(),'teamTrips',tripId),grantRef=doc(tr,'accessUid',uid);
  const [tripSnap,grantSnap]=await Promise.all([tx.get(tr),tx.get(grantRef)]);
  if(!tripSnap.exists()||!grantSnap.exists())throw Error('Member not found in the shared trip.');
  const grant=grantSnap.data(),trip=structuredClone(tripSnap.data().trip);
  const name=grant.name;
  if(!trip.members.includes(name))throw Error('Member is not in the current trip roster.');
  const admins=new Set(trip.admins||[]);
  if(role==='admin')admins.add(name);else admins.delete(name);
  trip.admins=[...admins];
  tx.update(tr,{trip,revision:tripSnap.data().revision+1,updatedBy:authUser().uid,updatedAt:serverTimestamp()});
  tx.update(grantRef,{role});
 });
 toast(role==='admin'?'🛡️ Member promoted to Trip Admin':'Member changed back to regular access');
}
function mainAdminInbox(){
 if(!isBaseMainAdmin())return '';
 watchMainInbox();
 const all=[...mainInbox.values()].flat().sort((a,b)=>
  (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
 const pending=all.filter(r=>r.status==='pending');
 const cards=pending.map(r=>'<div class="d4-home-request-item">'+
  '<div><strong>'+safe(r.name)+'</strong><small>'+safe(r.tripName)+
  ' · Awaiting approval</small></div>'+
  '<div class="d4-home-request-actions">'+
  '<button type="button" class="btn small mint" data-join-decision="approved" data-trip-id="'+safe(r.tripId)+
  '" data-uid="'+safe(r.uid)+'">✓ Accept</button>'+
  '<button type="button" class="btn small ghost" data-join-decision="rejected" data-trip-id="'+safe(r.tripId)+
  '" data-uid="'+safe(r.uid)+'">✕ Reject</button></div></div>').join('');
 const history=all.filter(r=>r.status!=='pending').slice(0,5).map(r=>
  '<p class="tiny">'+(r.status==='approved'?'✅ Approved':'❌ Rejected')+
  ': '+safe(r.name)+' · '+safe(r.tripName)+'</p>').join('');
 return '<section class="card d4-home-join-requests d4-main-admin-inbox" aria-label="Main Admin pending join requests">'+
  '<div class="space-between"><h3>🔔 Join Requests</h3><span class="pill">'+pending.length+' Pending</span></div>'+
  '<p class="tiny">Live requests for your shared trips. Accept or reject directly here.</p>'+
  (cards||'<p class="tiny">No pending requests for your trips.</p>')+
  (history?'<h4>Recent decisions</h4>'+history:'')+'</section>'+approvedMembersPanel();
}
function mainAdminBanner(){
 if(!isBaseMainAdmin())return '';
 const pending=[...mainInbox.values()].flat().filter(r=>r.status==='pending').length;
 return pending?'<div class="d4-main-join-banner" role="status">🔔 '+pending+
  ' pending join request'+(pending>1?'s':'')+' — review in Main Admin Home</div>':'';
}
function homeRequests(){
 if(!teamId||!editor())return '';
 const pending=requests.filter(r=>r.status==='pending');
 const cards=pending.map(r=>'<div class="d4-home-request-item">'+
  '<div><strong>'+safe(r.name)+'</strong><small>Requested to join · Pending approval</small></div>'+
  '<div class="d4-home-request-actions"><button type="button" class="btn small mint" data-join-decision="approved" data-uid="'+safe(r.uid)+'">✓ Accept</button>'+
  '<button type="button" class="btn small ghost" data-join-decision="rejected" data-uid="'+safe(r.uid)+'">✕ Reject</button></div>'+
  '</div>').join('');
 return '<section class="card d4-home-join-requests" aria-label="Home pending join requests">'+
  '<div class="space-between"><h3>🔔 Join Requests</h3><span class="pill">'+pending.length+' Pending</span></div>'+
  '<p class="tiny">Main Admin and Trip Admin can approve or reject directly from Home.</p>'+
  (cards||'<p class="tiny">No pending join requests.</p>')+'</section>';
}
function adminPanel(){
 if(!teamId||!editor())return '';
 const pending=requests.filter(r=>r.status==='pending');
 const recent=requests.filter(r=>r.status!=='pending').slice(0,12);
 const cards=pending.map(r=>`<div class="list-row" style="display:grid;gap:10px;margin-top:9px">
 <div><strong>${safe(r.name)}</strong><small>Requested to join · Awaiting approval</small></div>
 <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn small mint" data-join-decision="approved" data-uid="${safe(r.uid)}" style="min-height:44px">✓ Accept</button>
 <button type="button" class="btn small ghost" data-join-decision="rejected" data-uid="${safe(r.uid)}" style="min-height:44px">✕ Reject</button></div></div>`).join('');
 const activity=owner()?'<h4 style="margin-top:15px">Main Admin · Approval history</h4>'+
   (recent.map(r=>`<p class="tiny" style="overflow-wrap:anywhere">${r.status==='approved'?'✅ Approved':'❌ Rejected'}: <b>${safe(r.name)}</b> · by ${safe(r.decidedByEmail||r.decidedByUid||'Admin')}</p>`).join('')||'<p class="tiny">No approval activity yet.</p>'):'';
 const roster=owner()?'<h4 style="margin-top:15px">Joined link members</h4>'+
   (members.map(g=>`<div class="list-row" style="display:flex;gap:10px;justify-content:space-between;align-items:center"><div><b>${safe(g.name)}</b><small>${g.role==='admin'?'Trip Admin':'Approved Member'}</small></div><div class="row" style="flex-wrap:wrap;gap:8px"><button type="button" class="btn small mint" data-join-role="${g.role==='admin'?'member':'admin'}" data-trip-id="${safe(teamId)}" data-uid="${safe(g.uid)}" style="min-height:44px">${g.role==='admin'?'Remove Admin':'Make Admin'}</button><button type="button" class="btn small negative" data-join-remove="${safe(g.uid)}" style="min-height:44px">Remove Access</button></div></div>`).join('')||'<p class="tiny">No link-joined members.</p>'):'';
 return `<section class="card" style="margin:12px 0 16px"><div class="space-between"><h3>🔔 Join Requests</h3><span class="pill">${pending.length} Pending</span></div>
 <p class="tiny">Main Admin and Trip Admin may accept or reject. Main Admin can see every decision.</p>
 ${cards||'<p class="tiny">No pending requests.</p>'}${activity}${roster}</section>`;
}
function notificationBanner(){
 if(!editor())return '';
 const pending=requests.filter(r=>r.status==='pending').length;
 const lastAdminDecision=owner()?requests.find(r=>r.status!=='pending'&&r.decidedByUid!==authUser()?.uid):null;
 if(!pending&&!lastAdminDecision)return '';
 const latest=lastAdminDecision
  ?safe(lastAdminDecision.name)+' '+(lastAdminDecision.status==='approved'?'approved':'rejected')+' by '+safe(lastAdminDecision.decidedByEmail||'Trip Admin')
  :'';
 return `<div class="card" style="margin:10px 0;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
 <b>🔔 ${pending?pending+' join request'+(pending>1?'s':'')+' waiting':latest}</b>
 <button type="button" class="btn small mint" data-action="open-tab" data-ctx="members" style="min-height:44px">${pending?'Review requests':'View approval history'}</button></div>`;
}
async function requestJoin(name){
 name=String(name||'').trim().replace(/\s+/g,' ');
 if(name.length<2||name.length>50)throw Error('Enter your name (2–50 characters)');
 if(ownRequest?.status==='approved')throw Error('Already approved. Contact Main Admin if access is unavailable.');
 if(!teamId||!/^[A-Za-z0-9_-]{1,100}$/.test(teamId))throw Error('Invalid Trip Link');
 if(!cloud()?.ready||!db()||!cloud()?.auth)throw Error('Firebase is still starting. Try again.');
 let u=authUser();
 if(!u){const result=await signInAnonymously(cloud().auth);u=result.user;}
 if(!u)throw Error('Sign-in unavailable. Enable Anonymous sign-in in Firebase Authentication.');
 await setDoc(ownRequestRef(u.uid),{uid:u.uid,name,status:'pending',createdAt:serverTimestamp()});
 toast(ownRequest?.status==='pending'?'Join request resent to Main Admin and Trip Admin.':'Join request sent. Await Main Admin or Trip Admin approval.');
}
async function decide(uid,status,tripForApproval=teamId){
 if(!(editor()||isBaseMainAdmin())||!['approved','rejected'].includes(status))throw Error('Only an authorized Trip Admin can decide.');
 if(!tripForApproval||!/^[A-Za-z0-9_-]{1,100}$/.test(tripForApproval))throw Error('Select a valid shared trip');
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw Error('Invalid request');
 const actor=authUser(),actorUid=actor?.uid;
 await runTransaction(db(),async tx=>{
   const tr=doc(db(),'teamTrips',tripForApproval),rq=doc(tr,'joinRequests',uid),gr=doc(tr,'accessUid',uid);
   const requestSnap=await tx.get(rq);
   if(!requestSnap.exists()||requestSnap.data().status!=='pending')throw Error('Request already handled.');
   const requested=requestSnap.data(),name=String(requested.name||'');
   const tripSnap=await tx.get(tr);
   if(!tripSnap.exists())throw Error('Shared trip unavailable');
   if(status==='approved'){
     const oldGrant=await tx.get(gr);
     if(oldGrant.exists())throw Error('This person already has access');
     const next=structuredClone(tripSnap.data().trip);
     let joinedName=name,n=2;
     while(next.members.includes(joinedName))joinedName=name+' ('+(n++)+')';
     if(joinedName.length>70)throw Error('Name is too long to add to the roster.');
     if(next.members.length>=100)throw Error('Trip member limit reached.');
     next.members.push(joinedName);
     tx.update(tr,{trip:next,revision:tripSnap.data().revision+1,updatedBy:actorUid,updatedAt:serverTimestamp()});
     tx.set(gr,{role:'member',name:joinedName,grantedByUid:actorUid,grantedAt:serverTimestamp()});
     tx.update(rq,{status,joinedName,decidedByUid:actorUid,decidedByEmail:actor.email||'',decidedAt:serverTimestamp()});
   }else{
     tx.update(rq,{status,joinedName:'',decidedByUid:actorUid,decidedByEmail:actor.email||'',decidedAt:serverTimestamp()});
   }
 });
 toast(status==='approved'?'Member approved and added to trip':'Join request rejected');
}
async function removeAccess(uid){
 if(!owner())throw Error('Only Main Admin can remove access');
 const original=members.find(x=>x.uid===uid);
 if(!original||!confirm('Remove trip access for '+original.name+'? Existing expenses and payments will remain saved.'))return;
 const {deleteDoc}=await import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js');
 await deleteDoc(uidGrantRef(uid));
 toast('Access removed. Existing payment history was preserved.');
}
document.addEventListener('submit',async event=>{
 if(event.target?.id!=='d4-join-request')return;
 event.preventDefault();
 if(busy)return;busy=true;
 const name=new FormData(event.target).get('name');
 try{await requestJoin(name)}catch(e){toast('Could not request access: '+formatError(e))}
 finally{busy=false;rerender()}
});
document.addEventListener('click',async event=>{
 const decision=event.target.closest('[data-join-decision]');
 const remove=event.target.closest('[data-join-remove]');
 const roleChange=event.target.closest('[data-join-role]');
 if(!decision&&!remove&&!roleChange)return;
 event.preventDefault();
 if(busy)return;busy=true;
 try{
   if(decision)await decide(decision.dataset.uid,decision.dataset.joinDecision,decision.dataset.tripId||teamId);
   else if(roleChange)await changeUidRole(roleChange.dataset.uid,roleChange.dataset.joinRole,roleChange.dataset.tripId||teamId);
   else await removeAccess(remove.dataset.joinRemove);
 }catch(e){toast('Join approval: '+formatError(e))}
 finally{busy=false;rerender();}
});
window.D4TripJoin={guestPanel,adminPanel,homeRequests,mainAdminInbox,mainAdminBanner,approvedMembersPanel,notificationBanner,accessChanged,pendingCount:()=>requests.filter(r=>r.status==='pending').length};
window.addEventListener('d4-auth',()=>{watchUser();watchMainInbox();if(!authUser())void sendSavedJoinRequest()});
if(cloud()?.ready){watchUser();if(!authUser())void sendSavedJoinRequest()}
