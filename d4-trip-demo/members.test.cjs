'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const source=html.slice(html.indexOf('function changeTripMember('),html.indexOf('function tripMembers('));
function setupContext(admin=true,owner=true,save=true){
 const ctx=vm.createContext({isTripAdmin:()=>admin,isMain:()=>owner,persist:()=>save,profile:'D',structuredClone});
 vm.runInContext(source,ctx);return ctx;
}
const setup=(admin=true,owner=true,save=true)=>setupContext(admin,owner,save).changeTripMember;
const trip=()=>({members:['D','Arun','Mani'],admins:['Arun'],expenses:[{paidBy:'Mani',participants:['Mani','Arun'],shares:{Mani:100}}],collection:{payments:[{member:'Mani',amount:100}]},settlementsPaid:[{from:'Mani',to:'Arun'}],chats:{group:[{from:'Mani'}],admins:[]}});
test('rename updates payments, shares, expenses, settlements and message authors',()=>{const t=trip();setup()(t,'Mani','Mani K');assert.equal(t.expenses[0].paidBy,'Mani K');assert.equal(t.expenses[0].shares['Mani K'],100);assert.equal(t.expenses[0].shares.Mani,undefined);assert.equal(t.collection.payments[0].member,'Mani K');assert.equal(t.settlementsPaid[0].from,'Mani K');assert.equal(t.chats.group[0].from,'Mani K');});
test('only Main Admin may remove, rename or restore members',()=>{
 assert.throws(()=>setup(false,false)(trip(),'Mani','M'),/Only Main Admin/);
 assert.throws(()=>setup(true,false)(trip(),'Mani','M'),/Only Main Admin/);
 assert.throws(()=>setup(true,false)(trip(),'Mani','',true),/Only Main Admin/);
 assert.throws(()=>setup(true,false)(trip(),'Arun','A'),/Only Main Admin/);
 const t=trip(),owner=setupContext(true,true);
 owner.changeTripMember(t,'Mani','',true);
 assert.throws(()=>setupContext(true,false).restoreTripMember(t,'Mani'),/Only Main Admin/);
 assert.equal(t.members.includes('Mani'),false);
});
test('cannot remove owner; removing a paid member archives them without altering financial history',()=>{
 const t=trip(),before=JSON.stringify({expenses:t.expenses,payments:t.collection.payments,settlements:t.settlementsPaid});
 assert.throws(()=>setup()(t,'D','',true));
 setup()(t,'Mani','',true);
 assert.deepEqual(t.members,['D','Arun']);
 assert.equal(t.admins.includes('Mani'),false);
 assert.equal(t.archivedMembers[0].name,'Mani');
 assert.equal(typeof t.archivedMembers[0].removedAt,'string');
 assert.equal(JSON.stringify({expenses:t.expenses,payments:t.collection.payments,settlements:t.settlementsPaid}),before);
});
test('reject duplicate and reserved names',()=>{assert.throws(()=>setup()(trip(),'Mani','arun'));assert.throws(()=>setup()(trip(),'Mani','D'));});
test('remove unused member and restore state if persistence fails',()=>{let t=trip();t.members.push('New');setup()(t,'New','',true);assert.equal(t.members.includes('New'),false);t=trip();const before=JSON.stringify(t);assert.throws(()=>setup(true,true,false)(t,'Mani','M'));assert.equal(JSON.stringify(t),before);});

test('restoring a removed member keeps original payments and rejoins as a regular member',()=>{
 const ctx=setupContext(),t=trip();
 ctx.changeTripMember(t,'Mani','',true);
 ctx.restoreTripMember(t,'Mani');
 assert.ok(t.members.includes('Mani'));
 assert.equal(t.archivedMembers.length,0);
 assert.equal(t.collection.payments[0].member,'Mani');
 assert.throws(()=>ctx.restoreTripMember(t,'Mani'));
});
test('archived names cannot be assigned to another current member',()=>{
 const t=trip(),fn=setup();
 fn(t,'Mani','',true);
 assert.throws(()=>fn(t,'Arun','Mani'),/removed member/);
});
test('failed removal and restore both roll back data',()=>{
 const t=trip(),before=JSON.stringify(t);
 assert.throws(()=>setup(true,true,false)(t,'Mani','',true));
 assert.equal(JSON.stringify(t),before);
 const ctx=setupContext();ctx.changeTripMember(t,'Mani','',true);
 const archived=JSON.stringify(t);
 assert.throws(()=>setupContext(true,true,false).restoreTripMember(t,'Mani'));
 assert.equal(JSON.stringify(t),archived);
});
test('removed payments remain in the historical total but not active scoreboard',()=>{
 const t=trip();t.collection.targetPerPerson=200;
 t.collection.payments.push({member:'Arun',amount:50});
 const src=html.slice(html.indexOf('function collectionTotals('),html.indexOf('function collectionPill('));
 const ctx=vm.createContext({});
 vm.runInContext(src,ctx);
 setup()(t,'Mani','',true);
 const c=ctx.collectionTotals(t);
 assert.equal(c.paid,50);
 assert.equal(c.archivedPaid,100);
 assert.equal(c.totalRecorded,150);
 assert.equal(c.target,400);
 assert.equal(c.rows.length,2);
});
