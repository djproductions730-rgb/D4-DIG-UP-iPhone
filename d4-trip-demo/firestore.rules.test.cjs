'use strict';
// Integration tests for the ACTUAL Firestore rules using Firebase's local emulator.
// These tests never connect to or modify the production d4-trip Firebase project.
const {test, before, after, beforeEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {initializeTestEnvironment,assertFails,assertSucceeds} = require('@firebase/rules-unit-testing');
const {doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, serverTimestamp} = require('firebase/firestore');
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
      host:'127.0.0.1',port:8080,
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
