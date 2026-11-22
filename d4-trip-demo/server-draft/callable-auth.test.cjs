'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('callable endpoints never allow body-auth to overwrite Firebase Auth', async()=>{
  const calls=[];
  const exports={};
  const module={exports};
  const stubService=new Proxy({},{
    get(_target,method){
      return async payload=>{
        calls.push({method,payload});
        return {ok:true};
      };
    }
  });
  const modules={
    'firebase-functions/v2/https':{onCall:(_options,callback)=>callback,HttpsError:class HttpsError extends Error{}},
    'firebase-admin/app':{getApps:()=>[{}],initializeApp:()=>({})},
    'firebase-admin/firestore':{getFirestore:()=>({})},
    './service.cjs':{makeService:()=>stubService}
  };
  const src=fs.readFileSync(path.join(__dirname,'index.js'),'utf8');
  const sandbox={require:name=>{
    if(!(name in modules))throw Error('Unexpected dependency: '+name);
    return modules[name];
  },process:{env:{D4_TRIP_MAIN_OWNER_UID:'server-controlled-uid'}},module,exports};
  vm.runInNewContext(src,sandbox,{filename:'server-draft/index.js'});
  const trusted={uid:'trusted-admin',token:{email_verified:true}};
  for(const method of ['createTrip','issueInvite','redeemInvite','changeRole','revokeMember','recordPayment','openDirectChat']){
    await sandbox.exports[method]({
      auth:trusted,
      data:{auth:{uid:'attacker',token:{email_verified:true}},name:'Malicious',memberUid:'victim'}
    });
    const payload=calls.at(-1).payload;
    assert.equal(payload.auth,trusted,method+' must always receive actual Firebase Auth context');
    assert.equal(calls.at(-1).method,method);
  }
});
