/**
 * D4 DIG UP — Old Android APK to Brave browser migration bridge.
 *
 * Deploy as a SEPARATE Google Apps Script Web app:
 *   Execute as: Me
 *   Who has access: Anyone (required so the user's email OTP can authenticate).
 *   Project property D4_ORIGINAL_API_URL = EXISTING trusted D4 finance /exec URL
 *
 * This code never grants admin permissions. Users get their OWN account snapshot
 * ONLY after verifying the 6-digit OTP from the original finance backend.
 * No admin account impersonation, hardcoded credentials, backup storage,
 * or access to a different person's data.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Migration')
    .setTitle('D4 DIG UP • Verified Account Migration')
    .addMetaTag('viewport','width=device-width,initial-scale=1');
}
function d4BridgeEmail_(email) {
  const value=String(email||'').trim().toLowerCase();
  if(value.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    throw new Error('Enter a valid account email.');
  return value;
}
function d4BridgeApi_(action,payload) {
  if(action!=='sendOtp' && action!=='verifyOtp')
    throw new Error('Unsupported operation.');
  const url=String(PropertiesService.getScriptProperties()
    .getProperty('D4_ORIGINAL_API_URL')||'').trim();
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url))
    throw new Error('Original D4 DIG UP backend URL is not configured.');
  const result=UrlFetchApp.fetch(url,{
    method:'post',
    contentType:'text/plain; charset=utf-8',
    payload:JSON.stringify({action:action,payload:payload}),
    followRedirects:true,
    muteHttpExceptions:true
  });
  if(result.getResponseCode()>=400)
    throw new Error('Original account server returned an error.');
  const body=result.getContentText();
  if(body.length>2*1024*1024)throw new Error('Account response too large.');
  let parsed;
  try{parsed=JSON.parse(body);}catch(_){throw new Error('Original D4 backend did not return JSON.');}
  if(!parsed || parsed.ok!==true)
    throw new Error(parsed && parsed.error?String(parsed.error).slice(0,180):'Account server rejected request.');
  if(!parsed.data || typeof parsed.data!=='object')
    throw new Error('Account server response is missing data.');
  return parsed.data;
}
function d4BridgeSendOtp(email) {
  const verifiedEmail=d4BridgeEmail_(email);
  const cache=CacheService.getScriptCache();
  const key='mig_'+Utilities.base64EncodeWebSafe(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,verifiedEmail)).slice(0,34);
  if(cache.get(key))throw new Error('OTP was just requested. Check Gmail or try again shortly.');
  cache.put(key,'1',60);
  try{
    d4BridgeApi_('sendOtp',{email:verifiedEmail,name:''});
    return {sent:true,validMinutes:10};
  }catch(error){
    cache.remove(key);throw error;
  }
}
function d4BridgeVerifyOtp(email,otp) {
  const verifiedEmail=d4BridgeEmail_(email);
  const code=String(otp||'').trim();
  if(!/^\d{6}$/.test(code))throw new Error('Enter the 6-digit OTP.');
  const verified=d4BridgeApi_('verifyOtp',{email:verifiedEmail,otp:code});
  // Original Android uses {token, state}; never expose or store token here.
  const state=verified.state;
  if(!state || !state.user)throw new Error('Original account snapshot was not returned.');
  const user=state.user;
  if(String(user.email||'').trim().toLowerCase()!==verifiedEmail)
    throw new Error('The verified account identity does not match.');
  const names=['banks','transactions','plans','loans'];
  names.forEach(n=>{
    if(!Array.isArray(state[n]))throw new Error('Incomplete backend snapshot: '+n);
  });
  const snapshot={
    format:'d4-dig-up-native-backup',
    version:1,
    exportedAt:new Date().toISOString(),
    user:{
      id:String(user.id||''),
      email:verifiedEmail,
      name:String(user.name||'')
    },
    banks:state.banks,
    transactions:state.transactions,
    plans:state.plans,
    loans:state.loans
  };
  const json=JSON.stringify(snapshot);
  if(json.length>1024*1024)throw new Error('Backup exceeds 1 MB; contact app owner for secure export.');
  if(!snapshot.banks.length && !snapshot.transactions.length &&
     !snapshot.plans.length && !snapshot.loans.length)
    throw new Error('This account has zero records in the old database. No empty backup will be exported.');
  return {
    json:json,
    count:{
      banks:snapshot.banks.length,
      transactions:snapshot.transactions.length,
      plans:snapshot.plans.length,
      loans:snapshot.loans.length
    },
    // Identity is displayed only in the verified user's own page.
    userName:snapshot.user.name,
    email:snapshot.user.email
  };
}
