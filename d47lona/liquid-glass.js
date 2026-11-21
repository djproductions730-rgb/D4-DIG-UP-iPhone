/* D47Lona Liquid Glass touch feedback. Visual-only: never reads or changes finances. */
(() => {
 'use strict';
 const reduced=()=>{
  try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){return true}
 };
 function ripple(event){
  if(reduced())return;
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const target=event.target;
  if(!(target instanceof Element))return;
  const host=target.closest('.bank-row,.loan-card,.glass.kpi,.swatch,.button,.mobile-nav button,.icon-btn,.quick');
  if(!host||host.matches(':disabled')||host.closest('.d47-intro-overlay'))return;
  if(host.querySelectorAll('.liquid-tap-ripple').length>1)return;
  const rect=host.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const x=event.clientX-rect.left,y=event.clientY-rect.top;
  const el=document.createElement('span');
  el.className='liquid-tap-ripple';
  el.setAttribute('aria-hidden','true');
  const diameter=Math.max(rect.width,rect.height)*.26;
  el.style.width=Math.min(Math.max(diameter,36),95)+'px';
  el.style.height=el.style.width;
  el.style.left=x+'px';el.style.top=y+'px';
  host.classList.add('liquid-tap-host');
  host.appendChild(el);
  const cleanup=()=>{el.remove();if(!host.querySelector('.liquid-tap-ripple'))host.classList.remove('liquid-tap-host')};
  el.addEventListener('animationend',cleanup,{once:true});
  setTimeout(cleanup,800);
 }
 document.addEventListener('pointerdown',ripple,{passive:true});
})();
