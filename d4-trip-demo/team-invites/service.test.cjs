'use strict';
// Offline unit tests for existing teamTrips permissions; never contact live Firebase.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {makeTeamInviteService}=require('./service.cjs');
class FakeDb {
  constructor(){this.store=new Map();}
  doc(path){const db=this;return {
    path,
    async get(){return db.snapshot(path)},
    async create(value){if(db.store.has(path))throw Error('Already exists');db.store.set(path,{...value});}
  };}
  snapshot(path){const value=this.store.get(path);return {exists:!!value,data:()=>value&&{...value}};}
  async runTransaction(fn){
    const edits=[];const tx={
      get:async ref=>this.snapshot(ref.path),
      set:(ref,data)=>edits.push(['set',ref.path,data]),
      update:(ref,data)=>edits.push(['update',ref.path,data])
    };
    const result=await fn(tx);
    for(const [verb,path,data] of edits) {
      if(verb==='update'&&!this.store.has(path))throw Error('Missing transaction document');
      this.store.set(path,{...(verb==='update'?this.store.get(path):{}),...data});
    }
    return result;
  }
}
const account=(uid,email,verified=true)=>({uid,token:{email,email_verified:verified}});
const main=account('main-uid','main@d4.test'),admin=account('admin-uid','admin@d4.test'),member=account('member-uid','member@d4.test'),stranger=account('stranger','stranger@d4.test');
function setup(){
  const db=new FakeDb();let time=1700000000000,n=0;
  db.store.set('teamTrips/goa-test',{trip:{name:'Goa',id:'goa-test'},revision:1});
  const api=makeTeamInviteService(db,{mainOwnerUid:main.uid,now:()=>time,newCode:()=>String(++n).padStart(20,'0')});
  return {db,api,now:v=>time+=v,grant:(who,role)=>db.store.set('teamTrips/goa-test/access/'+who.token.email,{role}),remove:who=>db.store.delete('teamTrips/goa-test/access/'+who.token.email)};
}
test('only verified owner and authorized admin can issue codes',async()=>{
  const h=setup();
  await assert.rejects(h.api.issueTeamCode({auth:member,tripId:'goa-test'}),/Only a verified Trip Admin/);
  await assert.rejects(h.api.issueTeamCode({auth:account(member.uid,member.token.email,false),tripId:'goa-test'}),/verified/);
  await assert.rejects(h.api.issueTeamCode({auth:admin,tripId:'goa-test',role:'admin'}),/Only Main Admin/);
  h.grant(admin,'admin');
  const code=await h.api.issueTeamCode({auth:admin,tripId:'goa-test'});
  assert.match(code.code,/^D4-/);
  const saved=[...h.db.store.keys()].find(k=>k.startsWith('teamJoinCodes/'));
  assert.ok(saved);
  assert.equal(h.db.store.get(saved).code,undefined,'plain code not stored');
});
test('Member code grants verified member and cannot grant admin',async()=>{
  const h=setup();
  const {code}=await h.api.issueTeamCode({auth:main,tripId:'goa-test',role:'member'});
  const result=await h.api.redeemTeamCode({auth:member,code});
  assert.equal(result.tripId,'goa-test');
  assert.equal(result.role,'member');
  assert.deepEqual(h.db.store.get('teamTrips/goa-test/access/member@d4.test'),{role:'member'});
  assert.equal(h.db.store.get('teamTrips/goa-test').revision,1,'existing trip document remains untouched');
});
test('Main Admin code grants admin; member and outsider cannot issue an admin code',async()=>{
  const h=setup();
  const {code}=await h.api.issueTeamCode({auth:main,tripId:'goa-test',role:'admin'});
  assert.equal((await h.api.redeemTeamCode({auth:admin,code})).role,'admin');
  await assert.rejects(h.api.issueTeamCode({auth:member,tripId:'goa-test',role:'admin'}),/Only Main Admin/);
  assert.deepEqual(h.db.store.get('teamTrips/goa-test/access/admin@d4.test'),{role:'admin'});
});
test('single-use code rejects another person and allows idempotent same-account retry',async()=>{
  const h=setup();const {code}=await h.api.issueTeamCode({auth:main,tripId:'goa-test'});
  await h.api.redeemTeamCode({auth:member,code});
  const retry=await h.api.redeemTeamCode({auth:member,code});
  assert.equal(retry.alreadyJoined,true);
  await assert.rejects(h.api.redeemTeamCode({auth:stranger,code}),/already used/);
  h.remove(member);
  await assert.rejects(h.api.redeemTeamCode({auth:member,code}),/access was removed/);
});
test('expired and legacy short device codes fail without write',async()=>{
  const h=setup();const {code}=await h.api.issueTeamCode({auth:main,tripId:'goa-test'});
  h.now(8*24*60*60*1000);
  await assert.rejects(h.api.redeemTeamCode({auth:member,code}),/expired/);
  await assert.rejects(h.api.redeemTeamCode({auth:member,code:'D4GOAP56W'}),/new secure/);
  assert.equal(h.db.store.has('teamTrips/goa-test/access/member@d4.test'),false);
});
test('revoked issuer invalidates unredeemed Member code',async()=>{
  const h=setup();h.grant(admin,'admin');
  const {code}=await h.api.issueTeamCode({auth:admin,tripId:'goa-test'});
  h.remove(admin);
  await assert.rejects(h.api.redeemTeamCode({auth:member,code}),/no longer has access/);
});
test('Member code cannot demote existing Admin',async()=>{
  const h=setup();h.grant(admin,'admin');
  const {code}=await h.api.issueTeamCode({auth:main,tripId:'goa-test'});
  const result=await h.api.redeemTeamCode({auth:admin,code});
  assert.equal(result.role,'admin');
  assert.equal(h.db.store.get('teamTrips/goa-test/access/admin@d4.test').role,'admin');
});
