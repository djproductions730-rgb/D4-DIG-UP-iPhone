'use strict';
// Real Chromium smoke tests, exercising rendered screens in desktop and phone-sized viewports.
// Runs against local static server and never contacts a live Firebase database.
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASE='http://127.0.0.1:8765/';
const seed = {
  version:1,
  trips:[{
    id:'m3-browser-smoke',name:'D4 Browser Test',destination:'Goa',
    start:'2026-11-10',end:'2026-11-12',kind:'goa',emoji:'🏝️',
    code:'D4TEST2026',members:['Admin','A',...Array.from({length:15},(_v,i)=>'Member '+String(i+3).padStart(2,'0'))],admins:['Admin'],
    collection:{targetPerPerson:8000,payments:[]},
    plans:[],expenses:[],settlementsPaid:[],reminders:[],notes:[],
    files:[],memories:[],chats:{admins:[],group:[]}
  }]
};
async function smoke(browser,label,viewport,mobile) {
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
  await context.route(/https:\/\/(?:firestore|identitytoolkit|securetoken)\.googleapis\.com\//,route=>route.abort());
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.addInitScript(dataset=>{
    if(!localStorage.getItem('d4_trip_offline_v2'))
      localStorage.setItem('d4_trip_offline_v2',JSON.stringify(dataset));
    localStorage.setItem('d4_trip_offline_profile_v2','Admin');
    sessionStorage.setItem('d4_trip_cinema_seen_v1','1');
  },seed);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  const capture=async suffix=>{
    fs.mkdirSync(path.join(__dirname,'preview'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'preview',label+'-'+suffix+'.png'),animations:'disabled'});
  };
  await page.locator('[data-action="entry-select-trip"][data-id="m3-browser-smoke"]').click();
  await page.locator('#d4-payment-roster').waitFor({state:'visible'});
  const count=await page.locator('#d4-payment-roster [data-roster-card]').count();
  assert.equal(count,17,label+' all seeded trip members must appear');
  assert.match(await page.locator('#d4-payment-roster').innerText(),/Member Payment Status/);
  assert.match(await page.locator('#d4-payment-roster').innerText(),/Admin/);
  assert.match(await page.locator('#d4-payment-roster').innerText(),/\bA\b/);
  assert.equal(await page.locator('#d4-payment-roster [data-roster-group="unpaid"] [data-roster-card]').count(),17,
    label+' every member initially unpaid');
  const scroll=await page.locator('#d4-payment-roster [data-roster-scroll]').evaluate(el=>{
    const style=getComputedStyle(el);return {overflow:style.overflowY,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};
  });
  assert.ok(['auto','scroll'].includes(scroll.overflow),label+' member list must scroll independently, found '+JSON.stringify(scroll));
  assert.ok(scroll.scrollHeight>scroll.clientHeight+100,label+' 17-member roster must genuinely overflow vertically');
  await capture('payment-status-before');
  // Record a real payment via existing app's modal, verify the financial totals update.
  await page.locator('[data-action="collection-quick-add"]').first().click();
  await page.locator('#f_member').selectOption('A');
  await page.locator('#f_paymentStage').selectOption('advance');
  await page.locator('#f_amount').fill('3000');
  await page.locator('#activeForm button[type="submit"]').click();
  await page.locator('#d4-payment-roster').waitFor({state:'visible'});
  let data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].collection.payments.length,1);
  assert.equal(data.trips[0].collection.payments[0].amount,3000);
  assert.equal(await page.locator('#d4-payment-roster [data-roster-group="partial"] [data-roster-card]').count(),1);
  // Admin corrects A's total paid, preserving the original receipt in the history.
  await page.locator('#d4-payment-roster [data-action="collection-member-total"][data-member="A"]').click();
  await page.locator('#f_amount').fill('8000');
  await page.locator('#activeForm button[type="submit"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].collection.payments.length,2,label+' correction keeps original payment');
  assert.equal(data.trips[0].collection.payments[1].amount,5000,label+' correction is a delta');
  assert.equal(await page.locator('#d4-payment-roster [data-roster-group="paid"] [data-roster-card]').count(),1);
  await page.locator('#d4-payment-roster [data-roster-filter="paid"]').click();
  assert.equal(await page.locator('#d4-payment-roster [data-roster-card]:visible').count(),1);
  await page.locator('#d4-payment-roster [data-roster-filter="all"]').click();
  await capture('payments-paid-and-unpaid');
  // Go to the same trip Overview; verify nine premium Trip Sections.
  await page.locator('.ref-bottom-nav [data-action="open-tab"][data-ctx="overview"]').click();
  const sections=page.locator('.ref-trip-sections');
  await sections.waitFor({state:'visible'});
  assert.equal(await sections.locator('.ref-sections-grid button').count(),9);
  assert.equal(await sections.locator('.ref-section-icon svg').count(),9);
  assert.equal(await page.locator('.ref-bottom-nav .ref-nav-item').count(),4);
  assert.equal(await page.locator('.ref-nav-plus').count(),1);
  const frame=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:innerWidth,
    nav:document.querySelector('.ref-bottom-nav')?.getBoundingClientRect().toJSON()
  }));
  assert.ok(frame.width<=frame.viewport+3,label+' no horizontal page crop');
  assert.ok(frame.nav?.left>=-2&&frame.nav?.right<=frame.viewport+2,label+' bottom nav fits viewport');
  await capture('premium-overview');
  await sections.locator('summary').first().click();
  assert.equal(await sections.getAttribute('open'),null,label+' Hide collapses Trip Sections');
  await sections.locator('summary').first().click();
  assert.notEqual(await sections.getAttribute('open'),null,label+' Show reopens Trip Sections');
  await sections.locator('.ref-sections-grid [data-ctx="plan"]').click();
  await page.locator('.ref-day-control').waitFor({state:'visible'});
  assert.match(await page.locator('.ref-day-count').innerText(),/3/);
  await capture('day-plan-before');
  // + Day and - Day only touch the end of the trip and preserve payment data.
  await page.locator('[data-trip-day-action="add"]').click();
  assert.equal(await page.locator('.ref-day-count>b').innerText(),'4');
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].end,'2026-11-13');
  await page.locator('[data-trip-day-action="remove"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].end,'2026-11-12');
  assert.equal(data.trips[0].collection.payments.length,2);
  // Shift a selected date and verify that the calendar remains consecutive.
  const paymentDate=data.trips[0].collection.payments[0].date;
  await page.locator('#ref-selected-day-date').fill('2026-11-14');
  await page.locator('[data-trip-day-action="shift"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].start,'2026-11-12');
  assert.equal(data.trips[0].end,'2026-11-14');
  assert.equal(data.trips[0].collection.payments[0].date,paymentDate,label+' payment history unchanged');
  await capture('date-control-updated');
  // The native Install App CTA is exposed without ever falsely claiming installation.
  assert.ok(await page.locator('[data-d4-install="1"]').count()>0,label+' install button appears');
  await page.evaluate(()=>window.D4TripInstall.showInstructions());
  assert.equal(await page.locator('#d4-install-overlay').count(),1,label+' install fallback shows instructions');
  await page.locator('[data-d4-install-close]').first().click();
  assert.equal(await page.locator('#d4-install-overlay').count(),0);
  assert.deepEqual(pageErrors.filter(e=>!/Firebase|Failed to fetch|network/i.test(e)),[],
    label+' has no unrelated JavaScript runtime errors');
  await context.close();
  console.log('PASS '+label+' paid/unpaid, corrections, nine tiles, calendar +/-/edit, install CTA');
}

async function joinByNameLinkFlow(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*googleapis.com/*',route=>route.abort());
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(dataset=>{
    localStorage.setItem('d4_trip_offline_v2',JSON.stringify(dataset));
    localStorage.setItem('d4_trip_offline_profile_v2','Visitor');
    sessionStorage.setItem('d4_trip_cinema_seen_v1','1');
  },seed);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('[data-modal="join-trip"]').count(),0,'Old code join is hidden');
  await page.locator('#d4-save-join-name').waitFor();
  assert.equal(await page.locator('#d4-open-trip-link').count(),0,'Link step not shown until name submitted');
  await page.locator('#d4-guest-name-input').fill('Visitor Name');
  assert.equal(await page.evaluate(()=>localStorage.getItem('d4_trip_guest_name_v1')),'Visitor Name','Name saved locally as typed');
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#d4-guest-name-input').inputValue(),'Visitor Name','Name persists across page reload');
  await page.locator('#d4-save-join-name button[type="submit"]').click();
  await page.locator('#d4-open-trip-link').waitFor();
  assert.match(await page.locator('#d4-invite-link-card').innerText(),/Name saved:[\s\S]*Paste Trip Link[\s\S]*Continue with the Link/);
  const url=new URL(BASE);
  url.searchParams.set('team','m3-browser-smoke');
  await page.locator('#d4-trip-link-input').fill(url.href);
  // Simulate an asynchronous Firebase listener refresh on iOS Safari.
  await page.evaluate(()=>window.D4TripLocal.render());
  assert.equal(await page.locator('#d4-trip-link-input').inputValue(),url.href,
    'Pasted trip link must survive an app re-render before submission');
  // Register navigation detection before the click to avoid WebKit event races.
  try {
    await Promise.all([
      page.waitForURL(/\?team=m3-browser-smoke/,{waitUntil:'commit',timeout:12000}),
      page.locator('#d4-open-trip-link button[type="submit"]').click()
    ]);
  } catch (error) {
    const state=await page.evaluate(()=>({
      url:location.href,
      input:document.querySelector('#d4-trip-link-input')?.value,
      inputValid:document.querySelector('#d4-trip-link-input')?.checkValidity(),
      formValid:document.querySelector('#d4-open-trip-link')?.checkValidity(),
      formText:document.querySelector('#d4-open-trip-link')?.innerText,
      toast:document.querySelector('.toast')?.textContent,
      name:localStorage.getItem('d4_trip_guest_name_v1'),
      stage:sessionStorage.getItem('d4_trip_guest_join_stage_v1')
    })).catch(e=>({diagnosticError:e.message}));
    console.error('Join by Name/Link WebKit diagnosis',JSON.stringify({state,errors}));
    throw error;
  }
  assert.equal(new URL(page.url()).searchParams.get('team'),'m3-browser-smoke');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('d4_trip_join_name_v1_m3-browser-smoke')),'Visitor Name','Name handed to join request within same tab');
  assert.equal(new URL(page.url()).searchParams.has('name'),false,'Name not exposed in URL');
  assert.ok(await page.evaluate(()=>!!localStorage.getItem('d4_trip_offline_v2')),'Existing local trip backup preserved');
  assert.deepEqual(errors.filter(e=>!/Firebase|Failed to fetch|network/i.test(e)),[],'Name/link entry without unrelated runtime error');
  await context.close();
  console.log('PASS name submit -> link -> approval handoff without code join or data loss');
}
async function firstVisitIntro(browser) {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.locator('#d4Intro').waitFor({state:'visible'});
  assert.equal(await page.locator('#d4Intro img[src="./intro-logo.svg"]').count(),1);
  await page.locator('[data-d4-intro-skip]').click();
  await page.locator('#d4Intro').waitFor({state:'hidden'});
  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#d4Intro').isVisible(),false,
    'intro must run once per tab session');
  assert.deepEqual(errors,[],'fresh first-visit intro has no runtime errors');
  await context.close();
  const reduced = await browser.newContext({reducedMotion:'reduce'});
  const reducedPage=await reduced.newPage();
  await reducedPage.goto(BASE,{waitUntil:'domcontentloaded'});
  assert.equal(await reducedPage.locator('#d4Intro').isVisible(),false,
    'reduced motion preference disables automatic animation');
  await reduced.close();
  console.log('PASS intro first-open / session repeat / reduced-motion');
}

(async()=>{
  const engine=process.env.D4_BROWSER||'chromium';
  const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
  try{
    await smoke(browser,engine+'-desktop',{width:1280,height:800},false);
    await smoke(browser,engine+'-mobile',{width:390,height:844},true);
    await smoke(browser,engine+'-small-phone',{width:360,height:780},true);
    await firstVisitIntro(browser);
    await joinByNameLinkFlow(browser);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
