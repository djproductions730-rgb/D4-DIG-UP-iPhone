import { generatePairCode, createPair, joinPair, existingPairCode, forgetPair, startPairSync } from './pair-sync.mjs';

export function setupPairUI({mode,stores}){
  if(!['digup','lona'].includes(mode))throw Error('Unknown D4 finance app');
  let session=null, connecting=null, provisioning=null, autoAttempted=false, dialog=null, lastStatus='Not paired',lastError='';
  const paired=()=>!!existingPairCode();
  // This app shares the same GitHub Pages origin as DIG UP. When DIG UP
  // records exist in that browser, D47Lona already follows its bank balances
  // and monthly Salary directly via same-origin storage (without Firebase).
  const localDigupLink=()=>{
    if(mode!=='lona')return false;
    try{
      const storage=window.parent!==window ? window.parent.localStorage : localStorage;
      const data=JSON.parse(storage.getItem('d4webv15')||'null');
      return !!data&&Array.isArray(data.banks)&&Array.isArray(data.entries);
    }catch(_){return false}
  };
  const inDigupFrame=()=>{
    try{return mode==='lona'&&window.parent!==window&&new URLSearchParams(location.search).get('embedded')==='1'&&window.parent.location.origin===location.origin}
    catch(_){return false}
  };
  const style=document.createElement('style');
  style.textContent=
    'dialog.d4-pair-dialog{box-sizing:border-box;position:fixed;inset:0;margin:auto;width:min(calc(100vw - 24px),440px);max-width:none;max-height:calc(100dvh - 26px);overflow:auto;border:1px solid #698fc9;border-radius:25px;padding:24px 20px 20px;background:radial-gradient(ellipse at 5% 5%,#22526f,#111f41 52%,#0d1837);box-shadow:0 29px 90px #071020c0;color:#effbff;font:500 14px/1.5 system-ui,-apple-system,sans-serif;color-scheme:dark}'+
    'dialog.d4-pair-dialog::backdrop{background:#06102cc7;backdrop-filter:blur(5px)}.d4-pair-dialog *{box-sizing:border-box}.d4-pair-dialog h2{color:#fff;margin:0 32px 7px 0;letter-spacing:-.5px;font-size:24px;line-height:1.2}'+
    '.d4-pair-dialog .pair-kicker{font-size:11px;color:#8aeadf;letter-spacing:1.5px;font-weight:900;margin:0 0 7px}.d4-pair-dialog p{font-size:13px;color:#c5d7ed;margin:8px 0 13px}'+
    '.d4-pair-dialog .pair-close{position:absolute;right:16px;top:14px;border:1px solid #537da7;width:44px;height:44px;border-radius:15px;color:#fff;background:#24375b;font-size:23px;cursor:pointer}'+
    '.d4-pair-dialog label{font-size:12px;font-weight:800;display:block;margin:14px 0 7px;color:#e5fcff}.d4-pair-dialog textarea{width:100%;min-height:92px;max-height:150px;resize:vertical;border-radius:14px;background:#091830;color:#f2fbff;border:1px solid #5b8cb7;padding:12px;line-height:1.5;font:600 13px ui-monospace,SFMono-Regular,monospace;overflow-wrap:anywhere}'+
    '.d4-pair-dialog .pair-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}.d4-pair-dialog button.pair-primary,.d4-pair-dialog button.pair-secondary,.d4-pair-dialog a.pair-secondary{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:46px;padding:9px 11px;border-radius:13px;font-size:12px;font-weight:800;text-decoration:none;border:1px solid #7198c0;color:#e9f9ff;background:#223c5e;cursor:pointer}'+
    '.d4-pair-dialog button.pair-primary{grid-column:1/-1;background:linear-gradient(104deg,#6df6dc,#a4d9ff);color:#0b2842;border-color:#adfff0;font-size:15px;min-height:52px}.d4-pair-dialog :is(button,textarea):focus-visible{outline:2px solid #87fae9;outline-offset:2px}'+
    '.d4-pair-dialog .pair-message{padding:11px 13px;background:#173d4f;color:#d2ffef;border:1px solid #4c9a9c;border-radius:13px;margin-top:13px;white-space:pre-wrap}.d4-pair-dialog .pair-message.error{background:#52253d;border-color:#e0839f;color:#ffe7f1}'+
    '.d4-pair-dialog .pair-disclaimer{font-size:11px;line-height:1.55;margin:13px 0 0;color:#c7d3e5}.d4-pair-dialog .pair-status{font-size:12px;display:flex;gap:8px;align-items:center;color:#b8f5da;background:#113c45;border:1px solid #3b826e;border-radius:12px;padding:10px}.d4-pair-dialog .pair-status::before{content:"";display:block;width:8px;height:8px;flex:0 0 8px;border-radius:50%;background:#44e5b9}'+
    '.d4-pair-dialog .pair-disconnect{width:100%;min-height:40px;margin-top:13px;background:transparent;border:1px solid #5d6d8b;border-radius:12px;color:#d5d9e8;font-weight:700}@media(max-width:375px){.d4-pair-dialog .pair-buttons{grid-template-columns:1fr}.d4-pair-dialog{padding:18px 14px}}';
  document.head.appendChild(style);

  function emit(status,isError=false){
    lastStatus=status;lastError=isError?status:'';
    window.dispatchEvent(new CustomEvent('d4-pair-status',{detail:{paired:paired(),status,error:isError}}));
    if(dialog)updateStatus();
  }
  function updateStatus(){
    const box=dialog.querySelector('[data-pair-status]'),issue=dialog.querySelector('[data-pair-message]');
    box.textContent=(localDigupLink()?'Same-browser DIG UP linked · ':'')+(paired()?'Code saved · ':'No Pair Code · ')+lastStatus;
    issue.textContent=lastError;issue.hidden=!lastError;issue.classList.toggle('error',!!lastError);
    dialog.querySelector('[data-pair-forget]').hidden=!paired();
    const field=dialog.querySelector('textarea');
    if(mode==='digup'){
      field.value=existingPairCode();
      dialog.querySelector('[data-pair-main]').textContent=paired()?'Copy Pair Code':autoAttempted?'Retry Code Creation':'Preparing Pair Code…';
    }else{
      // The code is an access secret; once saved, never display it again in a
      // public screenshot just to show connection status.
      if(paired())field.value='';
      dialog.querySelector('[data-pair-main]').textContent=paired()?'Code saved · check sync status':'Pair Once · Enable Auto-sync';
      dialog.querySelector('[data-pair-main]').disabled=paired();
      dialog.querySelector('[data-pair-helper]').textContent=paired()?'Retry Connection':'Paste from Clipboard';
    }
  }
  function show(){
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='d4-pair-dialog';
      dialog.setAttribute('aria-label','D4 Auto-sync Pairing');
      dialog.innerHTML=[
       '<button type="button" class="pair-close" data-pair-close aria-label="Close pairing">×</button>',
       '<div class="pair-kicker">D4 · PRIVATE LINK</div>',
       '<h2>One-Time Pairing · Auto-sync</h2>',
       '<p>',mode==='digup'?'இந்த screen திறந்தவுடனே Pair Code தானாக உருவாகும். Copy பண்ணி D47Lona-வில் ஒருமுறை Paste செய்தால், backend இணைந்ததும் auto-sync தொடரும்.':'DIG UP-ல் தானாக உருவான Pair Code-ஐ இங்கே ஒரே தடவை Paste பண்ணு. அதன் பிறகு code மீண்டும் போட தேவையில்லை.','</p>',
       '<div class="pair-status" data-pair-status></div>',
       '<label for="d4-pair-code">',mode==='digup'?'Your private Pair Code':'Paste DIG UP Pair Code','</label>',
       '<textarea id="d4-pair-code" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" ',
       mode==='digup'?'readonly':'',' placeholder="',mode==='digup'?'Your code is being created…':'Paste the code copied from DIG UP','"></textarea>',
       '<div class="pair-message" data-pair-message role="status" aria-live="polite" hidden></div>',
       '<div class="pair-buttons">',
       '<button type="button" class="pair-primary" data-pair-main>',mode==='digup'?'Copy Pair Code':'Pair Once · Enable Auto-sync','</button>',
       '<button type="button" class="pair-secondary" data-pair-helper>',mode==='digup'?'Copy Again':'Paste from Clipboard','</button>',
       '<a class="pair-secondary" href="',mode==='digup'?'./d47lona/':'../','">',mode==='digup'?'Open D47Lona':'Open DIG UP','</a></div>',
       '<button type="button" class="pair-disconnect" data-pair-forget hidden>Disconnect on this device (data stays)</button>',
       '<p class="pair-disclaimer">🔐 No email or password required. Bank and loan data is encrypted before cloud upload. This secret code grants access to your synced finances — do not share it publicly. Same-browser DIG UP balances and Salary work locally without Firebase; cross-device Cloud sync needs internet and Firebase Pairing enabled. Device records remain saved.</p>'
      ].join('');
      document.body.appendChild(dialog);
      dialog.querySelector('[data-pair-close]').addEventListener('click',()=>dialog.close());
      dialog.querySelector('[data-pair-main]').addEventListener('click',()=>void mainAction());
      dialog.querySelector('[data-pair-helper]').addEventListener('click',()=>void helper());
      dialog.querySelector('[data-pair-forget]').addEventListener('click',()=>{
        if(!confirm('Disconnect sync on this device? Your local bank and loan records will stay here.'))return;
        session?.close();session=null;forgetPair();emit('Disconnected');dialog.querySelector('textarea').value='';
        updateStatus();
      });
    }
    updateStatus();if(!dialog.open)dialog.showModal();
    if(mode==='digup'&&!autoAttempted){
      autoAttempted=true;
      try{
        generatePairCode();
        emit('Code generated automatically · registering securely…');
        void provision();
      }catch(error){emit(String(error?.message||'Code generation failed'),true)}
    }
  }
  async function copy(code){
    try{await navigator.clipboard.writeText(code);emit('Code copied · paste once in D47Lona')}
    catch(_){
      const field=dialog.querySelector('textarea');
      field.focus();field.select();field.setSelectionRange(0,field.value.length);
      emit('Select Copy from the iPhone text menu');
    }
  }
  async function helper(){
    if(mode==='lona'&&paired())return connect();
    if(mode==='digup'){
      if(!paired())return mainAction();
      await copy(existingPairCode());return;
    }
    try{
      dialog.querySelector('textarea').value=(await navigator.clipboard.readText()).trim();
      emit('Clipboard pasted · tap Pair Once');
    }catch(_){emit('Tap and hold in the box, then choose Paste')}
  }
  async function connect(){
    if(connecting)return connecting;
    // The embedded Lona is already linked to its parent DIG UP by
    // same-origin storage. Avoid a second Firebase login and the misleading
    // red error screen while preserving parent DIG UP's cloud connection.
    if(inDigupFrame()&&localDigupLink()){
      session?.close();session=null;
      emit('Local Auto-sync active · Bank balances and Salary update from DIG UP. Cross-device Cloud sync is separate.');
      return;
    }
    connecting=(async()=>{
      session?.close();session=null;emit('Connecting securely…');
      try{
        session=await startPairSync(stores,statuses=>{
          const msg=statuses.join(' · ');
          emit(msg,statuses.some(x=>/invalid|conflict|unavailable|denied|exceeded|failed|wrong|missing|too large/i.test(x)));
        });
        if(!session)emit('Not paired');
      }catch(e){
        const explanation=String(e?.message||'Connection unavailable');
        if(localDigupLink()){
          emit('Local Auto-sync active · Bank balances and Salary reflect DIG UP. Cloud not connected: '+explanation);
        }else emit('Cloud not connected: '+explanation,true);
      }
      finally{connecting=null}
    })();
    return connecting;
  }
  // Generate locally immediately; cloud setup may still need Anonymous Auth or rules.
  // Reuse the same code on every retry, never silently rotate a finance link.
  async function provision(){
    if(provisioning)return provisioning;
    provisioning=(async()=>{
      try{
        emit('Registering Pair Code with encrypted cloud…');
        await createPair();
        emit('Code registered · connecting auto-sync…');
        await connect();
      }catch(error){emit('Code is ready, but cloud pairing is not active: '+String(error?.message||'Connection unavailable'),true)}
      finally{provisioning=null}
    })();
    return provisioning;
  }
  async function mainAction(){
    const primary=dialog.querySelector('[data-pair-main]');
    primary.disabled=true;
    try{
      if(mode==='digup'){
        const code=generatePairCode();
        // Clipboard writes happen directly from a user tap, not an asynchronous
        // Firebase callback, which is especially important on iPhone Safari.
        await copy(code);
        if(!session)void provision();
      }else{
        await joinPair(dialog.querySelector('textarea').value.trim());
        dialog.querySelector('textarea').value='';
        await connect();
      }
    }catch(e){
      const message=String(e?.message||'Could not pair devices');
      if(localDigupLink())emit('Local DIG UP sync active · Cloud pairing unavailable: '+message);
      else emit(message,true);
    }
    finally{primary.disabled=false;updateStatus()}
  }
  window.addEventListener('open-pair-sync',show);
  document.addEventListener('click',e=>{if(e.target.closest('[data-pair-sync]')){e.preventDefault();show()}});
  const financeLink=new URLSearchParams(location.search).get('finance');
  if(financeLink==='sync'||financeLink==='pair'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});
    else show();
  }
  // For DIG UP retry pending cloud registration on launch; for Lona reconnect.
  if(paired()){
    if(mode==='digup')void provision();
    else void connect();
  }
  window.addEventListener('storage',e=>{
    if(e.key==='d4-pair-link-v1'&&e.newValue&&e.newValue!==e.oldValue){
      if(mode==='digup')void provision();
      else void connect();
    }
    if(e.key==='d4-pair-link-v1'&&!e.newValue){session?.close();session=null;emit('Disconnected')}
  });
  return {open:show,status:()=>lastStatus};
}
