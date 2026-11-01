const CACHE = 'd4-iphone-plan-dials-history-v6';
const ASSETS = ['./','./index.html','./loans.js','./migration.js','./settings.js','./transaction-edit.js','./history-filters.js','./plans-budget.js','./assets/avatar-01.png','./assets/avatar-02.png','./assets/avatar-03.png','./assets/avatar-04.png','./assets/avatar-05.png','./assets/avatar-06.png','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k.startsWith('d4-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response => {
    if(response.ok && ASSETS.some(a=>new URL(a,self.registration.scope).href===event.request.url)){
      const clone=response.clone();
      event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,clone)));
    }
    return response;
  }).catch(()=>caches.match(event.request)));
});