const CACHE='d4-trip-app-v29-goa-milestones';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192-v28.png','./icon-512-v28.png','./icon-maskable-v28.png','./apple-touch-icon-v28.png','./night.css','./fjord.webp','./summit.webp','./dunes.webp','./firebase-config.js','./firebase-sync.js?build=27','./team-sync.js?build=27','./team-join.js?build=27','./team-invite-runtime.js?build=27','./premium-production.css?build=28','./goa-milestones.js?build=28','./premium-production.js?build=27','./shared-beta.js','./shared-runtime.js?build=27','./intro.css','./trip-intro.js','./intro-logo.svg'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k.startsWith('d4-trip-app-')&&k!==CACHE).map(k=>caches.delete(k))
  )));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});
