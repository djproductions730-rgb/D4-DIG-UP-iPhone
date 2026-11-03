'use strict';
// Real Firestore Emulator tests for trusted backend draft: never production.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {makeService,toCents}=require('./service.cjs');
let app,db,service;
const auth=(uid,verified=true)=>({uid,token:{email_verified:verified}});
const owner=auth('mainAdminAccount');
const member=auth('memberA00000');
const another=auth('memberB00000');
const third=auth('memberC00000');

before(()=>{
  app=initializeApp({projectId:'demo-d4-trip-server-qa'},'d4-server-qa');
  db=getFirestore(app);
  service=makeService(db,{mainOwnerUid:owner.uid});
});
after(async()=>{if(app)await deleteApp(app)});
const trip=async(targetAmount='8000')=>{
  const created=await service.createTrip({auth:owner,name:'Goa Family Group',destination:'Goa',targetAmount});
  return created.tripId;
};
const add=async(tripId,who,name='Member')=>{
  const {code}=await service.issueInvite({auth:owner,tripId});
  return service.redeemInvite({auth:who,code,displayName:name});
};
const memberDoc=(tid,uid)=>db.doc('trips/'+tid+'/members/'+uid);

test('paise parser rejects malformed, fractional-paise, negative money',()=>{
  assert.equal(toCents('8000'),800000);
  assert.equal(toCents('20.5'),2050);
  assert.equal(toCents('20.05'),2005);
  for(const invalid of ['-1','1.999','8,000','1e5','',null,'123456789']) {
    assert.throws(()=>toCents(invalid),/Invalid/);
  }
});

test('only a verified configured Main Admin can create a trip',async()=>{
  await assert.rejects(service.createTrip({auth:member,name:'Forged',targetAmount:500}),/Main Admin only/);
  await assert.rejects(service.createTrip({auth:auth(owner.uid,false),name:'Unverified',targetAmount:500}),/Verified/);
  await assert.rejects(service.createTrip({auth:null,name:'No auth',targetAmount:500}),/Verified/);
  const tid=await trip('8000');
  const snapshot=await db.doc('trips/'+tid).get();
  assert.equal(snapshot.data().ownerUid,owner.uid);
  assert.equal(snapshot.data().targetCents,800000);
  assert.equal((await memberDoc(tid,owner.uid).get()).data().role,'owner');
  assert.equal((await db.doc('trips/'+tid+'/rooms/group').get()).data().type,'group');
  assert.equal((await db.doc('trips/'+tid+'/rooms/admins').get()).data().type,'admins');
});

test('single-use expiring invite grants member role only, no self-escalation',async()=>{
  const tid=await trip();
  await assert.rejects(service.issueInvite({auth:member,tripId:tid}),/Trip access denied/);
  const inv=await service.issueInvite({auth:owner,tripId:tid,expiresMinutes:5});
  assert.equal(inv.code.length>=24,true);
  await service.redeemInvite({auth:member,code:inv.code,displayName:'Alice'});
  const snap=await memberDoc(tid,member.uid).get();
  assert.equal(snap.data().role,'member');
  assert.equal(snap.data().status,'active');
  await assert.rejects(service.redeemInvite({auth:another,code:inv.code,displayName:'Bob'}),/already used/);
  await assert.rejects(service.changeRole({auth:member,tripId:tid,memberUid:member.uid,role:'owner'}),/Unsupported role/);
  await assert.rejects(service.changeRole({auth:member,tripId:tid,memberUid:member.uid,role:'admin'}),/Trip access denied/);
});

test('owner can promote an admin, admin can revoke ordinary member only',async()=>{
  const tid=await trip();
  await add(tid,member,'Alice');
  await add(tid,another,'Bob');
  await service.changeRole({auth:owner,tripId:tid,memberUid:member.uid,role:'admin'});
  assert.equal((await memberDoc(tid,member.uid).get()).data().role,'admin');
  await assert.rejects(service.changeRole({auth:member,tripId:tid,memberUid:another.uid,role:'admin'}),/Trip access denied/);
  await assert.rejects(service.revokeMember({auth:member,tripId:tid,memberUid:owner.uid}),/Cannot revoke/);
  await assert.rejects(service.revokeMember({auth:another,tripId:tid,memberUid:member.uid}),/Trip access denied/);
  await service.revokeMember({auth:member,tripId:tid,memberUid:another.uid});
  assert.equal((await memberDoc(tid,another.uid).get()).data().status,'revoked');
  await assert.rejects(service.issueInvite({auth:another,tripId:tid}),/Trip access denied/);
  await assert.rejects(service.changeRole({auth:owner,tripId:tid,memberUid:another.uid,role:'admin'}),/Invalid active member/);
});


