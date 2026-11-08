'use strict';
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({headless:true});
const context=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('JS '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
page.on('requestfailed',r=>errors.push('HTTPFAIL '+r.url()+' '+r.failure()?.errorText));
try{
 const u='https://d4-trip.web.app/?v=40&diagnostic=1';
 const http=await context.request.get(u,{timeout:25000});
 const html=await http.text();
 console.log('LIVE_HTTP',JSON.stringify({status:http.status(),length:html.length,containsRef:html.includes('reference-premium.js?build=37'),containsStyles:html.includes('reference-premium.css?build=37'),containsV40:html.includes('trip-day-controls.js?build=40')}));
 for(const n of ['premium-production.js?build=33','goa-milestones.js?build=29','reference-premium.js?build=37','reference-premium.css?build=37','sw.js?build=40']){
   const r=await context.request.get('https://d4-trip.web.app/'+n,{timeout:20000});
   const body=await r.text();
   console.log('LIVE_ASSET',JSON.stringify({n,status:r.status(),size:body.length,hasRef:n.includes('reference-premium.js')?body.includes('tripOverview=function'):undefined}));
 }
 await page.goto(u,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForTimeout(3000);
 const snap=await page.evaluate(()=>({
  body:document.body.className,
  scripts:[...document.scripts].map(x=>x.src).filter(x=>x.includes('premium')),
  styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(x=>x.href).filter(x=>x.includes('premium')),
  referenceGrid:document.querySelectorAll('.ref-trip-sections').length,
  legacyGrid:document.querySelectorAll('.d4p-nav-grid:not(.ref-sections-grid)').length,
  rightRail:document.querySelectorAll('.d4-gold-rail').length,
  bottomPremium:document.querySelectorAll('.ref-bottom-nav').length,
  functionTripOverview:typeof tripOverview==='function'?tripOverview.toString().slice(0,220):typeof tripOverview,
  functionBottomNav:typeof bottomNav==='function'?bottomNav.toString().slice(0,220):typeof bottomNav,
  installStatus:typeof window.D4TripInstall,
  mode:location.href,
 }));
 console.log('LIVE_DOM',JSON.stringify(snap));
 console.log('LIVE_ERRORS',JSON.stringify(errors.slice(0,35)));
 const assert=require('node:assert/strict');
 assert.equal(http.status(),200,'Live page must be reachable');
 assert.equal(html.includes('reference-premium.js?build=41'),true,'Live root must load fresh premium JS');
 assert.equal(html.includes('reference-premium.css?build=41'),true,'Live root must load fresh premium CSS');
 assert.equal(html.includes('trip-day-controls.js?build=40'),true,'Live root must load day controls');
 assert.equal(snap.installStatus,'object','Install App feature must be active');
 assert.match(snap.functionTripOverview,/tripSections|memberAmountPanel/,'Premium overview wrapper must be the actual running function');
 assert.match(snap.functionBottomNav,/ref-bottom-nav/,'Premium bottom navigation must be actual running function');
 assert.equal(snap.styles.some(x=>x.includes('reference-premium.css?build=41')),true,'Gold visual stylesheet must be active');
 assert.deepEqual(errors.filter(x=>/SyntaxError|ReferenceError|text\/html|Unexpected token|Failed to load resource/i.test(x)),[],
   'No blocking script errors');
 console.log('PASS LIVE RUNTIME v40: premium trip sections, bottom navigation, install action, and style loaded');
 await page.screenshot({path:'live-probe.png',fullPage:false});
}finally{await b.close();}
})().catch(e=>{console.error('PROBE_FATAL',e.stack);process.exitCode=1});
