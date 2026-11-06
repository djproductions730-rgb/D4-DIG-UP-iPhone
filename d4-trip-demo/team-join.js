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
   <input id="d4-join-name" class="input" name="name" type="text" minlength="2" maxlength="50" autocomplete="name" required value="${safe(ownRequest?.name||'')}" placeholder="Enter your name">
   <button class="btn mint" type="submit" ${busy?'disabled':''} style="min-height:48px">${busy?'Sending request…':status==='pending'?'↻ Resend Join Request':status==='rejected'?'↻ Request Again':'Request to Join'}</button>
 </form>`;
 return `<section class="card" id="d4-link-join" style="margin-bottom:16px"><h3>🔗 Join this Trip</h3>${message}${form}
 <p class="tiny">Join requests use a private Firebase account ID. You cannot view payments, members or trip details until approved.</p>
 ${!u?'<p class="tiny">A free guest sign-in is created automatically when you send a request.</p>':''}</section>`;
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
   (members.map(g=>`<div class="list-row" style="display:flex;gap:10px;justify-content:space-between;align-items:center"><div><b>${safe(g.name)}</b><small>Approved member</small></div><button type="button" class="btn small negative" data-join-remove="${safe(g.uid)}" style="min-height:44px">Remove Access</button></div>`).join('')||'<p class="tiny">No link-joined members.</p>'):'';
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
async function decide(uid,status){
 if(!editor()||!['approved','rejected'].includes(status))throw Error('Only an authorized Trip Admin can decide.');
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw Error('Invalid request');
 const actor=authUser(),actorUid=actor?.uid;
 await runTransaction(db(),async tx=>{
   const rq=ownRequestRef(uid),tr=tripRef(),gr=uidGrantRef(uid);
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
 if(!decision&&!remove)return;
 event.preventDefault();
 if(busy)return;busy=true;
 try{
   if(decision)await decide(decision.dataset.uid,decision.dataset.joinDecision);
   else await removeAccess(remove.dataset.joinRemove);
 }catch(e){toast('Join approval: '+formatError(e))}
 finally{busy=false;rerender();}
});
window.D4TripJoin={guestPanel,adminPanel,notificationBanner,accessChanged,pendingCount:()=>requests.filter(r=>r.status==='pending').length};
window.addEventListener('d4-auth',watchUser);
if(cloud()?.ready)watchUser();
