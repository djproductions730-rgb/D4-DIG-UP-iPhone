const {test,after}=require('node:test');
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');
let env;
test('team roles, invitation isolation, revocation and revision checks',async()=>{
 env=await initializeTestEnvironment({projectId:'demo-d4-team',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync(require('node:path').join(__dirname,'firestore.rules'),'utf8')}});
 const db=(uid,email,verified=true)=>env.authenticatedContext(uid,{email,email_verified:verified}).firestore();
 const owner=db('2FYUUnPp1JX8wvv9HSvL6QoyaCq2','owner@test.example');
 const admin=db('admin','admin@test.example');
 const member=db('member','member@test.example');
 const outsider=db('outsider','outsider@test.example');
 const path='teamTrips/test-trip';
 const payload=(revision,updatedBy)=>({trip:{id:'test-trip',name:'Test Trip',members:['D'],expenses:[]},revision,updatedBy,updatedAt:serverTimestamp()});
 await assertSucceeds(setDoc(doc(owner,path),payload(1,'2FYUUnPp1JX8wvv9HSvL6QoyaCq2')));
 await assertFails(getDoc(doc(outsider,path)));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),path)));
 await assertSucceeds(setDoc(doc(owner,path+'/access/admin@test.example'),{role:'admin'}));
 await assertSucceeds(setDoc(doc(admin,path+'/access/member@test.example'),{role:'member'}));
 await assertSucceeds(getDoc(doc(member,path)));
 await assertFails(getDoc(doc(db('member','member@test.example',false),path)));
 await assertFails(setDoc(doc(member,path),payload(2,'member')));
 await assertSucceeds(setDoc(doc(admin,path),payload(2,'admin')));
 // Owner-only removal is enforced in Firestore rules, not just the interface.
 await assertFails(setDoc(doc(admin,path),{...payload(3,'admin'),trip:{id:'test-trip',name:'Test Trip',members:[],expenses:[]}}));
 await assertFails(setDoc(doc(admin,path),{...payload(3,'admin'),trip:{id:'test-trip',name:'Test Trip',members:['D'],expenses:[],archivedMembers:[{name:'D'}]}}));
 await assertFails(setDoc(doc(admin,path),payload(2,'admin')));
 await assertFails(setDoc(doc(admin,path+'/access/outsider@test.example'),{role:'admin'}));
 await assertFails(setDoc(doc(member,path+'/access/member@test.example'),{role:'admin'}));
 await assertFails(getDoc(doc(member,path+'/access/admin@test.example')));
 // Trip Admin cannot revoke a user, even if that user joined as a Member.
 await assertFails(deleteDoc(doc(admin,path+'/access/member@test.example')));
 await assertSucceeds(getDoc(doc(member,path)));
 await assertSucceeds(deleteDoc(doc(owner,path+'/access/member@test.example')));
 await assertFails(getDoc(doc(member,path)));
 await assertFails(setDoc(doc(admin,path+'/access/other@test.example'),{role:'member',extra:true}));
 await assertFails(setDoc(doc(owner,'teamTrips/missing/access/x@test.example'),{role:'member'}));
 // Owner identity cannot be spoofed through a display name or unverified email.
 await assertFails(setDoc(doc(db('fake-owner','owner@test.example'),path+'/access/escalate@test.example'),{role:'admin'}));
 await assertFails(getDoc(doc(db('2FYUUnPp1JX8wvv9HSvL6QoyaCq2','owner@test.example',false),path)));
 // Members cannot enumerate grants, create trips, edit protected role grants or delete trip history.
 const {getDocs,collection,updateDoc,writeBatch}=require('firebase/firestore');
 await assertFails(getDocs(collection(admin,path+'/access')));
 await assertFails(setDoc(doc(admin,'teamTrips/new-trip'),{...payload(1,'admin'),trip:{id:'new-trip',name:'New',members:[],expenses:[]}}));
 await assertFails(deleteDoc(doc(admin,path)));
 await assertFails(deleteDoc(doc(member,path)));
 await assertFails(deleteDoc(doc(db('2FYUUnPp1JX8wvv9HSvL6QoyaCq2','owner@test.example',false),path)));
 await assertFails(updateDoc(doc(admin,path+'/access/admin@test.example'),{role:'member'}));
 // Only Main Admin may promote and demote, and only for this trip.
 await assertSucceeds(setDoc(doc(owner,path+'/access/member@test.example'),{role:'member'}));
 await assertSucceeds(setDoc(doc(owner,path+'/access/member@test.example'),{role:'admin'}));
 await assertSucceeds(setDoc(doc(member,path),payload(3,'member')));
 await assertSucceeds(setDoc(doc(owner,path+'/access/member@test.example'),{role:'member'}));
 await assertFails(setDoc(doc(member,path),payload(4,'member')));
 await assertFails(getDoc(doc(member,'teamTrips/another-trip')));
 // Changing update identity, adding fields and malformed trip data are rejected.
 await assertFails(setDoc(doc(admin,path),payload(4,'member')));
 await assertFails(setDoc(doc(admin,path),{...payload(4,'admin'),extra:true}));
 await assertFails(setDoc(doc(admin,path),{...payload(4,'admin'),trip:{id:'different-id',name:'Test',members:[],expenses:[]}}));
 // Admin may add a member but cannot subsequently remove that same person.
 await assertSucceeds(setDoc(doc(admin,path),{...payload(4,'admin'),trip:{id:'test-trip',name:'Test Trip',members:['D','New Person'],expenses:[]}}));
 await assertFails(setDoc(doc(admin,path),{...payload(5,'admin'),trip:{id:'test-trip',name:'Test Trip',members:['D'],expenses:[]}}));
 await assertSucceeds(deleteDoc(doc(owner,path+'/access/admin@test.example')));
 await assertFails(getDoc(doc(admin,path)));
 await assertFails(setDoc(doc(admin,path),payload(4,'admin')));
 // A verified owner can atomically delete the trip and every existing grant.
 // It is forbidden to ordinary Admins and Members, tested above.
 const allGrants=await assertSucceeds(getDocs(collection(owner,path+'/access')));
 const deletion=writeBatch(owner);
 allGrants.forEach(entry=>deletion.delete(entry.ref));
 deletion.delete(doc(owner,path));
 await assertSucceeds(deletion.commit());
 const after=await assertSucceeds(getDoc(doc(owner,path)));
 if(after.exists())throw Error('Deleted trip still exists');
 await assertFails(getDoc(doc(member,path)));
});
after(async()=>env?.cleanup());
