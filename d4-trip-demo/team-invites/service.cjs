'use strict';
// Secure one-use codes for the EXISTING teamTrips/<tripId>/access/<verified-email> model.
// Firestore Admin SDK bypasses rules, so every authorization is checked here.
const {randomBytes,createHash}=require('node:crypto');
const CODE=/^D4-[A-Za-z0-9_-]{20,43}$/;
const TRIP=/^[A-Za-z0-9_-]{1,100}$/;
const hash=code=>createHash('sha256').update(code).digest('hex');
const verified=auth=>{
  const uid=auth?.uid,email=String(auth?.token?.email||'').trim().toLowerCase();
  if(!uid||auth?.token?.email_verified!==true||!^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email))
    throw Error('Sign in with a verified Firebase email to join');
  return {uid,email};
};
function makeTeamInviteService(db,{mainOwnerUid,now=()=>Date.now(),newCode=()=>randomBytes(15).toString('base64url')}={}){
  if(!mainOwnerUid)throw Error('D4_TRIP_MAIN_OWNER_UID is required');
  const trip=id=>db.doc('teamTrips/'+id);
  const grant=(id,email)=>db.doc('teamTrips/'+id+'/access/'+email);
  const codeDoc=code=>db.doc('teamJoinCodes/'+hash(code));
  const owner=uid=>uid===mainOwnerUid;
  async function issueTeamCode({auth,tripId,role='member'}){
    const actor=verified(auth);
    if(!TRIP.test(String(tripId||'')))throw Error('Invalid trip');
    if(!['member','admin'].includes(role))throw Error('Unsupported invite role');
    if(role==='admin'&&!owner(actor.uid))throw Error('Only Main Admin may issue Admin codes');
    const [t,access]=await Promise.all([trip(tripId).get(),owner(actor.uid)?Promise.resolve(null):grant(tripId,actor.email).get()]);
    if(!t.exists)throw Error('Shared trip does not exist; Main Admin must open the shared copy first');
    if(!owner(actor.uid)&&(!access?.exists||access.data().role!=='admin'))
      throw Error('Only a verified Trip Admin can issue Member codes');
    const code='D4-'+newCode();
    if(!CODE.test(code))throw Error('Code generation unavailable');
    const expiresAtMs=now()+7*24*60*60*1000;
    await codeDoc(code).create({tripId,role,issuedByUid:actor.uid,issuedByEmail:actor.email,expiresAtMs,createdAtMs:now(),usedByUid:null});
    return {code,role,expiresAtMs}; // Plaintext shown once. Only hashed code stored.
  }
  async function redeemTeamCode({auth,code}){
    const person=verified(auth),submitted=String(code||'').trim();
    if(!CODE.test(submitted))throw Error('Use the new secure D4 invitation code from Main Admin (not an old local trip code)');
    return db.runTransaction(async tx=>{
      const token=codeDoc(submitted),snapshot=await tx.get(token);
      if(!snapshot.exists)throw Error('Code not found. Ask your Admin to generate a new invite');
      const inv=snapshot.data();
      if(inv.usedByUid){
        if(inv.usedByUid!==person.uid)throw Error('This code was already used. Request a new code');
        const old=await tx.get(grant(inv.tripId,person.email));
        if(!old.exists)throw Error('Your trip access was removed. Ask Main Admin to invite again');
        return {tripId:inv.tripId,role:old.data().role,alreadyJoined:true};
      }
      if(!Number.isFinite(inv.expiresAtMs)||inv.expiresAtMs<=now())throw Error('This code expired. Ask Admin for a new one');
      if(!TRIP.test(inv.tripId)||!['member','admin'].includes(inv.role))
        throw Error('Invitation is invalid');
      const t=await tx.get(trip(inv.tripId));
      if(!t.exists)throw Error('This trip is no longer available');
      if(inv.role==='admin'&&!owner(inv.issuedByUid))throw Error('Admin code issuer is not authorized');
      if(!owner(inv.issuedByUid)){
        const issuer=await tx.get(grant(inv.tripId,inv.issuedByEmail));
        if(!issuer.exists||issuer.data().role!=='admin')throw Error('Inviting Admin no longer has access');
      }
      const accessRef=grant(inv.tripId,person.email),old=await tx.get(accessRef);
      // A member code must NEVER demote an already-authorized Admin.
      const role=old.exists&&old.data().role==='admin'?'admin':inv.role;
      tx.set(accessRef,{role});
      tx.update(token,{usedByUid:person.uid,usedByEmail:person.email,usedAtMs:now()});
      return {tripId:inv.tripId,role,alreadyJoined:false};
    });
  }
  return {issueTeamCode,redeemTeamCode};
}
module.exports={makeTeamInviteService,verified,CODE};
