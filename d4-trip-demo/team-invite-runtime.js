/* One-time cross-device join codes for EXISTING teamTrips. Disabled until server is deployed. */
const enabled=window.D4_TRIP_TEAM_CODES_ENABLED===true;
const siteKey=window.D4_TRIP_APP_CHECK_SITE_KEY||'';
let client=null,appCheckStarted=false;
const api={
  get available(){return enabled&&!!siteKey},
  async issue(tripId,role){return call('issueTeamCode',{tripId,role})},
  async redeem(code){return call('redeemTeamCode',{code:String(code||'').trim()})}
};
window.D4TripInvite=api;
async function call(name,data){
  if(!enabled)throw Error('Secure Trip Code joining is not active in this app version. Ask Main Admin for a verified-email invitation link.');
  if(!siteKey)throw Error('Secure invitations are not configured yet. Ask Main Admin to finish Firebase App Check setup.');
  const cloud=window.D4TripCloud,user=cloud?.auth?.currentUser;
  if(!cloud?.ready||!user||user.uid!==cloud.user?.uid)
    throw Error('Open Settings & Profile and sign in to your Firebase account first.');
  if(!user.emailVerified)throw Error('Verify your Firebase email first. Then tap “I verified my email” in Settings.');
  const uid=user.uid;
  if(!client){
    const [appSdk,checkSdk,functionsSdk]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-functions.js')
    ]);
    const app=appSdk.getApp('d4-trip');
    if(!appCheckStarted){
      try{checkSdk.getAppCheck(app);}
      catch{checkSdk.initializeAppCheck(app,{provider:new checkSdk.ReCaptchaV3Provider(siteKey),isTokenAutoRefreshEnabled:true});}
      appCheckStarted=true;
    }
    client={functions: functionsSdk.getFunctions(app,'asia-south2'),callable:functionsSdk.httpsCallable};
  }
  try{
    const response=await client.callable(client.functions,name,{timeout:30000})(data);
    if(window.D4TripCloud?.auth?.currentUser?.uid!==uid)
      throw Error('Account changed while joining. Sign in again.');
    return response.data;
  }catch(error){
    const code=String(error?.code||'');
    if(code.includes('not-found'))throw Error('Invite service is not deployed yet. Ask Main Admin to finish setup.');
    if(code.includes('unavailable')||code.includes('deadline-exceeded'))
      throw Error('Could not reach Firebase. Check internet and retry; your trip data is safe.');
    if(code.includes('unauthenticated'))throw Error('Your login expired. Please sign in again.');
    throw Error(String(error?.message||'Could not verify trip code').slice(0,240));
  }
}
