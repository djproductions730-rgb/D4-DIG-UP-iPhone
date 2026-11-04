'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'shared-beta.js'),'utf8');
function harness(enabled=true){
  const records=new Map(),calls=[];
  const uid='alice123';
  const auth={uid,emailVerified:true};
  let viewed=0;
  const win={
    D4_TRIP_SHARED_ROLLOUT:enabled,
    D4TripCloud:{auth:{currentUser:auth},user:auth},
    D4TripLocal:{render(){viewed++;},view(){return 'profile';}},
    document:{addEventListener(){}},
    localStorage:{
      getItem:key=>records.has(key)?records.get(key):null,
      setItem:(key,value)=>records.set(key,value)
    }
  };
  vm.runInNewContext(src,{window:win,FormData:function(){}});
  return {
    beta:win.D4TripShared,win,records,calls,
    setAdapter(adapter){win.D4TripShared.setAdapter(adapter);},
    get renders(){return viewed;}
  };
}
test('secure group beta is disabled by default, even when an adapter is offered',async()=>{
  const h=harness(false);
  h.setAdapter({call:()=>{throw Error('must not be called');}});
  assert.match(h.beta.panel(),/Integration preview/);
  assert.match(h.beta.panel(),/shared groups are OFF|Real multi-account sharing is OFF/i);
  assert.doesNotMatch(h.beta.panel(),/data-d4-shared-form/);
  await assert.rejects(h.beta.submit('create',{name:'Goa',targetAmount:'8000'}),/not live/);
});

test('a verified Firebase user can redeem once and retains only a UID-scoped trip reference',async()=>{
  const h=harness();
  h.setAdapter({call:async(name,payload)=>{
    h.calls.push({name,payload});
    return {tripId:'goaTrip123'};
  }});
  const code='A'.repeat(32);
  await h.beta.submit('join',{code,displayName:'Alice'});
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].name,'redeemInvite');
  assert.equal(h.calls[0].payload.code,code);
  assert.equal(h.calls[0].payload.displayName,'Alice');
  const saved=JSON.parse(h.records.get('d4_trip_shared_refs_v1_alice123'));
  assert.deepEqual(saved,['goaTrip123']);
  assert.match(h.beta.panel(),/goaTrip123/);
  assert.doesNotMatch(h.records.get('d4_trip_shared_refs_v1_alice123'),/A{24}/);
});

test('invalid inputs, absent verification and absent adapter prevent writes',async()=>{
  const h=harness();
  const adapter={call:async()=>{h.calls.push(1);return {tripId:'goaTrip123'}}};
  await assert.rejects(h.beta.submit('join',{code:'short',displayName:'Alice'}),/not live/);
  h.setAdapter(adapter);
  await assert.rejects(h.beta.submit('join',{code:'short',displayName:'Alice'}),/invalid/);
  await assert.rejects(h.beta.submit('create',{name:'Goa',targetAmount:'100.999'}),/target/);
  h.win.D4TripCloud.auth.currentUser.emailVerified=false;
  await assert.rejects(h.beta.submit('create',{name:'Goa',targetAmount:'100'}),/Verified/);
  assert.equal(h.calls.length,0);
});

test('responses from previous UID session cannot store a foreign trip',async()=>{
  const h=harness();
  let resolve;
  const blocked=new Promise(r=>{resolve=r;});
  h.setAdapter({call:()=>blocked});
  const req=h.beta.submit('create',{name:'Goa 2026',destination:'Goa',targetAmount:'8000'});
  h.win.D4TripCloud.auth.currentUser={uid:'bob123',emailVerified:true};
  h.win.D4TripCloud.user=h.win.D4TripCloud.auth.currentUser;
  h.beta.resetSession();
  resolve({tripId:'goaTrip123'});
  await assert.rejects(req,/Account changed/);
  assert.equal(h.records.size,0);
  assert.equal(h.beta.status.details,null);
});

test('server data used for preview is escaped and cannot execute HTML',async()=>{
  const h=harness();
  h.setAdapter({
    call:async()=>({tripId:'goaTrip123'}),
    getTrip:async()=>({name:'<img src=x onerror=alert(1)>',destination:'Goa'})
  });
  await h.beta.submit('create',{name:'Goa 2026',destination:'Goa',targetAmount:'8000.25'});
  await h.beta.open('goaTrip123');
  const panel=h.beta.panel();
  assert.match(panel,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(panel,/<img src=x onerror/);
});

test('trip references are isolated between Firebase account UIDs',async()=>{
  const h=harness();
  h.setAdapter({call:async()=>({tripId:'goaTrip123'})});
  await h.beta.submit('create',{name:'Goa Group',targetAmount:'8000'});
  h.win.D4TripCloud.auth.currentUser={uid:'bob123',emailVerified:true};
  h.win.D4TripCloud.user=h.win.D4TripCloud.auth.currentUser;
  h.beta.resetSession();
  assert.doesNotMatch(h.beta.panel(),/goaTrip123/);
  await assert.rejects(h.beta.open('goaTrip123'),/No saved trip reference/);
});
