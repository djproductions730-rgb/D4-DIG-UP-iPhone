'use strict';
// Isolated shared-trip DRAFT rule tests. No production deployment.
const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,collection,getDoc,getDocs,query,limit,setDoc,updateDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');

let env;
const PROJECT='demo-d4-trip-shared-qa',tid='goa2026';
const tripDoc=()=> 'trips/'+tid;
const member=uid=>'trips/'+tid+'/members/'+uid;
const room=id=>'trips/'+tid+'/rooms/'+id;
const messages=id=>'trips/'+tid+'/rooms/'+id+'/messages';
const payment=()=> 'trips/'+tid+'/payments/receipt001';
const expense=()=> 'trips/'+tid+'/expenses/expense001';
const db=uid=>env.authenticatedContext(uid).firestore();
const anon=()=>env.unauthenticatedContext().firestore();

before(async()=>{env=await initializeTestEnvironment({
  projectId:PROJECT,
  firestore:{host:'127.0.0.1',port:8080,
    rules:fs.readFileSync(path.join(__dirname,'firestore.shared.draft.rules'),'utf8')}
})});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
    const admin=ctx.firestore();
    await Promise.all([
      setDoc(doc(admin,tripDoc()),{name:'Goa 2026',ownerUid:'owner'}),
      setDoc(doc(admin,member('owner')),{role:'owner',status:'active'}),
      setDoc(doc(admin,member('tripAdmin')),{role:'admin',status:'active'}),
      setDoc(doc(admin,member('member')),{role:'member',status:'active'}),
      setDoc(doc(admin,member('revoked')),{role:'member',status:'revoked'}),
      setDoc(doc(admin,room('group')),{type:'group'}),
      setDoc(doc(admin,room('admins')),{type:'admins'}),
      setDoc(doc(admin,room('direct-member')),{type:'direct',participantUids:['owner','member']}),
      setDoc(doc(admin,payment()),{memberUid:'member',amount:3000}),
      setDoc(doc(admin,expense()),{amount:5000,category:'Travel'})
    ]);
  });
});
after(async()=>{if(env)await env.cleanup()});
const textMsg=(uid,body='Hi from trip')=>({
  senderUid:uid,kind:'text',text:body,createdAt:serverTimestamp()
});

test('nonmember, revoked and anonymous cannot read trip or chat rooms',async()=>{
  for(const reader of [db('intruder'),db('revoked'),anon()]){
    await assertFails(getDoc(doc(reader,tripDoc())));
    await assertFails(getDoc(doc(reader,room('group'))));
    await assertFails(getDoc(doc(reader,room('admins'))));
    await assertFails(getDoc(doc(reader,room('direct-member'))));
    await assertFails(getDoc(doc(reader,payment())));
  }
});

test('member sees trip/group but not admins or unknown rooms',async()=>{
  const memberDb=db('member');
  await assertSucceeds(getDoc(doc(memberDb,tripDoc())));
  await assertSucceeds(getDoc(doc(memberDb,room('group'))));
  await assertFails(getDoc(doc(memberDb,room('admins'))));
  await assertFails(getDoc(doc(memberDb,'trips/'+tid+'/rooms/direct-stranger')));
  await assertSucceeds(getDoc(doc(memberDb,room('direct-member'))));
  await assertFails(getDocs(collection(memberDb,'trips/'+tid+'/rooms')));
});

test('trip admin sees admin chat but not owner-member private chat',async()=>{
  const adminDb=db('tripAdmin');
  await assertSucceeds(getDoc(doc(adminDb,room('admins'))));
  await assertFails(getDoc(doc(adminDb,room('direct-member'))));
  await assertSucceeds(getDocs(collection(adminDb,'trips/'+tid+'/members')));
  await assertSucceeds(getDoc(doc(adminDb,member('member'))));
});

test('owner and invited member can access their private room',async()=>{
  await assertSucceeds(getDoc(doc(db('owner'),room('direct-member'))));
  await assertSucceeds(getDoc(doc(db('member'),room('direct-member'))));
  await assertFails(getDoc(doc(db('tripAdmin'),room('direct-member'))));
});

test('client cannot grant itself admin, create rooms or revoke members',async()=>{
  const u=db('owner');
  await assertFails(setDoc(doc(u,member('intruder')),{role:'owner',status:'active'}));
  await assertFails(updateDoc(doc(u,member('member')),{role:'owner'}));
  await assertFails(deleteDoc(doc(u,member('member'))));
  await assertFails(setDoc(doc(u,room('direct-intruder')),{type:'direct',participantUids:['owner','intruder']}));
  await assertFails(updateDoc(doc(u,tripDoc()),{ownerUid:'intruder'}));
  await assertFails(deleteDoc(doc(u,tripDoc())));
  await assertFails(setDoc(doc(db('intruder'),tripDoc()),{ownerUid:'intruder'}));
});

test('group chat allows signed messages only; immutable and size-checked',async()=>{
  const user=db('member'),group=messages('group');
  await assertSucceeds(setDoc(doc(user,group,'one'),textMsg('member')));
  await assertFails(setDoc(doc(user,group,'forged'),textMsg('tripAdmin')));
  await assertFails(setDoc(doc(user,group,'oversized'),textMsg('member','x'.repeat(2001))));
  await assertFails(setDoc(doc(user,group,'empty'),textMsg('member','')));
  await assertFails(setDoc(doc(user,group,'extra'),{...textMsg('member'),admin:true}));
  await assertFails(updateDoc(doc(user,group,'one'),{text:'altered'}));
  await assertFails(deleteDoc(doc(user,group,'one')));
  await assertSucceeds(getDocs(query(collection(user,group),limit(20))));
  await assertFails(getDocs(collection(user,group)));
  await assertFails(getDocs(query(collection(user,group),limit(101))));
});

test('admin room only accepts assigned admins',async()=>{
  await assertFails(setDoc(doc(db('member'),messages('admins'),'m1'),textMsg('member')));
  await assertSucceeds(setDoc(doc(db('tripAdmin'),messages('admins'),'a1'),textMsg('tripAdmin')));
  await assertSucceeds(setDoc(doc(db('owner'),messages('admins'),'o1'),textMsg('owner')));
  await assertFails(getDocs(query(collection(db('member'),messages('admins')),limit(20))));
});

test('owner-to-member private chat excludes other trip admins',async()=>{
  await assertSucceeds(setDoc(doc(db('member'),messages('direct-member'),'m1'),textMsg('member')));
  await assertSucceeds(setDoc(doc(db('owner'),messages('direct-member'),'o1'),textMsg('owner')));
  await assertFails(setDoc(doc(db('tripAdmin'),messages('direct-member'),'a1'),textMsg('tripAdmin')));
  await assertFails(getDocs(query(collection(db('intruder'),messages('direct-member')),limit(20))));
  await assertSucceeds(getDocs(query(collection(db('member'),messages('direct-member')),limit(20))));
});

test('financial writes require trusted server, even from owner or admin',async()=>{
  for(const uid of ['owner','tripAdmin','member']){
    const client=db(uid);
    await assertSucceeds(getDoc(doc(client,payment())));
    await assertSucceeds(getDoc(doc(client,expense())));
    await assertFails(setDoc(doc(client,'trips/'+tid+'/payments/fake'),{amount:1000}));
    await assertFails(updateDoc(doc(client,payment()),{amount:8000}));
    await assertFails(deleteDoc(doc(client,payment())));
    await assertFails(updateDoc(doc(client,expense()),{amount:0}));
  }
});
