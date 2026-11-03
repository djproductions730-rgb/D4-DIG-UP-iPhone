'use strict';
// Deploy separately only after production security review.
// D4_TRIP_MAIN_OWNER_UID must be configured in the trusted Functions runtime.
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {makeService}=require('./service.cjs');
if(!getApps().length)initializeApp();
const service=makeService(getFirestore(),{
  mainOwnerUid:process.env.D4_TRIP_MAIN_OWNER_UID
});
const options={region:'asia-south2',enforceAppCheck:true,maxInstances:10};
function endpoint(method){
  return onCall(options,async request=>{
    try{
      return await service[method]({auth:request.auth,...request.data});
    }catch(error){
      const message=String(error?.message||'Request failed').slice(0,220);
      const denied=/only|access denied|verified|unauthori|revoke this user|cannot open chat|inactive/i.test(message);
      const missing=/not found|not available/i.test(message);
      throw new HttpsError(denied?'permission-denied':missing?'not-found':'invalid-argument',message);
    }
  });
}
exports.createTrip=endpoint('createTrip');
exports.issueInvite=endpoint('issueInvite');
exports.redeemInvite=endpoint('redeemInvite');
exports.changeRole=endpoint('changeRole');
exports.revokeMember=endpoint('revokeMember');
exports.recordPayment=endpoint('recordPayment');
exports.openDirectChat=endpoint('openDirectChat');
