'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname;
const script=fs.readFileSync(path.join(root,'reference-premium.js'),'utf8');
const css=fs.readFileSync(path.join(root,'reference-premium.css'),'utf8');
new vm.Script(script,{filename:'reference-premium.js'});

function makeFixture(saved){
 const existing='<h3 class="d4p-title">Trip Sections</h3><nav class="d4p-grid d4p-nav-grid" aria-label="Trip section navigation"><button class="d4p-tile">Old section</button></nav><p>Existing admin actions</p>';
 const t={id:'trip',name:'Goa Trip',destination:'Goa',start:'2026-11-23',end:'2026-11-27',
   members:['Member One','Member Two'],admins:[],collection:{payments:[]}};
 const events={},preferences={value:saved},context={
  window:{},document:{addEventListener:(name,fn)=>(events[name]??=[]).push(fn)},
  localStorage:{getItem:()=>preferences.value,setItem:(_key,value)=>{preferences.value=value}},
  esc:value=>String(value),money:amount=>'₹'+amount,shortDate:value=>value,
  datesInTrip:()=>['2026-11-23'],collectionTotals:()=>({paid:0,target:2000,pending:2000,progress:0,
    full:0,partial:0,unpaid:2,rows:[{member:'Member One',paid:0,pending:1000,status:'Pending'}]}),
  calculations:()=>({total:0,categories:{}}),current:()=>t,
  isTripAdmin:()=>false,isMain:()=>false,
  bottomNav:()=>'',tripOverview:()=>existing,home:()=>'',collectionsPage:()=>'',
  tripMembers:()=>'',expensesPage:()=>'',entryPage:()=>'',tripPage:()=>'',adminPage:()=>'',render:()=>{},
  profile:'Member One',view:'trip',tripTab:'overview',teamId:'trip'
 };
 vm.createContext(context);vm.runInContext(script,context);
 return {context,events,preferences,t};
}

test('six beautiful, accessible navigation tiles replace the old emoji grid, keeping admin controls',()=>{
 const {context,t}=makeFixture(null),board=context.tripOverview(t);
 const grid=board.match(/<nav class="d4p-grid d4p-nav-grid ref-sections-grid"[^>]*>([\s\S]*?)<\/nav>/);
 assert.ok(grid,'Trip Sections remains a normal navigable grid');
 assert.equal((grid[1].match(/<button type="button" class="d4p-tile"/g)||[]).length,6);
 assert.equal((grid[1].match(/<svg /g)||[]).length,6);
 for(const name of ['Overview','Day Plan','Tickets','Alerts','Reports','Settings']){
   assert.ok(grid[1].includes('aria-label="'+name+'"'),name+' is accessible');
 }
 assert.doesNotMatch(board,/Old section/,'Duplicate previous grid is removed');
 assert.match(board,/Existing admin actions/,'Other original options remain');
 assert.match(board,/<details class="ref-trip-sections" open>/,'All tiles are initially visible');
});

test('Hide and Show preference is optional, persistent, and never deletes buttons',()=>{
 const {context,events,preferences,t}=makeFixture('closed');
 assert.doesNotMatch(context.tripOverview(t),/<details class="ref-trip-sections" open>/);
 const handler=events.toggle.find(fn=>fn.toString().includes('SECTIONS_KEY'));
 assert.ok(handler,'Native details toggle handler exists');
 const target={open:true,classList:{contains:name=>name==='ref-trip-sections'}};
 handler({target});
 assert.equal(preferences.value,'open');
 assert.match(context.tripOverview(t),/<details class="ref-trip-sections" open>/);
 target.open=false;handler({target});
 assert.equal(preferences.value,'closed');
 assert.match(context.tripOverview(t),/ref-sections-grid/,'Hidden sections are not deleted');
});

test('all six tiles preserve delegated click targets',()=>{
 const {context,t}=makeFixture(null),board=context.tripOverview(t);
 for(const action of ['data-ctx="overview"','data-ctx="plan"','data-view="tickets"',
   'data-ctx="reminders"','data-ctx="report"','data-view="profile"']){
  assert.ok(board.includes(action),'Route missing: '+action);
 }
});

test('mobile visual styles include 3-column gold tiles, readable labels and focus states',()=>{
 assert.match(css,/ref-trip-sections/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/ref-section-icon svg/);
 assert.match(css,/ref-sections-head:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
