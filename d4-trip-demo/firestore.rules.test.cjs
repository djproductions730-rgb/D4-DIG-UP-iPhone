'use strict';
// Integration tests for the ACTUAL Firestore rules using Firebase's local emulator.
// These tests never connect to or modify the production d4-trip Firebase project.
const {test, before, after, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {initializeTestEnvironment,assertFails,assertSucceeds} = require('@firebase/rules-unit-testing');
const {doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, runTransaction} = require('firebase/firestore');
let env;
const PROJ='demo-d4-trip-rules-qa';

const data = (rev=1)=>({
  data:{version:1,trips:[{id:'trip1',name:'QA trip',members:['Alice'],expenses:[],chats:{admins:[],group:[]}}]},
  revision:rev,updatedBy:'alice',updatedAt:serverTimestamp()
});
const pathFor=(uid,id='primary')=>'users/'+uid+'/snapshots/'+id;
const auth=(uid)=>env.authenticatedContext(uid);
const unauth=()=>env.unauthenticatedContext();

before(async()=>{
  env=await initializeTestEnvironment({
    projectId:PROJ,
    firestore:{
      host:'127.0.0.1',port:8088,
      rules:fs.readFileSync(path.join(__dirname,'firestore.rules'),'utf8')
    }
  });
});
beforeEach(async()=>{await env.clearFirestore()});
after(async()=>{if(env)await env.cleanup()});

test('anonymous users cannot read or create private snapshots',async()=>{
  const db=unauth().firestore();
  await assertFails(getDoc(doc(db,pathFor('alice'))));
  await assertFails(setDoc(doc(db,pathFor('alice')),data()));
});

test('Alice can create a valid snapshot and read it back',async()=>{
  const db=auth('alice').firestore();
  await assertSucceeds(setDoc(doc(db,pathFor('alice')),data()));
  const saved=await assertSucceeds(getDoc(doc(db,pathFor('alice'))));
  assert.equal(saved.data().revision,1);
  assert.equal(saved.data().updatedBy,'alice');
});

test('a second account cannot read, alter, or delete Alice data',async()=>{
  const alice=auth('alice').firestore(),bob=auth('bob').firestore();
  await assertSucceeds(setDoc(doc(alice,pathFor('alice')),data()));
  await assertFails(getDoc(doc(bob,pathFor('alice'))));
  await assertFails(updateDoc(doc(bob,pathFor('alice')),{revision:2}));
  await assertFails(deleteDoc(doc(bob,pathFor('alice'))));
  await assertFails(setDoc(doc(bob,pathFor('alice')),data()));
});

test('UID owner cannot enumerate own snapshots or create alternate IDs',async()=>{
  const alice=auth('alice').firestore();
  await assertSucceeds(setDoc(doc(alice,pathFor('alice')),data()));
  await assertFails(getDocs(collection(alice,'users/alice/snapshots')));
  await assertFails(setDoc(doc(alice,pathFor('alice','secondary')),data()));
});

test('revision must strictly increment and updatedBy/updatedAt must match',async()=>{
  const alice=auth('alice').firestore();
  const ref=doc(alice,pathFor('alice'));
  await assertSucceeds(setDoc(ref,data()));
  await assertSucceeds(setDoc(ref,data(2)));
  await assertFails(setDoc(ref,data(2)));
  await assertFails(setDoc(ref,data(4)));
  await assertFails(setDoc(ref,{...data(3),updatedBy:'bob'}));
  await assertFails(setDoc(ref,{...data(3),updatedAt:new Date()}));
  await assertFails(setDoc(ref,{...data(3),unexpected:'extra'}));
  await assertSucceeds(setDoc(ref,data(3)));
});

test('malformed new data and untrusted other collections remain denied',async()=>{
  const alice=auth('alice').firestore();
  const ref=doc(alice,pathFor('alice'));
  await assertFails(setDoc(ref,{...data(),data:{trips:'not a list'}}));
  await assertFails(setDoc(ref,{...data(),revision:0}));
  await assertFails(setDoc(ref,{...data(),data:'invalid'}));
  await assertFails(setDoc(doc(alice,'trips/trip1'),{name:'Fake shared trip'}));
  await assertFails(getDoc(doc(alice,'trips/trip1')));
  await assertFails(setDoc(doc(alice,'trips/trip1/messages/msg1'),{text:'not authorized'}));
});

test('only verified Main Admin can enumerate shared trips to receive cross-device join notifications',async()=>{
 const main=env.authenticatedContext('2FYUUnPp1JX8wvv9HSvL6QoyaCq2',{
   email:'main@example.test',email_verified:true
 }).firestore();
 await assertSucceeds(getDocs(collection(main,'teamTrips')));
 await assertFails(getDocs(collection(auth('bob').firestore(),'teamTrips')));
 await assertFails(getDocs(collection(unauth().firestore(),'teamTrips')));
});


test('only Main Admin may promote an approved link member, and new anonymous UID admin may edit the trip',{timeout:15000},async()=>{
 const ownerId='2FYUUnPp1JX8wvv9HSvL6QoyaCq2';
 const main=env.authenticatedContext(ownerId,{email:'owner@example.test',email_verified:true}).firestore();
 const guest=env.authenticatedContext('blessy-guest').firestore();
 const other=env.authenticatedContext('other-guest').firestore();
 const tr=doc(main,'teamTrips/goa-qa');
 const gr=doc(main,'teamTrips/goa-qa/accessUid/blessy-guest');
 await assertSucceeds(setDoc(tr,{trip:{id:'goa-qa',name:'QA Goa',members:['Main','Blessy'],admins:[],expenses:[]},
  revision:1,updatedBy:ownerId,updatedAt:serverTimestamp()}));
 await env.withSecurityRulesDisabled(async context=>{
  const ref=doc(context.firestore(),'teamTrips/goa-qa/accessUid/blessy-guest');
  await setDoc(ref,{role:'member',name:'Blessy',grantedByUid:ownerId,grantedAt:new Date()});
 });
 await assertFails(updateDoc(doc(other,'teamTrips/goa-qa/accessUid/blessy-guest'),{role:'admin'}));
 await assertFails(updateDoc(gr,{role:'admin'})); // The role and trip roster must change together.
 await assertSucceeds(runTransaction(main,async tx=>{
  const snap=await tx.get(tr);
  tx.update(tr,{trip:{...snap.data().trip,admins:['Blessy']},
   revision:2,updatedBy:ownerId,updatedAt:serverTimestamp()});
  tx.update(gr,{role:'admin'});
 }));
 const promoted=await assertSucceeds(getDoc(doc(guest,'teamTrips/goa-qa')));
 assert.deepEqual(promoted.data().trip.admins,['Blessy']);
 await assertSucceeds(updateDoc(doc(guest,'teamTrips/goa-qa'),
  {revision:3,updatedBy:'blessy-guest',updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(guest,'teamTrips/goa-qa/accessUid/blessy-guest')));
 await assertSucceeds(runTransaction(main,async tx=>{
  const snap=await tx.get(tr);
  tx.update(tr,{trip:{...snap.data().trip,admins:[]},
   revision:4,updatedBy:ownerId,updatedAt:serverTimestamp()});
  tx.update(gr,{role:'member'});
 }));
 await assertFails(updateDoc(doc(guest,'teamTrips/goa-qa'),
  {revision:5,updatedBy:'blessy-guest',updatedAt:serverTimestamp()}));
});

test('two separate clients signed in as the same UID receive live revisions', {timeout:15000}, async()=>{
  const first=auth('alice').firestore();
  const second=auth('alice').firestore();
  const firstRef=doc(first,pathFor('alice'));
  const secondRef=doc(second,pathFor('alice'));
  await assertSucceeds(setDoc(firstRef,data()));
  let unsubscribe=()=>{};
  let timeout;
  try{
    const seen=new Promise((resolve,reject)=>{
      unsubscribe=onSnapshot(secondRef,snap=>{
        if(snap.exists() && snap.data().revision===2) resolve(snap.data().revision);
      },reject);
    });
    await assertSucceeds(setDoc(firstRef,data(2)));
    const received=await Promise.race([
      seen,
      new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Same-UID live update not received')),10000);})
    ]);
    assert.equal(received,2);
  }finally{
    clearTimeout(timeout);
    unsubscribe();
  }
});
