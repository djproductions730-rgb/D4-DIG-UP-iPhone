/* D47Lona intro engine: UI-only visual preferences, never financial records. */
(() => {
 'use strict';
 const SESSION_KEY='d47lona-intro-seen-v1',DATA_KEY='d47lona-crystal-v1';
 const allowed=['crystal','emi','vault'];
 const scene={
  crystal:{name:'Crystal Assemble',subtitle:'Your money. Your control.',note:'Finance clarity begins here.',
    symbol:'<path d="m8 24 12 12 26-26"/>',view:'0 0 54 54'},
  emi:{name:'EMI Journey',subtitle:'Every EMI, one step forward.',note:'Track your progress with confidence.',
    symbol:'<rect x="6" y="12" width="42" height="37" rx="6"/><path d="M6 22h42M17 6v12M37 6v12M17 36l8 8 13-15"/>',view:'0 0 54 54'},
  vault:{name:'Loan Unlock',subtitle:'A clear path to freedom.',note:'See every milestone ahead.',
    symbol:'<rect x="11" y="24" width="33" height="27" rx="5"/><path d="M18 24v-8a10 10 0 0 1 20 0M27 35v7"/>',view:'0 0 54 54'}
 };
 let active=null,stopTimer=null,removeTimer=null;
 function reduced(){try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return false}}
 function chosen(){
  try{const value=JSON.parse(localStorage.getItem(DATA_KEY)||'null')?.introStyle;return allowed.includes(value)?value:'crystal'}
  catch(_){return 'crystal'}
 }
 function hide(immediate=false){
  clearTimeout(stopTimer);clearTimeout(removeTimer);
  if(!active)return;
  const el=active;active=null;
  if(immediate){el.remove();return}
  el.classList.add('is-ending');
  removeTimer=setTimeout(()=>el.remove(),320);
 }
 function play(style){
  if(reduced())return false;
  hide(true);
  const kind=allowed.includes(style)?style:chosen(),x=scene[kind];
  const layer=document.createElement('div');
  layer.className='d47-intro-overlay intro-'+kind;
  layer.setAttribute('role','dialog');
  layer.setAttribute('aria-label','D47Lona '+x.name+' opening animation');
  layer.setAttribute('aria-modal','true');
  layer.innerHTML='<button type="button" class="d47-intro-skip" aria-label="Skip opening animation">Skip</button>'
   +'<div class="d47-intro-stage"><div class="d47-intro-ring" aria-hidden="true"></div>'
   +'<div class="d47-intro-badge" aria-hidden="true"><div class="d47-intro-parts"><span></span><span></span><span></span><span></span></div>'
   +'<div class="d47-scan"></div><b>D4<em>7</em></b><div class="d47-intro-symbol">'
   +'<svg viewBox="'+x.view+'" aria-hidden="true">'+x.symbol+'</svg></div></div>'
   +'<div class="d47-intro-logo">D47<span>Lona</span></div>'
   +'<div class="d47-intro-kicker">'+x.subtitle+'</div>'
   +'<div class="d47-intro-bar" aria-hidden="true"></div>'
   +'<p class="d47-intro-note">'+x.note+'</p></div>';
  document.body.appendChild(layer);active=layer;
  layer.querySelector('.d47-intro-skip').addEventListener('click',()=>hide());
  stopTimer=setTimeout(()=>hide(),3550);
  return true
 }
 function boot(){
  if(reduced())return;
  try{if(sessionStorage.getItem(SESSION_KEY))return;sessionStorage.setItem(SESSION_KEY,'1')}catch(_){}
  setTimeout(()=>play(chosen()),60)
 }
 window.D47Intro={play,hide,chosen};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
