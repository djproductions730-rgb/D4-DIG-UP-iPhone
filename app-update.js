'use strict';
(function(){
 const revision=Number(document.querySelector('meta[name="d4-app-revision"]')?.content)||1;
 const base=new URL('./',document.baseURI),badge=document.createElement('button');
 let available=null,busy=false,checking=null,offline=false;
 function pending(latest,installed){return latest&&Number.isSafeInteger(latest.revision)?Math.max(0,latest.revision-installed):0}
 function validVersion(value){return value&&value.schema===1&&Number.isSafeInteger(value.revision)&&value.revision>0&&typeof value.build==='string'&&/^[a-zA-Z0-9-]{7,80}$/.test(value.build)}
 function message(){const n=pending(available,revision);return busy?'Updating app…':n?n+' update'+(n===1?'':'s')+' available':offline?'Connect to the internet to check for updates':available?'Your app is up to date · Version '+revision:'Checking for updates…'}
 function status(text){document.querySelectorAll('[data-app-update-status]').forEach(node=>node.textContent=text||message())}
 function paint(){const n=pending(available,revision);badge.hidden=tab!=='home'||loggedOut||n===0;badge.disabled=busy;badge.querySelector('b').textContent=String(n);badge.setAttribute('aria-label',n+' updates available. Update my app');badge.title=n+' updates available';document.querySelectorAll('[data-update-my-app]').forEach(button=>{button.disabled=busy;button.textContent=busy?'Updating…':'↑ Update my app'});status()}
 async function network(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Update download failed');return response}finally{clearTimeout(timer)}}
 async function latest(){const url=new URL('app-version.json',base);url.searchParams.set('check',String(Date.now()));const value=await (await network(url)).json();if(!validVersion(value))throw Error('Invalid app version');available=value;offline=false;paint();return value}
 async function check(){if(checking)return checking;checking=latest().catch(()=>{offline=true;paint();return null}).finally(()=>checking=null);return checking}
 window.updateMyApp=async function(){if(busy)return;busy=true;paint();try{
  const target=await latest();
  if(pending(target,revision)===0){status('Your app is up to date · Version '+revision);return;}
  const url=new URL('index.html',base);url.searchParams.set('d4update',target.build);
  const source=await (await network(url)).text(),doc=new DOMParser().parseFromString(source,'text/html');
  const downloaded=Number(doc.querySelector('meta[name="d4-app-revision"]')?.content);
  if(!Number.isSafeInteger(downloaded)||downloaded<target.revision)throw Error('The new version is still publishing. Try again shortly.');
  // Download the versioned code and styles before leaving the current app.
  const assets=[...doc.querySelectorAll('script[src],link[rel="stylesheet"][href]')].map(node=>new URL(node.getAttribute('src')||node.getAttribute('href'),url)).filter(asset=>asset.origin===base.origin);
  await Promise.all(assets.map(asset=>network(asset)));
  if('serviceWorker'in navigator){try{const registration=await navigator.serviceWorker.getRegistration(base.href);if(registration)await registration.update()}catch{}}
  try{sessionStorage.setItem('d4-update-request',String(target.revision))}catch{}
  location.assign(url.href);
 }catch(error){offline=!navigator.onLine;const detail=error.message==='The new version is still publishing. Try again shortly.'?error.message:'Could not download the update. Check your connection and try again.';status(detail);const toast=document.createElement('div');toast.className='d4-update-toast';toast.setAttribute('role','status');toast.textContent=detail;document.body.append(toast);setTimeout(()=>toast.remove(),5000);}finally{busy=false;document.querySelectorAll('[data-update-my-app]').forEach(button=>{button.disabled=false;button.textContent='↑ Update my app'});badge.disabled=false}}
 badge.type='button';badge.className='app-update-prompt';badge.hidden=true;badge.innerHTML='<span aria-hidden="true">↑</span><b aria-hidden="true">0</b>';badge.onclick=()=>updateMyApp();document.querySelector('.app>header').append(badge);
 const previousSettings=settings;
 settings=function(){const section='<h2>App updates</h2><section class="app-update-card"><div><span class="app-update-symbol" aria-hidden="true">↑</span><div><strong>Keep DIG UP updated</strong><p data-app-update-status role="status">'+tidy(message())+'</p></div></div><button type="button" class="button" data-update-my-app onclick="updateMyApp()">↑ Update my app</button></section>';return previousSettings().replace('<h2>App access</h2>',section+'<h2>App access</h2>')};
 const previousRender=render;render=function(){previousRender();paint()};
 render();check();
 setInterval(()=>{if(!document.hidden&&!busy)check()},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)check()});window.addEventListener('online',()=>{if(!busy)check()});
 try{const applied=Number(sessionStorage.getItem('d4-update-request'));if(applied&&revision>=applied){sessionStorage.removeItem('d4-update-request');setTimeout(()=>{if(!loggedOut){const toast=document.createElement('div');toast.className='d4-update-toast';toast.setAttribute('role','status');toast.textContent='✓ D4 DIG UP updated successfully';document.body.append(toast);setTimeout(()=>toast.remove(),3500)}},300)}}catch{}
})();
