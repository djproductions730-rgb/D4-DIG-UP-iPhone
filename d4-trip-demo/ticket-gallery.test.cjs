'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = __dirname;
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const script = fs.readFileSync(path.join(root,'ticket-gallery.js'),'utf8');
const cloud = fs.readFileSync(path.join(root,'ticket-gallery-cloud.js'),'utf8');
const rules = fs.readFileSync(path.join(root,'firestore.rules'),'utf8');
const storageRules = fs.readFileSync(path.join(root,'storage.rules'),'utf8');

test('tickets page keeps Up and Down galleries inside existing train tickets screen', () => {
  assert.match(html,/function ticketsPage\(\)/);
  assert.match(html,/id="d4TicketGallery"/);
  assert.match(html,/window\.D4Tickets\?\.mount\?\.\(\)/);
  assert.match(html,/canEditTickets:\(\)=>isTripAdmin\(current\(\)\)/);
  assert.match(html,/ticket-gallery\.js\?build=54/);
  assert.match(html,/ticket-gallery-cloud\.js\?build=54/);
});
test('local gallery restores many photos and shows uploads only to admins', () => {
  let admin = true;
  let host = {dataset:{tripId:'trip-1'},innerHTML:'',
    querySelectorAll:()=>[],querySelector:()=>null,insertAdjacentHTML(){}};
  const stored = JSON.stringify(Array.from({length:31},(_,i)=>({
    id:'photo-'+i,direction:i%2?'down':'up',
    name:'ticket-'+i+'.jpg',size:100,type:'image/jpeg',createdAt:Date.now()
  })));
  const localStorage = {getItem:(key)=>key==='d4-trip-ticket-list-v1:trip-1'?stored:null};
  const events = {};
  const document = {
    getElementById:id=>id==='d4TicketGallery'?host:null,
    addEventListener:(type,handler)=>{events[type]=handler;},
    querySelectorAll:()=>[]
  };
  const window = {D4TripLocal:{teamId:null,currentTrip:()=>({id:'trip-1'}),canEditTickets:()=>admin}};
  vm.runInNewContext(script,{window,document,localStorage,console,URL,Blob,Date,setTimeout,clearTimeout});
  assert.match(host.innerHTML,/16 Photos/);
  assert.match(host.innerHTML,/15 Photos/);
  assert.match(host.innerHTML,/Add Up Ticket Photos/);
  assert.match(host.innerHTML,/Add Down Ticket Photos/);
  assert.match(host.innerHTML,/multiple data-tkt-input="up"/);
  assert.match(host.innerHTML,/multiple data-tkt-input="down"/);
  admin=false;
  host = {dataset:{tripId:'trip-1'},innerHTML:'',
    querySelectorAll:()=>[],querySelector:()=>null,insertAdjacentHTML(){}};
  window.D4Tickets.mount();
  assert.doesNotMatch(host.innerHTML,/data-tkt-add=/);
  assert.doesNotMatch(host.innerHTML,/data-tkt-delete=/);
  assert.match(host.innerHTML,/Members can view/);
  assert.equal(window.D4Tickets._testing.readList('trip-1').length,31);
  assert.equal(window.D4Tickets._testing.escapeText('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
});
test('shared gallery uses authenticated object reads and admin-only upload/delete', () => {
  assert.match(cloud,/getBlob\(/);
  assert.match(cloud,/onSnapshot\(/);
  assert.match(cloud,/canEditTickets/);
  assert.match(storageRules,/allow get: if viewer\(\)/);
  assert.match(storageRules,/allow create: if editor\(\) && validImage\(\)/);
  assert.match(storageRules,/allow update: if false/);
  assert.match(storageRules,/allow delete: if editor\(\)/);
  assert.match(rules,/match \/ticketPhotos\/\{ticketId\}/);
  assert.match(rules,/allow get, list: if ticketViewer\(\)/);
  assert.match(rules,/d\.createdAt == request\.time/);
});
test('shared metadata is configured and original trip files remain separate', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8'));
  assert.equal(config.storage.rules,'storage.rules');
  assert.match(script,/const MAX_BYTES = 15 \* 1024 \* 1024/);
  assert.doesNotMatch(script,/files\.length\s*>\s*12/);
});
