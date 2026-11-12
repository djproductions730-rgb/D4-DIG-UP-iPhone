'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'goa-milestones.js'),'utf8');
new vm.Script(source, {filename:'goa-milestones.js'});
const dates=['2026-12-12','2026-12-13','2026-12-14'];
function environment(canEdit=true,tripDates=dates) {
  const t={
    dates:tripDates.slice(),name:'Goa 3 Days',kind:'goa',destination:'Goa',
    members:['Member A','Member B'],expenses:[{id:'expense',amount:100}],
    collection:{payments:[{id:'payment',amount:10}]},
    plans:[
      {id:'manual-pickup',date:dates[0],time:'04:00',title:'Goa Pickup From Madgoan Station',place:'Magao Railway station',done:false},
      {id:'manual-hotel',date:dates[0],time:'08:00',title:'Hotel Lua Nova Baga',place:'Hotel Reached',done:true},
      {id:'manual-bike',date:dates[0],time:'08:30',title:'Bike and Car collection',place:'Bike collection',done:false},
      {id:'manual-start',date:dates[0],time:'09:30',title:'Trip Started',place:'Start from Hotel',done:false}
    ]
  };
  let saveCount=0,uidCount=0,notifications=[],confirmCount=0,renderCount=0;
  const context={
    tripPlan:()=>'<section><div class="plan-toolbar">📅 Day 1 Schedule · Sorted by time</div><div class="plan-timeline">old</div><div class="plan-view-note">safe</div></section>',
    datesInTrip:x=>x.dates,
    daySelected:tripDates[0],
    planCategory:p=>p.category||'Travel',
    planPalette:{Travel:{emoji:'🚆'},Stay:{emoji:'🏨'},Other:{emoji:'📍'}},
    esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
    isTripAdmin:()=>canEdit,toast:s=>notifications.push(s),
    saveTripChange:(x,fn)=>{saveCount++;fn()},
    uid:()=>('new-'+(++uidCount)),confirm:()=>{confirmCount++;return true},
    render:()=>{renderCount++},window:{},ampm:s=>s||'—',
    requestAnimationFrame:fn=>fn(),document:{querySelector:()=>null},
    tripTab:'overview'
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return {t,context,getSaveCount:()=>saveCount,getUidCount:()=>uidCount,getNotifications:()=>notifications,getConfirmCount:()=>confirmCount,getRenderCount:()=>renderCount};
}
test('Goa package links existing entries, adds missing stops and preserves finance and existing done',()=>{
  const e=environment(),before=JSON.stringify({members:e.t.members,expenses:e.t.expenses,collection:e.t.collection});
  const first=e.context.tripPlan(e.t);
  assert.match(first,/Journey Milestones/);
  assert.match(first,/Next stop/);
  e.context.window.D4GoaMilestones.importPlan(e.t);
  assert.equal(e.t.plans.length,52);
  assert.equal(e.getUidCount(),48);
  assert.equal(e.getSaveCount(),1);
  assert.equal(e.t.plans.filter(p=>p.date===dates[0]).length,22);
  assert.equal(e.t.plans.filter(p=>p.date===dates[1]).length,17);
  assert.equal(e.t.plans.filter(p=>p.date===dates[2]).length,13);
  assert.equal(e.t.plans.find(p=>p.id==='manual-pickup').goaIcon,'🚆');
  assert.equal(e.t.plans.find(p=>p.id==='manual-hotel').done,true);
  assert.equal(e.t.plans.find(p=>p.id==='manual-start').title,'Trip Started');
  assert.equal(JSON.stringify({members:e.t.members,expenses:e.t.expenses,collection:e.t.collection}),before);
  for(const icon of ['🏰','🏖️','🤿','🛵','⛪','🛕','💦']){
    assert.ok(e.t.plans.some(p=>p.goaIcon===icon),'Missing itinerary icon '+icon);
  }
  assert.ok(e.t.plans.some(p=>p.goaTimeLabel==='Time flexible'||p.goaTimeLabel==='Flexible'));
  const rendered=e.context.tripPlan(e.t);
  assert.match(rendered,/data-goa-next="true"/);
  assert.match(rendered,/Complete &amp; Next|Complete & Next/);
  assert.match(rendered,/goa-milestone|d4-ms-item/);
  assert.match(rendered,/luxury|Luxury/);
});
test('Import is idempotent and completed flags are preserved',()=>{
  const e=environment();
  e.context.window.D4GoaMilestones.importPlan(e.t);
  const saved=e.t.plans[0].done;
  e.context.window.D4GoaMilestones.importPlan(e.t);
  assert.equal(e.t.plans.length,52);
  assert.equal(e.getSaveCount(),1);
  assert.equal(e.t.plans[0].done,saved);
});
test('Only an admin with three trip days can import',()=>{
  const guest=environment(false);
  guest.context.window.D4GoaMilestones.importPlan(guest.t);
  assert.equal(guest.getSaveCount(),0);
  const short=environment(true,dates.slice(0,2));
  short.context.window.D4GoaMilestones.importPlan(short.t);
  assert.equal(short.getSaveCount(),0);
});
test('Milestone titles are escaped before rendering',()=>{
  const e=environment();
  e.t.plans.push({id:'escape-case',date:dates[0],title:'<script>bad</script>',place:'<svg>',time:'21:00',done:false});
  const html=e.context.tripPlan(e.t);
  assert.ok(!html.includes('<script>bad</script>'));
  assert.ok(html.includes('&lt;script>bad&lt;/script>'));
});
