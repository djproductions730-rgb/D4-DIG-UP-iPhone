'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const source=html.slice(html.indexOf('function changeTripMember('),html.indexOf('function tripMembers('));
function setup(admin=true,owner=true,save=true){
 const ctx=vm.createContext({isTripAdmin:()=>admin,isMain:()=>owner,persist:()=>save});
 vm.runInContext(source,ctx);return ctx.changeTripMember;
}
const trip=()=>({members:['D','Arun','Mani'],admins:['Arun'],expenses:[{paidBy:'Mani',participants:['Mani','Arun'],shares:{Mani:100}}],collection:{payments:[{member:'Mani',amount:100}]},settlementsPaid:[{from:'Mani',to:'Arun'}],chats:{group:[{from:'Mani'}],admins:[]}});
test('rename updates payments, shares, expenses, settlements and message authors',()=>{const t=trip();setup()(t,'Mani','Mani K');assert.equal(t.expenses[0].paidBy,'Mani K');assert.equal(t.expenses[0].shares['Mani K'],100);assert.equal(t.expenses[0].shares.Mani,undefined);assert.equal(t.collection.payments[0].member,'Mani K');assert.equal(t.settlementsPaid[0].from,'Mani K');assert.equal(t.chats.group[0].from,'Mani K');});
test('member cannot mutate roster and trip admin cannot change another admin',()=>{assert.throws(()=>setup(false)(trip(),'Mani','M'));assert.throws(()=>setup(true,false)(trip(),'Arun','A'));});
test('cannot remove owner or erase financial history',()=>{assert.throws(()=>setup()(trip(),'D','',true));assert.throws(()=>setup()(trip(),'Mani','',true));});
test('reject duplicate and reserved names',()=>{assert.throws(()=>setup()(trip(),'Mani','arun'));assert.throws(()=>setup()(trip(),'Mani','D'));});
test('remove unused member and restore state if persistence fails',()=>{let t=trip();t.members.push('New');setup()(t,'New','',true);assert.equal(t.members.includes('New'),false);t=trip();const before=JSON.stringify(t);assert.throws(()=>setup(true,true,false)(t,'Mani','M'));assert.equal(JSON.stringify(t),before);});
