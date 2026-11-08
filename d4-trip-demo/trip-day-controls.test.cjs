'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'trip-day-controls.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'trip-day-controls.css'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
new vm.Script(source,{filename:'trip-day-controls.js'});

function fixture(){
 const trip={
   id:'goa-trip',name:'Goa Trip',start:'2026-11-23',end:'2026-11-27',
   members:['Main Admin','Friend'],plans:[
     {id:'start',date:'2026-11-23',title:'Train journey'},
     {id:'last',date:'2026-11-27',title:'Return journey'}
   ],
   notes:[{date:'2026-11-24',text:'Hotel'}],reminders:[{date:'2026-11-26',title:'Goa checkout'}],
   expenses:[{date:'2026-11-25',amount:1000}],collection:{payments:[{date:'2026-11-20',amount:300}]}
 };
 const events={};let admin=true,ask=true;let shownPlan='',message='';
 const plusDays=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const context={
   window:{},
   document:{addEventListener:(name,fn)=>{(events[name]??=[]).push(fn)}},
   current:()=>trip,isTripAdmin:()=>admin,daySelected:'2026-11-24',tripTab:'plan',
   fmtDate:value=>value,confirm:()=>ask,toast:value=>{message=value},
   saveTripChange:(t,fn)=>fn(),render:()=>{},
   datesInTrip:t=>{
     const arr=[];let d=t.start;
     for(let n=0;n<90&&d<=t.end;n++,d=plusDays(d,1))arr.push(d);
     return arr;
   },
   tripPlan:t=>'<div id="original-plan">'+t.name+'</div>'
 };
 vm.createContext(context);
 vm.runInContext(source,context,{filename:'trip-day-controls.js'});
 return {trip,ctx:context,events,plusDays,setAdmin:value=>admin=value,setConfirm:value=>ask=value,getMessage:()=>message};
}

test('calendar displays selected day, days count, add, minus, edit and direct date inputs',()=>{
 const {trip,ctx}=fixture();
 const html=ctx.tripPlan(trip);
 assert.match(html,/Trip Days & Dates/);
 assert.match(html,/Day 2/);
 assert.match(html,/2026-11-24/);
 assert.match(html,/data-trip-day-action="add"/);
 assert.match(html,/data-trip-day-action="remove"/);
 assert.match(html,/data-action="plan-dates"/);
 assert.match(html,/data-trip-day-action="shift"/);
 assert.match(html,/original-plan/,'Existing Goa milestone content preserved');
});

test('+ Day appends an empty day without modifying existing plans or payment records',()=>{
 const {trip,ctx}=fixture();
 const originalPlans=JSON.stringify(trip.plans),payments=JSON.stringify(trip.collection);
 const text=ctx.window.D4TripDays.changeTripDay(trip,'add');
 assert.match(text,/Added Day 6/);
 assert.equal(trip.end,'2026-11-28');
 assert.equal(ctx.daySelected,'2026-11-28');
 assert.equal(ctx.datesInTrip(trip).length,6);
 assert.equal(JSON.stringify(trip.plans),originalPlans);
 assert.equal(JSON.stringify(trip.collection),payments);
});

test('- Day never removes last day with an activity, expense, reminder or note',()=>{
 const {trip,ctx}=fixture();
 assert.throws(()=>ctx.window.D4TripDays.changeTripDay(trip,'remove'),/activity saved/);
 assert.equal(trip.end,'2026-11-27');
 trip.plans=trip.plans.filter(x=>x.date!=='2026-11-27');
 trip.expenses.push({date:'2026-11-27',amount:10});
 assert.throws(()=>ctx.window.D4TripDays.changeTripDay(trip,'remove'),/expense saved/);
 assert.equal(trip.end,'2026-11-27');
});

test('- Day removes only a confirmed empty end date',()=>{
 const {trip,ctx,setConfirm}=fixture();
 trip.plans=trip.plans.filter(x=>x.date!=='2026-11-27');
 setConfirm(false);
 assert.equal(ctx.window.D4TripDays.changeTripDay(trip,'remove'),'');
 assert.equal(trip.end,'2026-11-27');
 setConfirm(true);
 assert.match(ctx.window.D4TripDays.changeTripDay(trip,'remove'),/5 days|4 days/);
 assert.equal(trip.end,'2026-11-26');
 assert.equal(ctx.daySelected,'2026-11-24');
});

test('changing Day 2 date shifts itinerary together; financial transaction dates stay unchanged',()=>{
 const {trip,ctx}=fixture();
 const result=ctx.window.D4TripDays.changeTripDay(trip,'shift','2026-12-01');
 assert.match(result,/Trip dates updated/);
 assert.equal(trip.start,'2026-11-30');
 assert.equal(trip.end,'2026-12-04');
 assert.equal(ctx.daySelected,'2026-12-01');
 assert.equal(trip.plans.find(p=>p.id==='start').date,'2026-11-30');
 assert.equal(trip.plans.find(p=>p.id==='last').date,'2026-12-04');
 assert.equal(trip.notes[0].date,'2026-12-01');
 assert.equal(trip.reminders[0].date,'2026-12-03');
 assert.equal(trip.expenses[0].date,'2026-11-25');
 assert.equal(trip.collection.payments[0].date,'2026-11-20');
});

test('member view does not show edit controls and is blocked from direct changes',()=>{
 const {trip,ctx,setAdmin}=fixture();
 setAdmin(false);
 assert.doesNotMatch(ctx.tripPlan(trip),/data-trip-day-action="add"/);
 assert.doesNotMatch(ctx.tripPlan(trip),/data-trip-day-action="shift"/);
 assert.throws(()=>ctx.window.D4TripDays.changeTripDay(trip,'add'),/Only Main Admin or Trip Admin/);
});

test('calendar validates date and 90-day limit',()=>{
 const {trip,ctx}=fixture();
 assert.throws(()=>ctx.window.D4TripDays.changeTripDay(trip,'shift','2026-02-30'),/valid day date/);
 trip.start='2026-01-01';trip.end='2026-03-31'; // exactly 90 days
 assert.throws(()=>ctx.window.D4TripDays.changeTripDay(trip,'add'),/Maximum 90 days/);
});

test('mobile layout has accessible touch controls and date input',()=>{
 assert.match(css,/min-height:48px/);
 assert.match(css,/ref-day-date-edit input/);
 assert.match(css,/focus-visible/);
 assert.match(index,/trip-day-controls\.js\?build=40/);
 assert.match(index,/trip-day-controls\.css\?build=40/);
});
