/* D4 Trip PWA install assistant v38.
 * Android/desktop native prompt when offered by the browser.
 * iPhone/iPad: platform-correct manual Add to Home Screen instructions.
 * Never pretends to have installed the app or to bypass iOS Safari.
 */
(function(){
  'use strict';
  let deferredInstall=null;
  let installed=false;
  try{
    installed=(window.matchMedia?.('(display-mode: standalone)')?.matches===true)
      ||(navigator.standalone===true);
  }catch(_){}

  function button(variant){
    if(installed)return '';
    const compact=variant==='header';
    return '<button type="button" class="d4-install-button'+(compact?' d4-install-compact':'')+'" data-d4-install="1" aria-label="Install D4 Trip on Home Screen">'+
      '<span class="d4-install-symbol" aria-hidden="true">⬇</span><span>'+(compact?'Install':'Install App')+'</span></button>';
  }

  // Wrap the existing renderers rather than rebuilding navigation or authentication.
  const previousTopBar=topBar;
  topBar=function(){
    const original=previousTopBar();
    return installed?original:original.replace('<div class="top-actions">','<div class="top-actions">'+button('header'));
  };
  const previousEntryPage=entryPage;
  entryPage=function(){
    const body=previousEntryPage();
    return installed?body:'<section class="d4-install-entry" aria-label="Install D4 Trip">'+
      button('entry')+'<span>Keep D4 Trip on your phone Home Screen.</span></section>'+body;
  };
  const previousHome=home;
  home=function(){
    const body=previousHome();
    return installed?body:body+'<section class="d4-install-card" aria-label="Install D4 Trip on your phone">'+
      '<div class="d4-install-art" aria-hidden="true">📱</div>'+
      '<div><strong>D4 Trip on your Home Screen</strong><p>Open your trips like an app — no app store needed.</p></div>'+
      button('home')+'</section>';
  };
  const previousProfilePage=profilePage;
  profilePage=function(){
    const body=previousProfilePage();
    return installed?body:'<section class="d4-install-card" aria-label="Install D4 Trip">'+
      '<div class="d4-install-art" aria-hidden="true">📲</div>'+
      '<div><strong>Install D4 Trip</strong><p>Get a Home Screen icon on iPhone or Android.</p></div>'+
      button('settings')+'</section>'+body;
  };

  function isIOS(){
    const agent=String(navigator.userAgent||'');
    return /iPhone|iPad|iPod/i.test(agent)||
      (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  }

  function showInstructions(){
    document.querySelector('#d4-install-overlay')?.remove();
    const ios=isIOS();
    const safari=ios&&/Safari/i.test(navigator.userAgent||'')&&!/(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(navigator.userAgent||'');
    const heading=ios?'Add D4 Trip to iPhone Home Screen':'Install D4 Trip';
    const steps=ios?
      (safari?[
        '1. Tap the Safari Page Menu (or Share icon).',
        '2. Tap Share, then choose Add to Home Screen.',
        '3. Keep Open as Web App enabled and tap Add.'
      ]:[
        '1. Open this same D4 Trip link in Safari.',
        '2. Tap the Safari Page Menu, then Share.',
        '3. Choose Add to Home Screen, turn on Open as Web App, and tap Add.'
      ]):
      [
        '1. Open this page in Chrome or Edge.',
        '2. Tap the browser menu (⋮), then Install app or Add to Home screen.',
        '3. Confirm Install or Add.'
      ];
    const modal=document.createElement('div');
    modal.id='d4-install-overlay';
    modal.className='d4-install-backdrop';
    modal.innerHTML='<section class="d4-install-dialog" role="dialog" aria-modal="true" aria-labelledby="d4-install-title">'+
      '<div class="d4-install-dialog-top"><div class="d4-install-dialog-icon" aria-hidden="true">📲</div>'+
      '<button type="button" class="d4-install-close" data-d4-install-close="1" aria-label="Close instructions">✕</button></div>'+
      '<h2 id="d4-install-title">'+heading+'</h2>'+
      '<p>'+(ios?'Apple requires you to confirm Add to Home Screen from Safari. A website button cannot install automatically on iPhone.':'If your browser does not show an install popup yet, use its menu to install.')+'</p>'+
      '<ol class="d4-install-steps">'+steps.map(step=>'<li>'+step+'</li>').join('')+'</ol>'+
      '<div class="d4-install-dialog-actions">'+
      '<button type="button" class="d4-install-copy" data-d4-install-copy="1">Copy this trip link</button>'+
      '<button type="button" class="d4-install-done" data-d4-install-close="1">Got it</button></div>'+
      '<small>Installed icon: D4 Trip. Your trip access still requires the usual sign-in or approval.</small></section>';
    document.body.appendChild(modal);
    modal.querySelector('.d4-install-close')?.focus({preventScroll:true});
  }

  function updateButtons(){
    if(!installed)return;
    document.querySelectorAll('[data-d4-install]').forEach(node=>{node.hidden=true});
  }

  window.addEventListener('beforeinstallprompt',function(event){
    event.preventDefault();
    deferredInstall=event;
  });
  window.addEventListener('appinstalled',function(){
    installed=true;
    deferredInstall=null;
    document.querySelector('#d4-install-overlay')?.remove();
    updateButtons();
  });
  document.addEventListener('click',function(event){
    const trigger=event.target.closest('[data-d4-install]');
    if(trigger){
      event.preventDefault();
      event.stopPropagation();
      if(installed){
        updateButtons();
        return;
      }
      if(deferredInstall){
        const nativePrompt=deferredInstall;
        deferredInstall=null;
        try{
          // Must be called from the user's click gesture, before awaiting.
          nativePrompt.prompt();
          Promise.resolve(nativePrompt.userChoice).then(result=>{
            if(result?.outcome==='dismissed')showInstructions();
            // Do not claim success until appinstalled actually fires.
          }).catch(()=>showInstructions());
        }catch(_){showInstructions()}
      }else{
        showInstructions();
      }
      return;
    }
    if(event.target.closest('[data-d4-install-close]')){
      event.preventDefault();
      document.querySelector('#d4-install-overlay')?.remove();
      return;
    }
    if(event.target.id==='d4-install-overlay'){
      event.target.remove();
      return;
    }
    if(event.target.closest('[data-d4-install-copy]')){
      event.preventDefault();
      const link=location.href;
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(link).then(()=>{
          const el=document.querySelector('[data-d4-install-copy]');
          if(el)el.textContent='Link copied ✓';
        }).catch(()=>window.prompt?.('Copy this link into Safari',link));
      }else{window.prompt?.('Copy this link into Safari',link)}
    }
  },true);
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape')document.querySelector('#d4-install-overlay')?.remove();
  });
  window.D4TripInstall={isInstalled:()=>installed,hasPrompt:()=>!!deferredInstall,showInstructions};

  // The core app renders before this bridge is loaded; refresh once to show controls.
  if(typeof render==='function')render();
})();
