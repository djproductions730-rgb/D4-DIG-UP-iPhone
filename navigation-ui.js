'use strict';
(function(){
 const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 banks:'<path d="m3 8 9-5 9 5M3 9h18M5 10v8m7-8v8m7-8v8M3 21h18M3 18h18"/>',
 transactions:'<path d="M4 7h15l-4-4M20 17H5l4 4"/><path d="M19 7v5M5 17v-5"/>',
 plans:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5"/>',
 savings:'<path d="M12 21v-9M12 15C4 15 3 9 4 5c6 0 9 3 8 10Zm0-3c0-6 4-9 9-9 0 6-3 9-9 9Z"/>',
 loans:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 12h18m-11-2h4v4h-4z"/>',
 settings:'<path d="m9 3-.5 3-2 1-2.8-1-2 3.5L4 12l-2.3 2.5 2 3.5 2.8-1 2 1 .5 3h4l.5-3 2-1 2.8 1 2-3.5L18 12l2.3-2.5-2-3.5-2.8 1-2-1-.5-3Z"/><circle cx="11" cy="12" r="3"/>',
 pluxee:'<rect x="2" y="5" width="20" height="15" rx="5"/><path d="M8 16V9h4a3 3 0 0 1 0 6h-4"/><path d="m17 3 2-2m1 4 3-1" stroke="#ff647d"/>'
 };
 const colors={home:'#6e5bf0',banks:'#397ddc',transactions:'#d35f9d',plans:'#bc8126',savings:'#258d75',loans:'#9771d5',pluxee:'#e24770',settings:'#657993'};
 function symbol(id){if(id==='pluxee')return '<img class="pluxee-original-symbol" src="./assets/brands/pluxee-symbol.png" alt="" width="25" height="25">';return '<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[id]+'</svg>';}
 const nav=document.getElementById('nav');
 nav.classList.add('icon-rail');nav.setAttribute('aria-label','Main sections');
 const toggle=document.createElement('button');toggle.type='button';toggle.id='sectionMenu';toggle.className='section-menu';toggle.setAttribute('aria-label','Expand section menu');toggle.setAttribute('aria-controls','nav');toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h11M4 18h16"/></svg>';
 document.querySelector('.app>header').prepend(toggle);
 toggle.hidden=true;const shade=document.createElement('button');shade.className='menu-shade';shade.type='button';shade.hidden=true;shade.setAttribute('aria-label','Close section menu');document.body.append(shade);
 function setExpanded(open){document.body.classList.toggle('section-menu-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Collapse section menu':'Expand section menu');shade.hidden=!open;}
 toggle.onclick=()=>setExpanded(toggle.getAttribute('aria-expanded')!=='true');shade.onclick=()=>{setExpanded(false);toggle.focus()};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setExpanded(false);toggle.focus()}});
 nav.addEventListener('click',event=>{if(event.target.closest('[data-tab]'))setExpanded(false);if(event.target.closest('[data-d4-more]')){event.preventDefault();openD4MoreMenu()}});
 const previousRender=render;
 render=function(){previousRender();toggle.hidden=true;nav.hidden=loggedOut;if(loggedOut){setExpanded(false);return;}
  nav.innerHTML=[['home','Home'],['banks','Banks'],['transactions','Transactions'],['plans','Plans'],['savings','Savings'],['more','More']].map(([id,label])=>{const active=id===tab||(id==='more'&&['loans','pluxee','settings'].includes(tab));return '<button type="button" class="navbtn '+(active?'active':'')+'" style="--section-color:'+(colors[id]||'#a43bf1')+'" '+(id==='more'?'data-d4-more="1"':'data-tab="'+id+'"')+' title="'+label+'" aria-label="'+label+'"'+(active?' aria-current="page"':'')+'><span class="rail-symbol">'+(id==='more'?'<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>':symbol(id))+'</span><span class="rail-label">'+label+'</span></button>'}).join('');
  document.querySelector('.app>header .subtitle').textContent=tabs.find(([id])=>id===tab)?.[2]||'Your finance buddy';
  const pluxeeHeading=tab==='pluxee'?document.querySelector('.pxhero h2'):document.querySelector('.px-home-balances button span');
  if(pluxeeHeading)pluxeeHeading.insertAdjacentHTML('afterbegin','<span class="pluxee-brand-symbol">'+symbol('pluxee')+'</span>');
  if(tab==='pluxee'||tab==='banks'){const heading=document.querySelector('.pxhero h2');if(heading)heading.innerHTML='<span class="pluxee-original-wordmark"><img src="./assets/brands/pluxee-logo.png" alt="Pluxee" width="158" height="30"></span>'; }
  // Keep the frequent entry actions; every section remains available in the rail.
  if(tab==='home')document.querySelectorAll('.quick-tile[data-quick]').forEach(button=>{button.hidden=!['pluxee-to-money','expense','online-shopping','income','transfer','pluxee-credit','pluxee-spend'].includes(button.dataset.quick)});
  document.querySelectorAll('.quick-tile[data-quick="pluxee"],.quick-tile[data-quick="pluxee-credit"],.quick-tile[data-quick="pluxee-spend"]').forEach(button=>{const icon=button.querySelector('.quick-icon');if(icon)icon.innerHTML=symbol('pluxee')+'<span class="pluxee-action-direction" aria-hidden="true">'+(button.dataset.quick==='pluxee-credit'?'＋':'−')+'</span>'});
 };
 render();
})();


