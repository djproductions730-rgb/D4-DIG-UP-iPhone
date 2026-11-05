'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const extract=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
function setup(){
 const trip={id:'qa',start:'2026-11-10',end:'2026-11-12',members:['Admin','Member'],expenses:[],plans:[],notes:[]};
 let permitted=true,saved=true,closed=0;
 const messages=[];
 const ctx=vm.createContext({structuredClone,FormData:class{constructor(data){this.data=data}get(k){return this.data[k]}},
  current:()=>trip,trip:()=>trip,activeModal:'expense',modalContext:{},isTripAdmin:()=>permitted,
  datesInTrip:()=>['2026-11-10','2026-11-11','2026-11-12'],planCategories:['Food','Travel','Other'],
  readAttachment:async()=>null,uid:()=>String(trip.expenses.length+trip.plans.length+1),
  persist:()=>saved,closeModal:()=>closed++,go(){},toast:m=>messages.push(m),tripTab:'',daySelected:''});
 vm.runInContext(extract('function saveTripChange(', 'function datesInTrip(')+'\n'+extract('async function saveForm(', 'function fileDownload('),ctx);
 return {trip,messages,ctx,allow:v=>permitted=v,storage:v=>saved=v,get closed(){return closed},
  async submit(modal,values,context={}){ctx.activeModal=modal;ctx.modalContext=context;await ctx.saveForm({preventDefault(){},target:values})}};
}
const expense={amount:'12.34',date:'2026-11-10',note:'Tea',paidBy:'Admin',category:'Food & Dining',method:'UPI'};
const plan={date:'2026-11-10',time:'08:00',title:'Breakfast',place:'Cafe',category:'Food'};
test('expense notes add/edit keep paise, existing receipts, and no split ledger',async()=>{
 const h=setup();await h.submit('expense',expense);
 assert.equal(h.trip.expenses[0].amount,12.34);assert.equal(h.trip.expenses[0].mode,'note');
 assert.equal(h.trip.expenses[0].participants.length,0);assert.equal(h.trip.expenses[0].shares,null);
 h.trip.expenses[0].receipt={name:'bill.pdf',data:'receipt'};
 await h.submit('expense-edit',{...expense,amount:'20.55',note:'Updated'},{expenseId:'1'});
 assert.equal(h.trip.expenses.length,1);assert.equal(h.trip.expenses[0].amount,20.55);
 assert.equal(h.trip.expenses[0].receipt.data,'receipt');
});
test('invalid expenses and member mutation attempts leave history untouched',async()=>{
 const h=setup();
 for(const values of [{...expense,amount:'0'},{...expense,amount:'NaN'},{...expense,date:'2027-01-01'},{...expense,note:''},{...expense,paidBy:'Stranger'}])await h.submit('expense',values);
 h.allow(false);await h.submit('expense',expense);
 assert.equal(h.trip.expenses.length,0);assert.equal(h.closed,0);
});
test('legacy split amounts and allocations survive note editing',async()=>{
 const h=setup();h.trip.expenses.push({id:'old',...expense,amount:12.34,mode:'custom',participants:['Member'],shares:{Member:12.34}});
 const before=JSON.stringify(h.trip);await h.submit('expense-edit',{...expense,amount:'99'},{expenseId:'old'});
 assert.equal(JSON.stringify(h.trip),before);
 await h.submit('expense-edit',{...expense,note:'Receipt clarified'},{expenseId:'old'});
 assert.equal(h.trip.expenses[0].shares.Member,12.34);assert.equal(h.trip.expenses[0].mode,'custom');
});
test('failed expense and itinerary saves roll back and keep the form open',async()=>{
 const h=setup();h.storage(false);const before=JSON.stringify(h.trip);
 await h.submit('expense',expense);assert.equal(JSON.stringify(h.trip),before);
 await h.submit('plan',plan);assert.equal(JSON.stringify(h.trip),before);
 assert.equal(h.closed,0);assert.ok(h.messages.every(m=>m.includes('not saved')));
});
test('activities add, move days, keep completion, and reject invalid times/dates',async()=>{
 const h=setup();await h.submit('plan',plan);h.trip.plans[0].done=true;
 await h.submit('plan-edit',{...plan,date:'2026-11-12',time:'09:30'},{planId:'1'});
 assert.equal(h.trip.plans.length,1);assert.equal(h.trip.plans[0].date,'2026-11-12');assert.equal(h.trip.plans[0].done,true);
 const before=JSON.stringify(h.trip);
 await h.submit('plan-edit',{...plan,time:'25:00'},{planId:'1'});
 await h.submit('plan-dates',{start:'2026-11-10',end:'2026-11-11'});
 assert.equal(JSON.stringify(h.trip),before);
 h.allow(false);await h.submit('plan',plan);assert.equal(JSON.stringify(h.trip),before);
});
