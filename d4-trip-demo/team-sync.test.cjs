const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(owner=true){
 const listeners=[],writes=[],inviteWrites=[],shown=[],messages=[];let authEvent,transaction;
 const account={uid:owner?'owner':'member',email:'test@example.com',emailVerified:true};
 const window={D4TripLocal:{teamId:'trip',showTeam:t=>shown.push(t),render(){},toast:m=>messages.push(m)},D4TripCloud:{ready:true,auth:{currentUser:account},cloudDb:{},isVerifiedOwner:()=>owner},addEventListener:(_e,f)=>authEvent=f};
 const context=vm.createContext({window,structuredClone,URL,location:{href:'https://example.com/?team=trip'},document:{addEventListener(){}},doc:(base,...p)=>[typeof base==='string'?base:'',...p].filter(Boolean).join('/'),setDoc:async(ref,data)=>{inviteWrites.push({ref,data})},onSnapshot:(ref,options,next,error)=>{listeners.push({ref,next,error});return()=>{}},serverTimestamp:()=>0,runTransaction:(_db,f)=>transaction(f)});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'team-sync.js'),'utf8').replace(/^import .*;\r?\n/,''),context);
 const snap=(entry,data,metadata={})=>entry.next({exists:()=>!!data,data:()=>data,metadata:{fromCache:false,hasPendingWrites:false,...metadata}});
 transaction=fn=>fn({get:async()=>({data:()=>({revision:1})}),set:(ref,value)=>writes.push({ref,value})});
 return {window,listeners,writes,inviteWrites,shown,messages,snap,api:window.D4Team,signOut(){window.D4TripCloud.auth.currentUser=null;authEvent()},setTransaction:f=>transaction=f};
}
test('members can view their granted trip but cannot save',()=>{
 const h=setup(false);h.snap(h.listeners[0],{role:'member'});h.snap(h.listeners[1],{trip:{id:'trip'},revision:1});
 assert.equal(h.api.canEdit(),false);assert.equal(h.api.save({id:'trip'}),false);assert.equal(h.writes.length,0);
});
test('revoked access clears displayed data and rejects stale callbacks',()=>{
 const h=setup(false);h.snap(h.listeners[0],{role:'admin'});const tripListener=h.listeners[1];h.snap(tripListener,{trip:{id:'trip'},revision:1});
 h.snap(h.listeners[0],null);const count=h.shown.length;h.snap(tripListener,{trip:{id:'trip'},revision:2});
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
 h.snap(h.listeners[0],{role:'admin'});
 h.snap(h.listeners[1],{trip:{id:'trip'},revision:1});
 assert.equal(h.api.canEdit(),true);
 assert.equal(h.api.canRemove(),false);
 const ui=h.api.controls({id:'trip'});
 assert.doesNotMatch(ui,/data-team="revoke"|data-team="invite"/);
 assert.match(ui,/Use Add Member below/);
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
});
test('Member cannot add or remove any user',async()=>{
 const h=setup(false);
 h.snap(h.listeners[0],{role:'member'});
 h.snap(h.listeners[1],{trip:{id:'trip'},revision:1});
 assert.equal(h.api.canRemove(),false);
 await assert.rejects(h.api.inviteMember('new@example.com'),/Only Main Admin and Trip Admin/);
 assert.equal(h.inviteWrites.length,0);
});
