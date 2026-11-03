'use strict';
// Real Chromium smoke tests, exercising rendered screens in desktop and phone-sized viewports.
// Runs against local static server and never contacts a live Firebase database.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

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
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.addInitScript(dataset=>{
    if(!localStorage.getItem('d4_trip_offline_v2'))
      localStorage.setItem('d4_trip_offline_v2',JSON.stringify(dataset));
    localStorage.setItem('d4_trip_offline_profile_v2','Admin');
  },seed);
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
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
  await page.locator('[data-action="collection-members"]').click();
  assert.match(await page.locator('.cc-popup-total').innerText(),/Paid 1/);
  await page.locator('[data-action="close-modal"]').last().click();
  await page.locator('[data-action="enter-selected-trip"]').click();
  await page.locator('[data-action="trip-tab"][data-tab="members"]').click();
  await page.locator('[data-action="modal-add-member"]').click();
  assert.match(await page.locator('#activeForm button[type="submit"]').innerText(),/Save Member/);
  await page.locator('#f_member').fill('New Person');
  await page.locator('#activeForm button[type="submit"]').click();
  assert.equal(await page.locator('[data-action="remove-member"][data-member="New Person"]').count(),1);
  page.once('dialog',d=>d.accept());
  await page.locator('[data-action="remove-member"][data-member="New Person"]').click();
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].members.includes('New Person'),false);
  await page.reload({waitUntil:'domcontentloaded'});
  data=await page.evaluate(()=>window.D4TripLocal.getData());
  assert.equal(data.trips[0].collection.payments.length,2,label+' payments persist after reload');
  assert.equal(data.trips[0].members.includes('New Person'),false);
  assert.deepEqual(pageErrors,[],label+' runtime exceptions');
  await context.close();
  console.log('PASS browser smoke: '+label+' payments / save / remove / reload');
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    await smoke(browser,'desktop',{width:1280,height:800},false);
    await smoke(browser,'mobile',{width:390,height:844},true);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
