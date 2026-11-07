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
    code:'D4TEST2026',members:['Admin','A'],admins:['Admin'],
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
  await page.addInitScript(dataset=>{
    if(!localStorage.getItem('d4_trip_offline_v2'))
      localStorage.setItem('d4_trip_offline_v2',JSON.stringify(dataset));
    localStorage.setItem('d4_trip_offline_profile_v2','Admin');
    // Keep existing app smoke tests deterministic; intro is checked via explicit Replay.
    sessionStorage.setItem('d4_trip_cinema_seen_v1','1');
  },seed);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  fs.mkdirSync(path.join(__dirname,'preview'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'preview',label+'-premium-explore.png'),animations:'disabled'});
  await page.locator('[data-action="entry-select-trip"][data-id="m3-browser-smoke"]').click();
  await page.locator('.compact-collection').waitFor();
  async function payment(amount,stage){
    await page.locator('[data-action="collection-quick-add"]').first().click();
    await page.locator('#f_member').selectOption('A');
    await page.locator('#f_paymentStage').selectOption(stage);
    await page.locator('#f_amount').fill(String(amount));
    await page.locator('#activeForm button[type="submit"]').click();
    await page.locator('.compact-collection').waitFor();
  }
  await payment(3000,'advance');
  let data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].collection.payments.length,1,label+' advance saved');
  assert.equal(data.trips[0].collection.payments[0].amount,3000);
  assert.match(data.trips[0].collection.payments[0].note,/ADVANCE/);
  assert.match(await page.locator('.d4-payment-counts').innerText(),/Partial 1/);
  await payment(5000,'balance');
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].collection.payments.length,2);
  assert.equal(data.trips[0].collection.payments[1].amount,5000);
  assert.match(await page.locator('.d4-payment-counts').innerText(),/Paid 1/);
  assert.match(await page.locator('.d4-payment-counts').innerText(),/Unpaid 1/);
  await page.evaluate(()=>document.querySelector('.toast')?.classList.remove('show'));
  await page.screenshot({path:path.join(__dirname,'preview',label+'-premium-scoreboard.png'),animations:'disabled'});
  await page.locator('[data-action="collection-members"]').click();
  assert.match(await page.locator('.cc-popup-total').innerText(),/Paid 1/);
  assert.ok(await page.locator('.cc-popup-back').isVisible(),label+' popup header Back visible');
  assert.ok(await page.locator('.cc-popup-return').isVisible(),label+' popup footer Back visible');
  const paymentTiles=await page.locator('.cc-member-tile').evaluateAll(tiles=>tiles.map(tile=>{
    const card=tile.getBoundingClientRect();
    const detail=tile.querySelector('.cc-tile-money')?.getBoundingClientRect();
    const amounts=[...tile.querySelectorAll('.cc-tile-amount b')].map(el=>el.getBoundingClientRect());
    return {card:{left:card.left,right:card.right},detail:detail&&{left:detail.left,right:detail.right},
      amounts:amounts.map(a=>({left:a.left,right:a.right}))};
  }));
  assert.ok(paymentTiles.length>0,label+' payment cards visible');
  for(const tile of paymentTiles){
    for(const rect of [tile.detail,...tile.amounts]){
      assert.ok(rect&&rect.left>=tile.card.left-2&&rect.right<=tile.card.right+2,
        label+' clipped payment text: '+JSON.stringify({tile,rect}));
    }
  }
  await page.screenshot({path:path.join(__dirname,'preview',label+'-premium-payment-popup.png'),animations:'disabled'});
  await page.locator('.cc-popup-return').click();
  assert.equal(await page.locator('.cc-popup').count(),0,label+' popup Back closes it');
  await page.locator('[data-action="enter-selected-trip"]').first().click();
  const navGrid=page.locator('.d4p-nav-grid');
  await navGrid.waitFor();
  const layout=await page.evaluate(()=>{
    const shell=document.querySelector('.app-shell')?.getBoundingClientRect();
    const main=document.querySelector('.app-shell>.main')?.getBoundingClientRect();
    const rail=document.querySelector('.d4-liquid-rail')?.getBoundingClientRect();
    return {viewport:innerWidth,shellX:shell?.x,shellW:shell?.width,
      mainW:main?.width,railX:rail?.x,railW:rail?.width,
      scrollWidth:document.documentElement.scrollWidth};
  });
  assert.ok(Math.abs(layout.shellX)<=1,label+' shell must start at screen edge');
  assert.ok(Math.abs(layout.shellW-layout.viewport)<=2,label+' full-width app shell');
  // Approved design: main content reserves room for the right-side compact rail.
  assert.ok(layout.mainW>=layout.viewport-145 && layout.mainW<layout.viewport,
    label+' main panel reserves sidebar width');
  assert.ok(layout.railW>=58 && layout.railX>=0 &&
    layout.railX+layout.railW<=layout.viewport+1,label+' right rail visible inside viewport');
  assert.equal(await page.locator('.d4p-bottom:visible').count(),0,label+' no bottom navigation');
  assert.ok(layout.scrollWidth<=layout.viewport+2,label+' no sideways page scroll');
  const scrollCheck=await page.evaluate(()=>{
    const main=document.querySelector('.app-shell>.main');
    const initial=window.scrollY;
    const maxScroll=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    window.scrollTo(0,maxScroll);
    return {maxScroll,actual:window.scrollY,overflow:getComputedStyle(main).overflowY};
  });
  assert.ok(scrollCheck.overflow!=='hidden',label+' main content must allow vertical scrolling');
  if(scrollCheck.maxScroll>20)assert.ok(scrollCheck.actual>5,label+' vertical page scroll works');
  await page.evaluate(()=>window.scrollTo(0,0));

  assert.equal(await navGrid.locator('button').count(),9,label+' section grid has nine large buttons');
  assert.equal(await navGrid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3,
    label+' navigation renders three equal columns');
  assert.ok(await navGrid.locator('button').first().evaluate(el=>el.getBoundingClientRect().height)>=110);
  assert.equal(await page.locator('[data-action="open-tab"][data-ctx="settle"]').count(),0);
  await navGrid.locator('[data-ctx="reminders"]').click();
  assert.match(await page.locator('main.main').innerText(),/Reminders & group alerts/);
  await page.locator('.d4p-breadcrumb [data-action="d4-back"]').click();
  await page.evaluate(()=>document.querySelector('.toast')?.classList.remove('show'));
  await page.screenshot({path:path.join(__dirname,'preview',label+'-premium-dashboard.png'),animations:'disabled'});
  await page.locator('[data-action="open-tab"][data-ctx="members"]').first().click();
  await page.locator('[data-action="modal-add-member"]').click();
  assert.ok(await page.locator('.modal-header .modal-back').isVisible(),label+' form Back visible');
  assert.match(await page.locator('#activeForm button[type="submit"]').innerText(),/Save Member/);
  await page.locator('#f_member').fill('New Person');
  await page.locator('#activeForm button[type="submit"]').click();
  // This browser fixture is an ordinary Trip Admin: they may add but never remove.
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].members.includes('New Person'),true);
  assert.equal(await page.locator('[data-action="remove-member"]').count(),0,
    label+' Trip Admin cannot remove a code-joined or roster member');
  assert.equal(await page.locator('[data-action="restore-member"]').count(),0,
    label+' Trip Admin cannot restore removed users');
  assert.equal(data.trips[0].collection.payments.length,2,
    label+' Add Member preserves recorded payments');
  // M6 expense entry: note-only and no split controls.
  await page.locator('.d4-liquid-rail [data-action="open-tab"][data-ctx="expenses"]').click();
  assert.match(await page.locator('main.main').innerText(),/Day-wise records/);
  assert.doesNotMatch(await page.locator('main.main').innerText(),/Who owes whom|Smart Split/);
  await page.locator('[data-action="quick-expense"]').first().click();
  assert.equal(await page.locator('[name="splitMode"]').count(),0);
  assert.equal(await page.locator('[name="participant"]').count(),0);
  await page.locator('#f_amount').fill('325');
  await page.locator('#f_note').fill('Breakfast note');
  await page.locator('#activeForm button[type="submit"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].expenses.length,1);
  assert.equal(data.trips[0].expenses[0].amount,325);
  assert.equal(data.trips[0].expenses[0].mode,'note');
  assert.deepEqual(data.trips[0].expenses[0].participants,[]);
  await page.locator('[data-action="edit-expense"]').first().click();
  await page.locator('#f_amount').fill('375');
  await page.locator('#activeForm button[type="submit"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].expenses.length,1);
  assert.equal(data.trips[0].expenses[0].amount,375);
  // Exercise actual itinerary add/edit/save and completion, then member view-only UI.
  await page.locator('.d4-liquid-rail [data-ctx="plan"]').click();
  // Regression: Day Planner cards, text and CTA must be reachable on iPhone-sized screens.
  async function assertPlannerFits(selectors) {
    const boxes=await page.evaluate(items=>items.map(selector=>{
      const element=document.querySelector(selector);
      if(!element)return {selector,missing:true};
      const {left,right,width}=element.getBoundingClientRect();
      return {selector,left,right,width};
    }),selectors);
    for(const box of boxes){
      assert.ok(!box.missing,label+' missing planner element '+box.selector);
      assert.ok(box.width>0&&box.left>=-2&&box.right<=viewport.width+2,
        label+' planner crop: '+JSON.stringify(box));
    }
  }
  await assertPlannerFits(['.plan-ui','.plan-hero','.plan-toolbar','.d4-ms-summary',
    '.empty.bright-empty','.plan-view-note']);
  await page.screenshot({path:path.join(__dirname,'preview',label+'-premium-day-planner.png'),animations:'disabled'});
  await page.locator('[data-action="quick-plan"]').first().click();
  await page.locator('#f_title').fill('Beach walk');
  await page.locator('#f_date').selectOption('2026-11-11');
  await page.locator('#activeForm button[type="submit"]').click();
  await page.locator('[data-action="plan-edit"]').first().click();
  await page.locator('#f_time').fill('09:30');
  await page.locator('#activeForm button[type="submit"]').click();
  await page.locator('[data-action="plan-toggle"]').first().click();
  await assertPlannerFits(['.plan-ui','.d4-ms-summary','.d4-ms-track','.d4-ms-track>.d4-ms-item']);
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].plans[0].date,'2026-11-11');
  assert.equal(data.trips[0].plans[0].time,'09:30');
  assert.equal(data.trips[0].plans[0].done,true);
  // New inline flow: Add Below must follow the saved time, never reset to 8:00 AM.
  await page.locator('.d4-ms-add-next [data-goa-action="add"]').click();
  await page.locator('.d4-ms-inline-editor').waitFor();
  assert.equal(await page.locator('.d4-ms-inline-editor [name="time"]').inputValue(),'10:00');
  assert.ok(await page.locator('.d4-ms-inline-editor [data-visual="fort"] img').count()>0);
  assert.ok(await page.locator('.d4-ms-inline-editor [data-visual="lunch"] img').count()>0);
  assert.ok(await page.locator('.d4-ms-inline-editor [data-visual="dinner"] img').count()>0);
  await page.locator('.d4-ms-inline-editor [data-visual="fort"]').click();
  await page.locator('.d4-ms-inline-editor [name="title"]').fill('Fort Aguada extra');
  await page.locator('.d4-ms-inline-editor [name="place"]').fill('North Goa');
  await page.locator('.d4-ms-inline-editor button[type="submit"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  const fortStep=data.trips[0].plans.find(p=>p.title==='Fort Aguada extra');
  assert.ok(fortStep,label+' inline Add Below did not save');
  assert.equal(fortStep.time,'10:00');
  assert.equal(fortStep.goaIcon,'🏰');
  assert.equal(fortStep.category,'Sightseeing');
  assert.equal(data.trips[0].plans[0].done,true);
  assert.ok(await page.locator('.d4-ms-track>.d4-ms-item').count()===2);
  await page.locator('[data-goa-step-id="'+fortStep.id+'"] [data-goa-action="time"]').click();
  await page.locator('.d4-ms-inline-editor [name="time"]').fill('10:45');
  await page.locator('.d4-ms-inline-editor button[type="submit"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].plans.find(p=>p.id===fortStep.id).time,'10:45');
  assert.match(await page.locator('[data-goa-step-id="'+fortStep.id+'"]').innerText(),/10:45/);
  await page.locator('.d4-liquid-rail [data-view="profile"]').click();
  await page.locator('#profileSelect').selectOption('A');
  await page.locator('.d4p-breadcrumb [data-action="d4-back"]').click();
  assert.equal(await page.locator('[data-action="collection-quick-add"]').count(),0);
  await page.locator('.d4-liquid-rail [data-action="open-tab"][data-ctx="members"]').click();
  assert.equal(await page.locator('[data-action="modal-add-member"]').count(),0);
  assert.equal(await page.locator('[data-action="remove-member"]').count(),0);
  await page.locator('.d4-liquid-rail [data-ctx="expenses"]').click();
  assert.match(await page.locator('main.main').innerText(),/Breakfast note/);
  assert.equal(await page.locator('[data-action="edit-expense"]').count(),0);
  assert.equal(await page.locator('[data-action="delete-expense"]').count(),0);
  await page.locator('.d4-liquid-rail [data-ctx="plan"]').click();
  assert.equal(await page.locator('[data-action="plan-edit"]').count(),0);
  await page.locator('.d4-liquid-rail [data-view="chat"]').click();
  assert.match(await page.locator('main.main').innerText(),/Coming Soon/);
  await page.locator('.d4-liquid-rail [data-view="profile"]').click();
  for(const mode of ['light','sunset','midnight']){
    await page.locator('[data-d4-theme="'+mode+'"]').click();
    assert.equal(await page.locator('[data-d4-theme="'+mode+'"]').getAttribute('aria-pressed'),'true');
  }
  await page.locator('#profileSelect').selectOption('Admin');
  await page.reload({waitUntil:'domcontentloaded'});
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].collection.payments.length,2,label+' payments persist after reload');
  assert.equal(data.trips[0].members.includes('New Person'),true,label+' added member remains saved after reload');
  // The secure Groups UI must be visible as a clearly disabled preview,
  // not as an enabled cross-account network feature.
  await page.locator('[data-action="entry-select-trip"]').first().click();
  await page.locator('[data-action="enter-selected-trip"]').first().click();
  await page.locator('button.avatar[data-action="nav"][data-view="profile"]').click();
  await page.locator('#d4-shared-panel').waitFor();
  assert.match(await page.locator('#d4-shared-panel').innerText(),/Real multi-account sharing is OFF/);
  assert.equal(await page.locator('[data-d4-shared-form]').count(),0);
  const groupPreview=path.join(__dirname,'preview',label+'-secure-groups.png');
  fs.mkdirSync(path.dirname(groupPreview),{recursive:true});
  await page.evaluate(()=>document.querySelector('#d4-shared-panel')?.scrollIntoView({block:'center'}));
  await page.waitForTimeout(500);
  await page.screenshot({path:groupPreview,animations:'disabled'});
  await page.reload({waitUntil:'domcontentloaded'});
  // Replay is intentionally in Settings now to keep Explore Trips spacious.
  await page.locator('[data-action="entry-select-trip"]').first().click();
  await page.locator('[data-action="enter-selected-trip"]').first().click();
  await page.locator('button.avatar[data-action="nav"][data-view="profile"]').click();
  await page.locator('[data-action="replay-intro"]').click();
  await page.locator('#d4Intro').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-d4-intro-skip]').count(),1);
  await page.waitForTimeout(3400);
  const output = path.join(__dirname,'preview',label+'-cinematic.png');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  await page.screenshot({path:output,animations:'allow'});
  await page.locator('[data-d4-intro-skip]').click();
  await page.locator('#d4Intro').waitFor({state:'hidden'});
  // Replay was launched from Settings, so it should return to the same screen.
  assert.equal(await page.locator('#d4-cloud-panel').isVisible(),true);
  assert.deepEqual(pageErrors,[],label+' runtime exceptions');
  await context.close();
  console.log('PASS browser smoke: '+label+' payments / save / remove / reload / cinematic replay & skip');
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
