import { mergeLedger } from './merge.mjs';
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js';
import * as authSdk from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import * as fire from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

// A 256-bit, unguessable capability links the two apps. Financial records are
// encrypted before upload. Knowing the link code grants access to that link;
// never show it publicly or embed it in a URL.
const FIREBASE_CONFIG = {
  apiKey:'AIzaSyA62m1oJeJxN9yLVyPhiGF_ziIwmvmZLGA',
  authDomain:'d4-finance-sync.firebaseapp.com',
  projectId:'d4-finance-sync',
  appId:'1:409652875790:web:319b0eeffb367f0a7aa25f'
};
const APP_NAME='d4-finance-sync';
const LINK_KEY='d4-pair-link-v1';
const PREFIX='D4LINK1.';
const MAX_PACKED_LENGTH=890000;
const te=new TextEncoder(), td=new TextDecoder();
const app=getApps().find(v=>v.name===APP_NAME)||initializeApp(FIREBASE_CONFIG,APP_NAME);
const auth=authSdk.getAuth(app), db=fire.getFirestore(app);
const bytesToB64=bytes=>{
  let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(out).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const b64ToBytes=str=>{
  if(!/^[A-Za-z0-9_-]+$/.test(str))throw Error('Pairing code has invalid characters.');
  const norm=str.replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(norm+'='.repeat((4-norm.length%4)%4));
  return Uint8Array.from(raw,x=>x.charCodeAt(0));
};
const hex=bytes=>[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
async function sha(buffer){return new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))}
function parseCode(code){
  // Replace only accidental spacing. URL-safe '-' is valid and must not be rewritten.
  const actual=String(code||'').replace(/\s/g,'');
  if(!actual.startsWith(PREFIX))throw Error('Use the code from DIG UP → Copy Pair Code.');
  const secret=b64ToBytes(actual.slice(PREFIX.length));
  if(secret.byteLength!==32||actual.length>75)throw Error('Pairing code is incomplete. Copy it again.');
  return {code:actual,secret};
}
async function identity(code){
  const parsed=parseCode(code);
  const id=hex(await sha(te.encode('D4LINK1:ID:'+bytesToB64(parsed.secret))));
  const keyBytes=await sha(te.encode('D4LINK1:AES:'+bytesToB64(parsed.secret)));
  const key=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
  return {code:parsed.code,id,key};
}
async function ensureAnonymous(){
  await auth.authStateReady();
  if(auth.currentUser)return auth.currentUser;
  try{return (await authSdk.signInAnonymously(auth)).user}
  catch(error){
    if(error.code==='auth/operation-not-allowed')throw Error('Firebase Anonymous sign-in is disabled. Enable Anonymous in Firebase Authentication.');
    if(error.code==='auth/unauthorized-domain')throw Error('Add this GitHub Pages domain to Firebase Authentication authorized domains.');
    throw Error('Could not connect to Firebase. Check the internet and Anonymous sign-in setup.');
  }
}
const pairDoc=id=>fire.doc(db,'financePairs',id);
const ledgerDoc=(id,name)=>fire.doc(db,'financePairs',id,'ledgers',name);
async function compress(raw){
  if(typeof CompressionStream!=='function')return {mode:'j',bytes:raw};
  const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));
  const zipped=new Uint8Array(await new Response(stream).arrayBuffer());
  return zipped.length<raw.length?{mode:'g',bytes:zipped}:{mode:'j',bytes:raw};
}
async function inflate(bytes,mode){
  if(mode==='j')return bytes;
  if(mode!=='g'||typeof DecompressionStream!=='function')throw Error('Update Safari to read encrypted sync records.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const raw=new Uint8Array(await new Response(stream).arrayBuffer());
  if(raw.length>1500000)throw Error('Synced data is too large to decode safely.');
  return raw;
}
async function encrypt(identity,ledger,value){
  const raw=te.encode(JSON.stringify(value));
  if(raw.length>1500000)throw Error('Finance ledger is too large for this sync service; download a backup.');
  const packed=await compress(raw);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const aad=te.encode(identity.id+':'+ledger);
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},identity.key,packed.bytes));
  const result=packed.mode+'.'+bytesToB64(iv)+'.'+bytesToB64(encrypted);
  if(result.length>MAX_PACKED_LENGTH)throw Error('Finance ledger exceeded cloud storage limits. Device data remains intact.');
  return result;
}
async function decrypt(identity,ledger,packet){
  const parts=String(packet||'').split('.');
  if(parts.length!==3||!['g','j'].includes(parts[0])||packet.length>MAX_PACKED_LENGTH)throw Error('Invalid encrypted cloud record.');
  const iv=b64ToBytes(parts[1]),cipher=b64ToBytes(parts[2]);
  if(iv.length!==12||cipher.length>MAX_PACKED_LENGTH)throw Error('Encrypted record is invalid.');
  let output;
  try{output=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:te.encode(identity.id+':'+ledger)},identity.key,cipher)}
  catch(_){throw Error('Could not unlock the cloud record. The pairing code may be wrong.')}
  const original=await inflate(new Uint8Array(output),parts[0]);
  return JSON.parse(td.decode(original));
}
function readableError(error){
  const code=String(error?.code||''),message=String(error?.message||'');
  if(code==='permission-denied'||code==='firestore/permission-denied')return 'Firebase rules do not allow secure pairing yet. Deploy finance-sync/firestore.rules.';
  if(code==='unavailable'||code==='firestore/unavailable')return 'Cloud connection unavailable. Your local records are unchanged.';
  if(message)return message;
  return 'Cloud pairing could not connect.';
}
function getStored(){try{return localStorage.getItem(LINK_KEY)||''}catch(_){return ''}}
export function existingPairCode(){return getStored()}
function saveCode(code){
  try{localStorage.setItem(LINK_KEY,code)}catch(_){throw Error('Browser storage is blocked. Enable it before pairing.')}
}
export function forgetPair(){localStorage.removeItem(LINK_KEY)}
export async function createPair(){
  if(getStored())return getStored();
  const code=PREFIX+bytesToB64(crypto.getRandomValues(new Uint8Array(32)));
  const current=await identity(code);
  await ensureAnonymous();
  try{
    await fire.setDoc(pairDoc(current.id),{version:1,createdAt:fire.serverTimestamp()});
  }catch(e){throw Error(readableError(e))}
  saveCode(code);
  return code;
}
export async function joinPair(code){
  const current=await identity(code);
  await ensureAnonymous();
  let meta;
  try{meta=await fire.getDocFromServer(pairDoc(current.id))}
  catch(e){throw Error(readableError(e))}
  if(!meta.exists())throw Error('Pairing code not found. First create it in DIG UP.');
  if(meta.data()?.version!==1)throw Error('Unsupported pairing code. Generate a new one in DIG UP.');
  const old=getStored();
  if(old&&old!==current.code)throw Error('This device is already paired. Disconnect the old link before changing it.');
  saveCode(current.code);
  return current.code;
}
function load(key){
  try{return JSON.parse(localStorage.getItem(key)||'null')}catch(_){return null}
}
function validData(name,data){
  if(!data||typeof data!=='object'||Array.isArray(data))return false;
  if(name==='digup')return Array.isArray(data.banks)&&Array.isArray(data.entries);
  return data.version===1&&Array.isArray(data.banks)&&Array.isArray(data.loans)&&Array.isArray(data.ledger);
}
function pristine(name,v){
  if(!validData(name,v))return true;
  if(name==='digup')return v.banks.length===0&&v.entries.length===0&&
    (!v.loans||v.loans.length===0)&&(!v.plans||v.plans.length===0)&&(!v.savings||v.savings.length===0);
  const defaultNames=new Set(['hdfc bank','axis bank']);
  return v.loans.length===0&&v.ledger.length===0&&
    (!v.salaries||!Object.keys(v.salaries).length)&&!(Number(v.salary)>0)&&
    v.banks.length<=2&&v.banks.every(b=>defaultNames.has(String(b.name||'').trim().toLowerCase())&&Number(b.balance)===0&&!b.reserved);
}
function eq(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function empty(name){return name==='digup'
  ? {banks:[],entries:[],loans:[],plans:[],savings:[]}
  : {version:1,banks:[],loans:[],ledger:[],salaries:{}}}

export async function startPairSync(stores,onStatus=()=>{}){
  const code=getStored();
  if(!code)return null;
  const ident=await identity(code);
  await ensureAnonymous();
  let meta;
  try{meta=await fire.getDocFromServer(pairDoc(ident.id))}
  catch(e){throw Error(readableError(e))}
  if(!meta.exists())throw Error('Paired cloud record missing. Generate a new code in DIG UP.');

  const channels=[];
  let closed=false;
  const report=()=>onStatus(channels.map(x=>x.status));
  for(const store of stores){
    const {name,key,readOnly=false,apply=()=>{}}=store;
    if(!['digup','lona'].includes(name))throw Error('Invalid finance ledger name.');
    const doc=ledgerDoc(ident.id,name);
    const baseKey='d4-pair-base:'+ident.id+':'+name+':'+key;
    let base=load(baseKey),observed=null,busy=false,stopped=false;
    const channel={status:'Connecting…',close:null,reconcile:null};
    const setStatus=value=>{if(channel.status!==value){channel.status=value;report()}};
    const onRemote=async snapshot=>{
      if(stopped||closed||snapshot.metadata.hasPendingWrites||snapshot.metadata.fromCache)return;
      if(!snapshot.exists()){
        if(observed&&observed.revision>0)return;
        observed={revision:0,value:null};
      }else{
        const raw=snapshot.data();
        if(!Number.isSafeInteger(raw.revision)||raw.revision<1||typeof raw.packet!=='string'){setStatus('Invalid cloud record. Local data safe.');return}
        if(observed&&raw.revision<observed.revision)return;
        try{
          const value=await decrypt(ident,name,raw.packet);
          if(observed&&raw.revision<observed.revision)return;
          observed={revision:raw.revision,value};
        }catch(e){setStatus(readableError(e));return}
      }
      await channel.reconcile();
    };
    const unsub=fire.onSnapshot(doc,{includeMetadataChanges:true},onRemote,e=>setStatus(readableError(e)));
    channel.reconcile=async()=>{
      if(stopped||closed||busy||observed===null)return;
      busy=true;
      try{
        const snapshot=observed;
        const local=load(key),remote=snapshot.value;
        if(remote!==null&&!validData(name,remote))throw Error('Cloud data format invalid. Device records protected.');
        if(readOnly){
          if(remote===null){setStatus('Waiting for DIG UP to publish its records…');return}
          if(!eq(local,remote)){
            localStorage.setItem(key,JSON.stringify(remote));
            apply();
          }
          setStatus('Synced · DIG UP changes received');
          return;
        }
        if(local!==null&&!validData(name,local))throw Error('Local data format invalid. Nothing uploaded.');
        let target;
        if(remote===null)target=local;
        else if(local===null||pristine(name,local))target=remote;
        else if(pristine(name,remote))target=local;
        else if(eq(local,remote))target=remote;
        else if(base?.value!==undefined)target=mergeLedger(base.value,local,remote);
        else target=mergeLedger(empty(name),local,remote);

        if(target===null){setStatus('Waiting for local records');return}
        if(!validData(name,target))throw Error('Ledger data invalid. Local and cloud copies unchanged.');
        if(!eq(target,remote)){
          const packed=await encrypt(ident,name,target);
          const result=await fire.runTransaction(db,async tx=>{
            const current=await tx.get(doc);
            const rev=current.exists()?Number(current.data().revision):0;
            if(rev!==snapshot.revision)return false;
            tx.set(doc,{revision:rev+1,packet:packed});
            return true;
          });
          if(!result){setStatus('Checking newest cloud revision…');return}
        }
        if(!stopped&&!closed){
          base={value:target};
          localStorage.setItem(baseKey,JSON.stringify(base));
          if(!eq(load(key),target)&&eq(load(key),local)){
            localStorage.setItem(key,JSON.stringify(target));
            apply();
          }
          setStatus('Synced · Auto updates on');
        }
      }catch(e){
        const m=String(e?.message||'');
        setStatus(m.startsWith('Both devices changed')?'Conflicting edits · Both copies kept. Export backups before resolving.':readableError(e));
      }finally{busy=false}
    };
    channel.close=()=>{stopped=true;unsub()};
    channels.push(channel);
  }
  const tick=()=>channels.forEach(ch=>void ch.reconcile());
  const timer=setInterval(tick,3000);
  window.addEventListener('storage',tick);
  window.addEventListener('online',tick);
  window.addEventListener('focus',tick);
  document.addEventListener('visibilitychange',tick);
  report();
  return {
    status:()=>channels.map(x=>x.status),
    close:()=>{
      closed=true;clearInterval(timer);
      window.removeEventListener('storage',tick);
      window.removeEventListener('online',tick);
      window.removeEventListener('focus',tick);
      document.removeEventListener('visibilitychange',tick);
      channels.forEach(ch=>ch.close());
    }
  };
}
