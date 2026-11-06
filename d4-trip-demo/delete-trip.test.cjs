'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const begin=html.indexOf('function deleteLocalTrip('),end=html.indexOf('function datesInTrip(',begin);
assert.ok(begin>=0&&end>begin,'Actual deletion function must exist');
const code=html.slice(begin,end);
function harness({owner=true,team=false,saved=true}={}){
 const a={id:'trip-a',name:'Goa',members:['D','M'],expenses:[{id:'ex1',amount:100}],collection:{payments:[{id:'p1',amount:50}]}};
 const b={id:'trip-b',name:'Ooty',members:['D'],expenses:[{id:'ex2',amount:200}],collection:{payments:[]}};
 const db={trips:[a,b]},initial=JSON.stringify(db);
 let calls=0;
 const ctx=vm.createContext({db,activeTrip:'trip-a',teamId:team?'trip-a':'',isMain:()=>owner,
   trip:id=>db.trips.find(t=>t.id===id),persist:()=>{calls++;return saved}});
 vm.runInContext(code,ctx);
 return {db,ctx,initial,get calls(){return calls}};
}
test('Main Admin deletes only selected local trip while preserving unrelated trip',()=>{
 const h=harness();h.ctx.deleteLocalTrip('trip-a');
 assert.deepEqual(h.db.trips.map(t=>t.id),['trip-b']);
 assert.deepEqual(h.db.trips[0].expenses,[{id:'ex2',amount:200}]);
 assert.equal(h.ctx.activeTrip,'trip-b');
 assert.equal(h.calls,1);
});
test('ordinary members and Trip Admins cannot delete trips',()=>{
 const h=harness({owner:false});
 assert.throws(()=>h.ctx.deleteLocalTrip('trip-a'),/Only Main Admin/);
 assert.equal(JSON.stringify(h.db),h.initial);assert.equal(h.calls,0);
});
test('shared trips cannot be deleted using local-only deletion',()=>{
 const h=harness({team:true});
 assert.throws(()=>h.ctx.deleteLocalTrip('trip-a'),/Only Main Admin/);
 assert.equal(JSON.stringify(h.db),h.initial);
});
test('failed local persistence restores every trip and active selection',()=>{
 const h=harness({saved:false});
 assert.throws(()=>h.ctx.deleteLocalTrip('trip-a'),/not saved/);
 assert.equal(JSON.stringify(h.db),h.initial);
 assert.equal(h.ctx.activeTrip,'trip-a');
});
test('nonexistent trip cannot delete any other trip',()=>{
 const h=harness();
 assert.throws(()=>h.ctx.deleteLocalTrip('missing'),/no longer exists/);
 assert.equal(JSON.stringify(h.db),h.initial);
});
