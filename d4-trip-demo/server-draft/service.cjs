'use strict';
// D4 Trip trusted backend DRAFT. Not deployed and not used by the existing PWA.
// Uses a Firestore Admin SDK database. Security is enforced here, never by UI names.
// Production requires reviewed Cloud Functions deployment and monitoring.
const {randomBytes,createHash}=require('node:crypto');
const ROLES=new Set(['owner','admin','member']);
const METHODS=new Set(['UPI','Cash','Bank transfer','Card','Manual']);
const STAGES=new Set(['advance','balance','full']);

function checkedAuth(auth){
  if(!auth?.uid || auth.token?.email_verified !== true)
    throw Error('Verified Firebase sign-in required');
  return auth.uid;
}
function checkedName(value,label='Name'){
  const name=String(value??'').trim();
  if(name.length<2 || name.length>70 || /[\u0000-\u001f\u007f]/.test(name))
    throw Error(label+' must contain 2–70 printable characters');
  return name;
}
function checkedId(value,label='ID'){
  if(typeof value!=='string'||!(/^[a-zA-Z0-9_-]{5,128}$/).test(value))
    throw Error('Invalid '+label);
  return value;
}
function toCents(value,label='Amount'){
  // Reject floats with a fractional paise rather than silently rounding money.
  const raw=typeof value==='number'?String(value):String(value??'').trim();
  if(!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(raw))
    throw Error('Invalid '+label+' (2 decimal places maximum)');
  const [units,parts='']=raw.split('.');
  const amount=Number(units)*100+Number(parts.padEnd(2,'0'));
  if(!Number.isSafeInteger(amount)||amount<0)throw Error('Invalid '+label);
  return amount;
}
function hashCode(value){return createHash('sha256').update(value).digest('hex');}
function audit(tx,tripRef,by,type,fields={},now){
  const ref=tripRef.collection('audit').doc();
  tx.create(ref,{byUid:by,type,fields,createdAt:now()});
}
function makeService(db,options={}){
  const rootOwner=options.mainOwnerUid;
  if(!rootOwner||typeof rootOwner!=='string')
    throw Error('Trusted D4_TRIP_MAIN_OWNER_UID server setting required');
  const now=options.now||(()=>new Date());
  const newInvite=options.newInvite||(()=>randomBytes(24).toString('base64url'));
  const trips=db.collection('trips');
  const invites=db.collection('tripInvites');

  function tripRef(id){return trips.doc(checkedId(id,'trip id'));}
  function memberRef(t,uid){return t.collection('members').doc(checkedId(uid,'member UID'));}
  async function verifiedRole(tx,t,uid,accepted){
    const trip=await tx.get(t);
    if(!trip.exists)throw Error('Trip not found');
    const record=await tx.get(memberRef(t,uid));
    const r=record.exists?record.data():null;
    if(!r||r.status!=='active'||!ROLES.has(r.role)||
        (r.role==='owner'&&trip.data().ownerUid!==uid)||
        !accepted.includes(r.role))
      throw Error('Trip access denied');
    return {trip:trip.data(),member:r};
  }

  async function createTrip({auth,name,destination='',targetAmount='0'}){
    const uid=checkedAuth(auth);
    if(uid!==rootOwner)throw Error('Main Admin only');
    name=checkedName(name,'Trip name');
    const destinationName=String(destination).trim().slice(0,100);
    const targetCents=toCents(targetAmount,'Trip target');
    const t=trips.doc();
    const batch=db.batch();
    batch.create(t,{name,destination:destinationName,ownerUid:uid,targetCents,
      createdAt:now(),updatedAt:now()});
    batch.create(memberRef(t,uid),{
      displayName:'Main Admin',role:'owner',status:'active',paidCents:0,createdAt:now()});
    batch.create(t.collection('rooms').doc('group'),{type:'group',createdAt:now()});
    batch.create(t.collection('rooms').doc('admins'),{type:'admins',createdAt:now()});
    batch.create(t.collection('audit').doc(),{
      byUid:uid,type:'trip.created',fields:{name},createdAt:now()});
    await batch.commit();
    return {tripId:t.id};
  }

  async function issueInvite({auth,tripId,expiresMinutes=60}){
    const uid=checkedAuth(auth),t=tripRef(tripId);
    if(!Number.isInteger(expiresMinutes)||expiresMinutes<5||expiresMinutes>1440)
      throw Error('Invite expiry must be 5–1440 minutes');
    const code=newInvite();
    if(!/^[a-zA-Z0-9_-]{24,128}$/.test(code))throw Error('Invalid generated invite');
    const hash=hashCode(code),r=invites.doc(hash);
    await db.runTransaction(async tx=>{
      await verifiedRole(tx,t,uid,['owner','admin']);
      tx.create(r,{tripId:t.id,issuedBy:uid,issuedAt:now(),
        expiresAtMs:now().getTime()+expiresMinutes*60000,usedBy:null});
      audit(tx,t,uid,'invite.issued',{hash},now);
    });
    return {code,expiresMinutes}; // shown ONCE. Only hash stored server side.
  }

  async function redeemInvite({auth,code,displayName}){
    const uid=checkedAuth(auth);
    const name=checkedName(displayName,'Member name');
    if(typeof code!=='string'||!/^[a-zA-Z0-9_-]{24,128}$/.test(code))
      throw Error('Invalid invite code');
    const invitation=invites.doc(hashCode(code));
    return db.runTransaction(async tx=>{
      const snap=await tx.get(invitation);
      if(!snap.exists)throw Error('Invite invalid or expired');
      const inv=snap.data();
      if(inv.usedBy || !Number.isFinite(inv.expiresAtMs) || inv.expiresAtMs<=now().getTime())
        throw Error('Invite already used or expired');
      const t=tripRef(inv.tripId),m=memberRef(t,uid);
      const trip=await tx.get(t);
      if(!trip.exists)throw Error('Trip not found');
      const existing=await tx.get(m);
      if(existing.exists)throw Error('Existing membership requires admin review');
      tx.create(m,{displayName:name,role:'member',status:'active',
        paidCents:0,createdAt:now()});
      tx.update(invitation,{usedBy:uid,usedAt:now()});
      audit(tx,t,uid,'member.joined',{memberUid:uid},now);
      return {tripId:t.id,role:'member'};
    });
  }

  async function changeRole({auth,tripId,memberUid,role}){
    const uid=checkedAuth(auth),t=tripRef(tripId);
    memberUid=checkedId(memberUid,'member UID');
    if(!['admin','member'].includes(role))throw Error('Unsupported role');
    return db.runTransaction(async tx=>{
      await verifiedRole(tx,t,uid,['owner']);
      const target=memberRef(t,memberUid),s=await tx.get(target);
      if(!s.exists||s.data().status!=='active'||s.data().role==='owner')
        throw Error('Invalid active member');
      tx.update(target,{role,updatedAt:now()});
      audit(tx,t,uid,'member.role.changed',{memberUid,role},now);
      return {memberUid,role};
    });
  }

  async function revokeMember({auth,tripId,memberUid}){
    const uid=checkedAuth(auth),t=tripRef(tripId);
    memberUid=checkedId(memberUid,'member UID');
    return db.runTransaction(async tx=>{
      const actor=await verifiedRole(tx,t,uid,['owner','admin']);
      const target=memberRef(t,memberUid),s=await tx.get(target);
      if(!s.exists||s.data().status!=='active'||s.data().role==='owner'||
         (actor.member.role==='admin'&&s.data().role!=='member'))
        throw Error('Cannot revoke this user');
      tx.update(target,{status:'revoked',revokedAt:now(),revokedBy:uid});
      audit(tx,t,uid,'member.revoked',{memberUid},now);
      // No financial history or receipt is deleted.
      return {memberUid,status:'revoked'};
    });
  }

  async function recordPayment({auth,tripId,memberUid,amount,stage='advance',method='Manual',note=''}){
    const uid=checkedAuth(auth),t=tripRef(tripId);
    memberUid=checkedId(memberUid,'member UID');
    const cents=toCents(amount,'Payment amount');
    if(cents===0)throw Error('Payment must be positive');
    if(!STAGES.has(stage)||!METHODS.has(method))throw Error('Invalid payment category');
    const comment=String(note??'').trim();
    if(comment.length>140)throw Error('Payment note too long');
    return db.runTransaction(async tx=>{
      const actor=await verifiedRole(tx,t,uid,['owner','admin']);
      const member=memberRef(t,memberUid),snap=await tx.get(member);
      if(!snap.exists||snap.data().status!=='active')throw Error('Member inactive');
      const previous=snap.data().paidCents||0;
      const target=actor.trip.targetCents;
      if(!Number.isSafeInteger(previous)||!Number.isSafeInteger(target)||target<=0)
        throw Error('Set a trip target before collecting payments');
      if(previous+cents>target)throw Error('Payment exceeds remaining trip balance');
      const receipt=t.collection('payments').doc();
      tx.create(receipt,{memberUid,amountCents:cents,stage,method,note:comment,
        recordedByUid:uid,createdAt:now()});
      tx.update(member,{paidCents:previous+cents,updatedAt:now()});
      audit(tx,t,uid,'payment.recorded',{paymentId:receipt.id,memberUid,amountCents:cents},now);
      return {paymentId:receipt.id,paidCents:previous+cents,remainingCents:target-previous-cents};
    });
  }

  async function openDirectChat({auth,tripId,memberUid}){
    const uid=checkedAuth(auth),t=tripRef(tripId);
    memberUid=checkedId(memberUid,'member UID');
    if(uid===memberUid)throw Error('Cannot open chat with self');
    const roomId='dm-'+hashCode(t.id+':'+uid+':'+memberUid).slice(0,30);
    return db.runTransaction(async tx=>{
      const actor=await verifiedRole(tx,t,uid,['owner']);
      if(actor.trip.ownerUid!==uid)throw Error('Only the trip owner can create direct rooms');
      const invited=await tx.get(memberRef(t,memberUid));
      if(!invited.exists||invited.data().status!=='active')
        throw Error('Member inactive');
      const room=t.collection('rooms').doc(roomId);
      const existing=await tx.get(room);
      if(!existing.exists) {
        tx.create(room,{type:'direct',participantUids:[uid,memberUid],createdAt:now()});
        audit(tx,t,uid,'chat.direct.created',{memberUid,roomId},now);
      }
      return {roomId,participantUids:[uid,memberUid]};
    });
  }
  return {createTrip,issueInvite,redeemInvite,changeRole,revokeMember,recordPayment,openDirectChat};
}
module.exports={makeService,checkedAuth,checkedName,checkedId,toCents};