test('revoking an admin disables all unredeemed invite codes from that admin',async()=>{
  const tid=await trip();
  await add(tid,member,'Alice');
  await service.changeRole({auth:owner,tripId:tid,memberUid:member.uid,role:'admin'});
  const {code}=await service.issueInvite({auth:member,tripId:tid});
  await service.revokeMember({auth:owner,tripId:tid,memberUid:member.uid});
  await assert.rejects(
    service.redeemInvite({auth:third,code,displayName:'Charlie'}),
    /Invite issuer no longer authorized/
  );
  assert.equal((await memberDoc(tid,third.uid).get()).exists,false);
});

test('advance and balance payments update correct paise and preserve audit history',async()=>{
  const tid=await trip();
  await add(tid,member,'Alice');
  const first=await service.recordPayment({auth:owner,tripId:tid,memberUid:member.uid,
    amount:'3000',stage:'advance',method:'UPI',note:'First part'});
  assert.equal(first.paidCents,300000);
  assert.equal(first.remainingCents,500000);
  const next=await service.recordPayment({auth:owner,tripId:tid,memberUid:member.uid,
    amount:'5000',stage:'balance',method:'UPI'});
  assert.equal(next.paidCents,800000);
  assert.equal(next.remainingCents,0);
  assert.equal((await memberDoc(tid,member.uid).get()).data().paidCents,800000);
  assert.equal((await db.collection('trips/'+tid+'/payments').get()).size,2);
  await assert.rejects(service.recordPayment({auth:owner,tripId:tid,memberUid:member.uid,amount:'1'}),/exceeds remaining/);
  await assert.rejects(service.recordPayment({auth:member,tripId:tid,memberUid:member.uid,amount:'1'}),/Trip access denied/);
  await service.revokeMember({auth:owner,tripId:tid,memberUid:member.uid});
  assert.equal((await db.collection('trips/'+tid+'/payments').get()).size,2);
});

test('two concurrent payments cannot jointly exceed the target',async()=>{
  const tid=await trip();
  await add(tid,member,'Alice');
  await add(tid,another,'Bob');
  await service.changeRole({auth:owner,tripId:tid,memberUid:another.uid,role:'admin'});
  const attempts=await Promise.allSettled([
    service.recordPayment({auth:owner,tripId:tid,memberUid:member.uid,amount:'5000'}),
    service.recordPayment({auth:another,tripId:tid,memberUid:member.uid,amount:'5000'})
  ]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(attempts.filter(x=>x.status==='rejected').length,1);
  assert.equal((await memberDoc(tid,member.uid).get()).data().paidCents,500000);
  assert.equal((await db.collection('trips/'+tid+'/payments').get()).size,1);
});

test('only owner can create a room with one active trip member',async()=>{
  const tid=await trip();
  await add(tid,member,'Alice');
  await add(tid,another,'Bob');
  await service.changeRole({auth:owner,tripId:tid,memberUid:another.uid,role:'admin'});
  await assert.rejects(service.openDirectChat({auth:another,tripId:tid,memberUid:member.uid}),/Trip access denied/);
  const x=await service.openDirectChat({auth:owner,tripId:tid,memberUid:member.uid});
  assert.ok(x.roomId.startsWith('dm-'));
  assert.deepEqual(x.participantUids,[owner.uid,member.uid]);
  const again=await service.openDirectChat({auth:owner,tripId:tid,memberUid:member.uid});
  assert.equal(again.roomId,x.roomId);
  assert.equal((await db.doc('trips/'+tid+'/rooms/'+x.roomId).get()).data().type,'direct');
  await service.revokeMember({auth:owner,tripId:tid,memberUid:member.uid});
  await assert.rejects(service.openDirectChat({auth:owner,tripId:tid,memberUid:member.uid}),/Member inactive/);
});
