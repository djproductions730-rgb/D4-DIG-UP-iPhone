'use strict';
// Separate Functions codebase. NO production functions deployment without approval.
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {makeTeamInviteService}=require('./service.cjs');
if(!getApps().length)initializeApp();
const service=makeTeamInviteService(getFirestore(),{mainOwnerUid:process.env.D4_TRIP_MAIN_OWNER_UID});
const options={region:'asia-south2',enforceAppCheck:true,maxInstances:10,timeoutSeconds:30};
const endpoint=name=>onCall(options,async request=>{
  try{return await service[name]({auth:request.auth,...(request.data||{})});}
  catch(error){
    const msg=String(error?.message||'Unable to complete invitation').slice(0,240);
    const denied=/only|verified|access|authorized|removed/i.test(msg);
    throw new HttpsError(denied?'permission-denied':'failed-precondition',msg);
  }
});
exports.issueTeamCode=endpoint('issueTeamCode');
exports.redeemTeamCode=endpoint('redeemTeamCode');
