const CACHE='d4-trip-app-v12-liquid-right-rail';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./night.css','./fjord.webp','./summit.webp','./dunes.webp','./firebase-config.js','./firebase-sync.js','./team-sync.js','./team-join.js','./team-invite-runtime.js','./premium-production.css','./premium-production.js','./shared-beta.js','./shared-runtime.js','./intro.css','./trip-intro.js','./intro-logo.svg'];
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
