const CACHE = 'd4-iphone-right-menu-v16';
const ASSETS = ['./assets/brands/pluxee-logo.png','./assets/brands/pluxee-symbol.png','./navigation-ui.css?v=right-menu-3','./navigation-ui.js?v=right-menu-3','./','./index.html','./assets/savings-portraits.css','./loans.js','./migration.js?v=bankless-import-10','./settings.js','./transaction-edit.js?v=family-art-8','./history-filters.js?v=family-art-8','./plans-budget.js?v=plan-history-7','./assets/avatar-01.png','./assets/avatar-02.png','./assets/avatar-03.png','./assets/avatar-04.png','./assets/avatar-05.png','./assets/avatar-06.png','./category-style.js?v=internet-allowance-9','./bank-logos.js?v=family-art-8','./assets/categories/food.png','./assets/categories/family.png','./assets/categories/petrol.png','./assets/categories/movies.png','./assets/categories/shopping.png','./assets/categories/travel.png','./assets/categories/bills.png','./assets/categories/love.png','./assets/categories/other.png','./assets/categories/brother.png','./assets/categories/sister.png','./assets/banks/hdfc.ico','./assets/banks/axis.ico','./assets/banks/icici.ico','./assets/banks/sbi.ico','./assets/banks/indian.png','./assets/banks/canara.png','./assets/banks/kotak.ico','./assets/banks/idfc.ico','./assets/banks/pnb.ico','./assets/banks/baroda.png','./assets/banks/union.png','./assets/banks/boi.png','./assets/banks/iob.png','./assets/banks/uco.png','./assets/banks/maharashtra.png','./assets/banks/punjabsind.png','./assets/banks/indusind.ico','./assets/banks/yes.png','./assets/banks/rbl.png','./assets/banks/bandhan.png','./assets/banks/dcb.ico','./assets/banks/cityunion.svg','./assets/banks/tmb.png','./assets/banks/southindian.png','./assets/banks/karnataka.svg','./assets/banks/csb.png','./assets/banks/jk.png','./assets/banks/nainital.png','./assets/banks/dhanlaxmi.png','./assets/banks/au.png','./assets/banks/equitas.png','./assets/banks/ujjivan.ico','./assets/banks/utkarsh.png','./assets/banks/suryoday.png','./assets/banks/esaf.png','./assets/banks/jana.jpg','./assets/banks/shivalik.png','./assets/banks/capital.png','./assets/banks/airtel.png','./assets/banks/ippb.png','./assets/banks/fino.svg','./assets/banks/jio.ico','./manifest.webmanifest','./icon.svg'];
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


