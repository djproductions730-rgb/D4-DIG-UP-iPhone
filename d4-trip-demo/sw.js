const CACHE='d4-trip-app-v71-premium-icons';
const ASSETS=['./manifest-turquoise.webmanifest?build=71','./manifest-ocean.webmanifest?build=71','./manifest-sunset.webmanifest?build=71','./manifest-rose.webmanifest?build=71','./manifest-midnight.webmanifest?build=71','./icons/turquoise.svg','./icon-picker.css?build=71','./icon-picker.js?build=71','./icons/turquoise-premium-v71-180.png','./icons/turquoise-premium-v71-192.png','./icons/turquoise-premium-v71-512.png','./icons/ocean-premium-v71-180.png','./icons/ocean-premium-v71-192.png','./icons/ocean-premium-v71-512.png','./icons/sunset-premium-v71-180.png','./icons/sunset-premium-v71-192.png','./icons/sunset-premium-v71-512.png','./icons/rose-premium-v71-180.png','./icons/rose-premium-v71-192.png','./icons/rose-premium-v71-512.png','./icons/midnight-premium-v71-180.png','./icons/midnight-premium-v71-192.png','./icons/midnight-premium-v71-512.png','./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192-v28.png','./icon-512-v28.png','./icon-maskable-v28.png','./apple-touch-icon-v28.png','./night.css','./fjord.webp','./summit.webp','./dunes.webp','./firebase-config.js','./firebase-sync.js?build=27','./team-sync.js?build=30','./team-join.js?build=27','./team-invite-runtime.js?build=27','./premium-production.css?build=45','./obsidian-luxe.css?build=34','./reference-premium.css?build=41','./install-app.css?build=38','./goa-milestones.js?build=29','./premium-production.js?build=45','./reference-premium.js?build=60','./install-app.js?build=38','./payment-roster.css?build=40','./trip-day-controls.js?build=40','./trip-day-controls.css?build=40','./home-circular-luxe.css?build=60','./journey-completion.css?build=43','./journey-completion.js?build=45','./milestone-day1.svg','./milestone-day2.svg','./milestone-day3.svg','./shared-beta.js','./shared-runtime.js?build=27','./modern-card-pdf.js?build=46','./modern-card-pdf.css?build=46','./report-readability.css?build=46','./goa-payment-v50.css?build=50','./goa-train-v51.css?build=51','./goa-train-v53.css?build=53','./intro.css','./trip-intro.js','./intro-logo.svg'];
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
