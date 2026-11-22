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

test('only approved tiles appear on the homepage',()=>{
 const {context,t}=makeFixture(null),board=context.tripOverview(t);
 assert.equal((board.match(/class="ref-action"/g)||[]).length,7);
 for(const name of ['Day Plan','Tickets','Memories','Members','Payments','Expenses','Paid by Person'])assert.ok(board.includes(name),name);
 assert.match(board,/data-action="quick-report"/);
 assert.doesNotMatch(board,/Old section|Existing admin actions|More Trip Tools|ref-sections-grid/);
});
