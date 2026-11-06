const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(owner=true){
 const listeners=[],writes=[],inviteWrites=[],shown=[],messages=[],copied=[];let authEvent,transaction,clickHandler;
 const account={uid:owner?'owner':'member',email:'test@example.com',emailVerified:true};
 const window={D4TripLocal:{teamId:'trip',showTeam:t=>shown.push(t),render(){},toast:m=>messages.push(m)},D4TripCloud:{ready:true,auth:{currentUser:account},cloudDb:{},isVerifiedOwner:()=>owner},addEventListener:(_e,f)=>authEvent=f};
 const context=vm.createContext({window,structuredClone,URL,navigator:{clipboard:{writeText:async value=>{copied.push(value)}}},location:{href:'https://example.com/?team=trip'},document:{addEventListener:(type,fn)=>{if(type==='click')clickHandler=fn}},doc:(base,...p)=>[typeof base==='string'?base:'',...p].filter(Boolean).join('/'),collection:(base,...p)=>[typeof base==='string'?base:'',...p].filter(Boolean).join('/'),setDoc:async(ref,data)=>{inviteWrites.push({ref,data})},onSnapshot:(ref,options,next,error)=>{listeners.push({ref,next,error});return()=>{}},serverTimestamp:()=>0,runTransaction:(_db,f)=>transaction(f)});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'team-sync.js'),'utf8').replace(/^import .*;\r?\n/,''),context);
 const snap=(entry,data,metadata={})=>entry.next({exists:()=>!!data,data:()=>data,metadata:{fromCache:false,hasPendingWrites:false,...metadata}});
 transaction=fn=>fn({get:async()=>({data:()=>({revision:1})}),set:(ref,value)=>writes.push({ref,value})});
 return {window,listeners,writes,inviteWrites,shown,messages,copied,snap,api:window.D4Team,shareJoinLink:()=>clickHandler({target:{closest:()=>({dataset:{team:'share-join-link'}})}}),signOut(){window.D4TripCloud.auth.currentUser=null;authEvent()},setTransaction:f=>transaction=f};
}
test('members can view their granted trip but cannot save',()=>{
 const h=setup(false);assert.equal(h.listeners[0].ref,'teamTrips/trip/accessUid/member');h.snap(h.listeners[1],{role:'member'});h.snap(h.listeners[2],{trip:{id:'trip'},revision:1});
 assert.equal(h.api.canEdit(),false);assert.equal(h.api.save({id:'trip'}),false);assert.equal(h.writes.length,0);
});
test('revoked access clears displayed data and rejects stale callbacks',()=>{
 const h=setup(false);h.snap(h.listeners[1],{role:'admin'});const tripListener=h.listeners[2];h.snap(tripListener,{trip:{id:'trip'},revision:1});
 h.snap(h.listeners[1],null);const count=h.shown.length;h.snap(tripListener,{trip:{id:'trip'},revision:2});
 assert.equal(h.shown.at(-1),null);assert.equal(h.shown.length,count);assert.equal(h.api.canEdit(),false);
});
test('cached trip cannot replace confirmed server data',()=>{
 const h=setup();h.snap(h.listeners[0],{trip:{id:'trip'},revision:1},{fromCache:true});assert.equal(h.shown.at(-1),null);
});
test('admin write carries current revision and authenticated identity',async()=>{
 const h=setup();h.snap(h.listeners[0],{trip:{id:'trip'},revision:1});h.api.save({id:'trip',name:'Edited'});await tick();
 assert.equal(h.writes.length,1);assert.equal(h.writes[0].value.revision,2);assert.equal(h.writes[0].value.updatedBy,'owner');
});
test('conflicting revision does not overwrite another admin',async()=>{
 const h=setup();h.snap(h.listeners[0],{trip:{id:'trip'},revision:1});h.setTransaction(fn=>fn({get:async()=>({data:()=>({revision:2})}),set:()=>assert.fail('must not write')}));
 h.api.save({id:'trip'});await tick();assert.ok(h.messages.some(m=>m.includes('Another admin changed')));
});
test('signed out account cannot save or receive old trip data',()=>{
 const h=setup();const old=h.listeners[0];h.signOut();h.snap(old,{trip:{id:'trip'},revision:1});assert.equal(h.shown.at(-1),null);assert.equal(h.api.save({id:'trip'}),false);
});

