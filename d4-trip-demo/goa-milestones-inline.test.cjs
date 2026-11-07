'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'goa-milestones.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
new vm.Script(script,{filename:'goa-milestones.js'});

function setup(admin=true) {
  const date='2026-12-12';
  const t={id:'goa-test',name:'Goa',kind:'goa',destination:'Goa',dates:[date,'2026-12-13','2026-12-14'],
    plans:[
      {id:'train',date,time:'04:00',title:'Madgaon railway pickup',done:false},
      {id:'hotel',date,time:'08:00',title:'Hotel reached',done:true},
      {id:'start',date,time:'09:30',title:'Start from hotel',done:false}
    ],members:['A','B'],expenses:[{id:'exp',amount:140}],collection:{payments:[{id:'pay',amount:99}]}
  };
  let writes=0,num=0,renders=0;
  const events={};
  const context={
    tripPlan:()=>'<div class="plan-toolbar">📅 Day 1 Schedule · Sorted by time</div><div class="plan-timeline">old</div><div class="plan-view-note">safe</div>',
    datesInTrip:x=>x.dates,daySelected:date,
    planCategory:p=>p.category||'Travel',planPalette:{Travel:{emoji:'🚆'},Other:{emoji:'📍'}},
    esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
    isTripAdmin:()=>admin,toast:()=>{},
    saveTripChange:(trip,fn)=>{writes++;fn()},
    uid:()=>('new'+(++num)),confirm:()=>true,render:()=>{renders++},window:{},
    ampm:time=>time||'—',requestAnimationFrame:fn=>fn(),
    document:{querySelector:()=>null,addEventListener:(type,fn)=>{events[type]=fn}},
    current:()=>t,planCategories:['Travel','Food','Sightseeing','Stay','Activity','Reminder','Shopping','Photos','Other']
  };
  vm.createContext(context);vm.runInContext(script,context);
  return {t,date,context,events,getWrites:()=>writes,getRenders:()=>renders};
}
test('Add activity no longer resets to 8:00 AM',()=>{
  assert.doesNotMatch(html,/field\('time','Activity time','08:00'/);
  assert.match(html,/D4GoaMilestones\?\.suggestDayTime/);
  const x=setup(),api=x.context.window.D4GoaMilestones;
  assert.equal(api.suggestDayTime(x.t,x.date),'10:00');
  assert.equal(api.suggestDayTime({...x.t,plans:[]},x.date),'');
});
test('All milestones have Add Below and Edit Time and the day ends with Add Next',()=>{
  const x=setup(),markup=x.context.tripPlan(x.t);
  assert.match(markup,/data-goa-action="time"/);
  assert.match(markup,/data-goa-action="add"/);
  assert.match(markup,/＋ Add Next Milestone/);
  x.events.click({target:{closest:()=>({dataset:{goaAction:'add',id:'start'}})},preventDefault(){},stopPropagation(){}});
  const expanded=x.context.tripPlan(x.t);
  assert.match(expanded,/data-goa-editor-form="add"/);
  for(const label of ['Fort','Beach','Lunch','Dinner','Breakfast','Water Sports','Hotel']) {
    assert.ok(expanded.includes('>'+label+'</span>')||expanded.includes('>'+label+'</button>'),label+' category missing');
  }
  assert.match(expanded,/data-visual="fort"/);
  assert.match(expanded,/d4-ms-visual-photo/);
  assert.equal(x.getRenders(),1);
});
test('Insert below preserves custom order, selected image/icon, payments and members',()=>{
  const x=setup(),api=x.context.window.D4GoaMilestones;
  const previous=JSON.stringify({members:x.t.members,expenses:x.t.expenses,collection:x.t.collection});
  const fort=api.appendAfter(x.t,x.date,'hotel',{title:'Fort Aguada',place:'North Goa',time:'08:30',endTime:'09:00',visual:'fort'});
  const lunch=api.appendAfter(x.t,x.date,fort.id,{title:'Lunch',place:'Baga',time:'09:15',visual:'lunch'});
  const names=Array.from(api.orderedForDate(x.t,x.date),p=>p.title);
  assert.deepEqual(names,['Madgaon railway pickup','Hotel reached','Fort Aguada','Lunch','Start from hotel']);
  assert.equal(fort.goaIcon,'🏰');assert.equal(fort.category,'Sightseeing');
  assert.equal(lunch.goaIcon,'🍛');assert.equal(lunch.category,'Food');
  assert.equal(fort.goaTimeLabel,'08:30 – 09:00');
  assert.equal(JSON.stringify({members:x.t.members,expenses:x.t.expenses,collection:x.t.collection}),previous);
  assert.equal(x.getWrites(),2);
});
test('Edit inline time updates visible label, not unrelated data',()=>{
  const x=setup(),api=x.context.window.D4GoaMilestones;
  const existing=x.t.plans[1];
  const id=existing.id;
  api.editMilestoneTime(x.t,id,'10:00','10:45');
  assert.equal(existing.time,'10:00');
  assert.equal(existing.goaTimeLabel,'10:00 – 10:45');
  assert.equal(existing.done,true);
  assert.match(x.context.tripPlan(x.t),/10:00 – 10:45/);
  assert.equal(api.suggestDayTime(x.t,x.date),'10:30');
});
test('No writes on bad times, missing items, invalid category or member permissions',()=>{
  const x=setup(),api=x.context.window.D4GoaMilestones;
  assert.throws(()=>api.appendAfter(x.t,x.date,'start',{title:'invalid',time:'25:00',visual:'beach'}),/time/i);
  assert.throws(()=>api.appendAfter(x.t,x.date,'start',{title:'bad',time:'10:00',visual:'hacked'}),/category/i);
  assert.throws(()=>api.appendAfter(x.t,x.date,'missing',{title:'bad',time:'10:00',visual:'fort'}),/no longer exists/i);
  assert.throws(()=>api.editMilestoneTime(x.t,'hotel','28:00',''),/valid time/i);
  assert.equal(x.getWrites(),0);
  const guest=setup(false);
  assert.doesNotMatch(guest.context.tripPlan(guest.t),/data-goa-action="add"/);
  assert.throws(()=>guest.context.window.D4GoaMilestones.appendAfter(guest.t,guest.date,'start',{title:'bad',time:'10:00',visual:'beach'}),/Admins only/);
});
test('Existing Goa template can be re-imported without multiplying manual custom stops',()=>{
  const x=setup(),api=x.context.window.D4GoaMilestones;
  api.importPlan(x.t);
  const n=x.t.plans.length;
  const newStop=api.appendAfter(x.t,x.date,api.orderedForDate(x.t,x.date).at(-1).id,
    {title:'Extra sunset',place:'North Goa',time:'',visual:'beach'});
  api.importPlan(x.t);
  assert.equal(x.t.plans.length,n+1);
  assert.equal(x.t.plans.filter(p=>p.id===newStop.id).length,1);
});
