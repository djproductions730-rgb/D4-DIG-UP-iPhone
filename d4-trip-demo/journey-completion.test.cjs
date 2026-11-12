'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'journey-completion.js'),'utf8');
const events={};
let renderCount=0, currentTrip;
const html=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const env={
 tripOverview:()=>'<section id="old-overview">Original tools</section>',
 tripPlan:()=>'<section id="old-plan">Admin edit actions</section>',
 esc:html, shortDate:d=>d, money:n=>'₹'+Number(n).toLocaleString('en-IN'),
 collectionTotals:()=>({paid:7500,pending:2500,target:10000}),
 calculations:()=>({total:3000}),
 datesInTrip:()=>['2026-11-10','2026-11-11','2026-11-12'],
 document:{addEventListener:(name,fn)=>{events[name]=fn}},
 current:()=>currentTrip,canSee:()=>true,
 render:()=>{renderCount++;},toast:()=>{},
 view:'trip',tripTab:'overview',daySelected:'2026-11-10',
 window:{}
};
vm.runInNewContext(source,env,{filename:'journey-completion.js'});
const base={id:'goa',name:'Goa Trip',destination:'Goa',start:'2026-11-10',end:'2026-11-12',members:['One','Two'],
 plans:[{id:'a',date:'2026-11-10',done:true,title:'Railway'},{id:'b',date:'2026-11-10',done:false,title:'Hotel'},
 {id:'c',date:'2026-11-11',done:true,title:'Water Sports'},{id:'d',date:'2026-11-12',done:false,title:'Return'}]};
currentTrip=base;
const api=env.window.D4JourneyCompletion;
assert.ok(api,'public read-only helper available');
assert.equal(api.statsFor(base).progress,50);
assert.equal(api.statsFor(base).complete,false);
assert.equal(api.daily(base,'2026-11-10').percent,50);
let overview=env.tripOverview(base);
assert.match(overview,/Original tools/);
assert.doesNotMatch(overview,/Trip Milestones|milestone-day[123]|journey-cover-metrics|journey-cta-note/);
assert.doesNotMatch(overview,/₹1,00,200|10,000\+|15 Milestones/);
function click(action,date){
 let prevented=false;
 events.click({target:{closest:()=>({dataset:{d4Journey:action,date}})},preventDefault(){prevented=true},stopPropagation(){}});
 assert.ok(prevented);
}
click('day','2026-11-11');
assert.equal(env.daySelected,'2026-11-11');
assert.equal(env.tripTab,'plan');
assert.ok(renderCount>0);
assert.match(env.tripPlan(base),/Admin edit actions/);
base.plans.forEach(p=>p.done=true);
assert.equal(api.statsFor(base).complete,true);
assert.doesNotMatch(env.tripOverview(base),/View Trip Completed|Trip Milestones/);
click('finish');
const finishHtml=env.tripPlan(base);
assert.match(finishHtml,/Trip Completed!/);
assert.match(finishHtml,/₹3,000/);
assert.match(finishHtml,/₹7,500/);
assert.match(finishHtml,/₹2,500/);
assert.match(finishHtml,/View Memories/);
click('back');
assert.match(env.tripPlan(base),/Admin edit actions/);
assert.deepEqual(base.plans.map(p=>p.done),[true,true,true,true]);
assert.equal(base.members.length,2);
const noSteps={...base,plans:[]};
assert.equal(api.statsFor(noSteps).complete,false,'empty trip must not be completed');
const safe={...base,name:'<img src=x onerror=alert(1)>'};
assert.ok(!env.tripOverview(safe).includes('<img src=x onerror'));
console.log('PASS: journey status is data-derived, final summary uses real ledger, permissions are unchanged, no mutations');
