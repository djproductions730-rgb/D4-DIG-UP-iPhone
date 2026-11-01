const CACHE = 'd4-iphone-verified-migration-v3';
const ASSETS = ['./','./index.html','./loans.js','./migration.js','./manifest.webmanifest','./icon.svg'];
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