test('Trip Admin sees one Add Member flow and can invite, but cannot revoke joined users',async()=>{
 const h=setup(false);
 h.snap(h.listeners[1],{role:'admin'});
 h.snap(h.listeners[2],{trip:{id:'trip'},revision:1});
 assert.equal(h.api.canEdit(),true);
 assert.equal(h.api.canRemove(),false);
 const ui=h.api.controls({id:'trip'});
 assert.doesNotMatch(ui,/data-team="revoke"|data-team="invite"/);
 assert.match(ui,/Share Trip Link/);
 assert.match(ui,/data-team="copy"/);
 assert.doesNotMatch(ui,/Generate Member Code|Generate Admin Code/);
 const invited=await h.api.inviteMember('NEW@EXAMPLE.COM');
 assert.equal(invited,'new@example.com');
 assert.equal(h.inviteWrites[0].ref,'teamTrips/trip/access/new@example.com');
 assert.equal(h.inviteWrites[0].data.role,'member');
});
test('Main Admin retains the exclusive Remove Access control',()=>{
 const h=setup(true);
 h.snap(h.listeners[0],{trip:{id:'trip'},revision:1});
 assert.equal(h.api.canRemove(),true);
 assert.match(h.api.controls({id:'trip'}),/data-team="revoke"/);
 const grantsListener=h.listeners.find(l=>l.ref==='teamTrips/trip/access');
 assert.ok(grantsListener,'Owner must subscribe to verified-email grants');
 grantsListener.next({metadata:{fromCache:false},docs:[{id:'joined@example.com',data:()=>({role:'member'})}]});
 const controls=h.api.controls({id:'trip'});
 assert.match(controls,/joined@example.com/);
 assert.match(controls,/data-team="revoke-email"/);
 assert.doesNotMatch(controls,/onerror=/);
});
test('Main Admin one-tap Share Join Link copies the exact shared trip URL and confirms below',async()=>{
 const h=setup(true);
 h.snap(h.listeners[0],{trip:{id:'trip'},revision:1});
 await h.shareJoinLink();
 assert.equal(h.copied.length,1);
 assert.equal(h.copied[0],'https://example.com/?team=trip');
 assert.ok(h.messages.includes('✅ Link copied! Share it with members.'));
});
test('Member cannot add or remove any user',async()=>{
 const h=setup(false);
 h.snap(h.listeners[1],{role:'member'});
 h.snap(h.listeners[2],{trip:{id:'trip'},revision:1});
 assert.equal(h.api.canRemove(),false);
 await assert.rejects(h.api.inviteMember('new@example.com'),/Only Main Admin and Trip Admin/);
 assert.equal(h.inviteWrites.length,0);
});


test('Main Admin base Home receives real-time join requests without a team query parameter',()=>{
 const listeners=[],messages=[],events={};
 const user={uid:'owner',email:'owner@example.test',emailVerified:true};
 const window={
  D4TripLocal:{teamId:null,getData:()=>({trips:[{id:'goa-trip',name:'Goa Trip'}]}),
   render(){},toast:m=>messages.push(m)},
  D4TripCloud:{ready:true,auth:{currentUser:user},cloudDb:{},isVerifiedOwner:()=>true},
  D4Team:{canEdit:()=>false,canRemove:()=>false},
  addEventListener:(type,fn)=>{events[type]=fn}
 };
 const ctx=vm.createContext({window,structuredClone,
  document:{addEventListener(){}},sessionStorage:{getItem:()=>null},
  doc:(base,...args)=>[typeof base==='string'?base:'',...args].filter(Boolean).join('/'),
  collection:(base,...args)=>[typeof base==='string'?base:'',...args].filter(Boolean).join('/'),
  onSnapshot:(ref,next,error)=>{listeners.push({ref,next,error});return()=>{}},
  runTransaction:async()=>{},setDoc:async()=>{},serverTimestamp:()=>0,signInAnonymously:async()=>{}
 });
 const src=fs.readFileSync(path.join(__dirname,'team-join.js'),'utf8').replace(/^import .*;\r?\n/gm,'');
 vm.runInContext(src,ctx);
 const empty=window.D4TripJoin.mainAdminInbox();
 assert.match(empty,/0 Pending/);
 assert.equal(listeners.length,2);
 assert.equal(listeners[0].ref,'teamTrips/goa-trip/joinRequests');
 assert.equal(listeners[1].ref,'teamTrips','Admin can discover shared trips absent from local storage');
 listeners[0].next({docs:[]});
 listeners[0].next({docs:[{id:'guest1',data:()=>({
  uid:'guest1',name:'Friend One',status:'pending',createdAt:{seconds:1}
 })}]});
 const inbox=window.D4TripJoin.mainAdminInbox();
 assert.match(inbox,/Friend One/);
 assert.match(inbox,/Goa Trip/);
 assert.match(inbox,/data-join-decision="approved"/);
 assert.match(inbox,/data-join-decision="rejected"/);
 assert.match(inbox,/data-trip-id="goa-trip"/);
 assert.match(window.D4TripJoin.mainAdminBanner(),/1 pending join request/);
 assert.ok(messages.some(m=>m.includes('new join request')),'A fresh request triggers an in-app notification');
 listeners[1].next({docs:[{id:'another-trip',data:()=>({trip:{name:'Another Trip'}})}]});
 assert.equal(listeners.length,3,'Remote trip discovered without local backup');
 assert.equal(listeners[2].ref,'teamTrips/another-trip/joinRequests');
 listeners[2].next({docs:[{id:'guest2',data:()=>({
  uid:'guest2',name:'Second Friend',status:'pending',createdAt:{seconds:2}
 })}]});
 assert.match(window.D4TripJoin.mainAdminInbox(),/Second Friend/,'Request arrives from server-only trip');

});
