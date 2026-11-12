'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
function extract(begin, end) {
  const from = html.indexOf(begin), to = html.indexOf(end, from + begin.length);
  assert.ok(from >= 0 && to > from, 'Cannot locate real app function ' + begin);
  return html.slice(from, to);
}
const source = [
  extract('function collectionTotals(t){', 'function collectionPill('),
  extract('function collectionSave(t,member,', 'function calculations(t)'),
  extract('function tripMembers(t){', 'function chatsPage(t)'),
  extract('function chatsPage(t){', 'function tripReminders(t)')
].join('\n') + '\nthis.behavior={collectionTotals,collectionSave,tripMembers,chatsPage};';

function harness() {
  let allowed = true, owner = false, persisted = true, calls = 0, serial = 0;
  const notices = [];
  const context = vm.createContext({
    window: {}, profile: 'Admin', chatRoom: 'group',
    isTripAdmin: () => allowed,
    isMain: () => owner,
    persist: () => {calls++; return persisted;},
    uid: () => 'payment-' + ++serial,
    today: () => '2026-11-04',
    money: n => '₹' + Number(n).toFixed(2),
    esc: value => String(value).replace(/[&<>"']/g, c =>
      ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c])),
    sec: (_title,action) => action ? '<button data-action="'+action+'">Add</button>' : '',
    toast: n => notices.push(n)
  });
  vm.runInContext(source, context, {filename:'d4-trip-milestone03-functions.js'});
  const trip = {
    id:'test-trip', name:'Test Trip', members:['D','A','B'],
    admins:['Admin'], collection:{targetPerPerson:8000,payments:[]},
    expenses:[], chats:{admins:[],group:[]}
  };
  return {
    fn: context.behavior, context, trip, notices,
    allow: value => {allowed=value;},
    owner: value => {owner=value;},
    persistence: value => {persisted=value;},
    get writes(){return calls;}
  };
}

test('advance then balance payments yield accurate paid, remaining and status', () => {
  const h = harness();
  const {collectionSave, collectionTotals} = h.fn;
  collectionSave(h.trip,'A',3000,'UPI','ADVANCE');
  let row = collectionTotals(h.trip).rows.find(x=>x.member==='A');
  assert.equal(row.paid,3000);
  assert.equal(row.pending,5000);
  assert.equal(row.status,'Partial');
  collectionSave(h.trip,'A',5000,'UPI','BALANCE');
  row = collectionTotals(h.trip).rows.find(x=>x.member==='A');
  assert.equal(row.paid,8000);
  assert.equal(row.pending,0);
  assert.equal(row.status,'Paid');
  const summary=collectionTotals(h.trip);
  assert.equal(summary.full,1);
  assert.equal(summary.partial,0);
  assert.equal(summary.unpaid,2);
  assert.equal(summary.target,24000);
  assert.equal(summary.pending,16000);
});

test('decimal amounts track paise and stop overpayment', () => {
  const h = harness();
  h.trip.collection.targetPerPerson=100.01;
  h.fn.collectionSave(h.trip,'B',20.55);
  const row = h.fn.collectionTotals(h.trip).rows.find(x=>x.member==='B');
  assert.ok(Math.abs(row.pending-79.46)<1e-6);
  assert.throws(()=>h.fn.collectionSave(h.trip,'B',79.47),/exceeds remaining/);
  h.fn.collectionSave(h.trip,'B',79.46);
  assert.equal(h.fn.collectionTotals(h.trip).rows.find(x=>x.member==='B').status,'Paid');
  assert.equal(h.trip.collection.payments.length,2);
});

test('invalid amounts, unknown members and unauthorized writes are rejected', () => {
  const h = harness();
  assert.throws(()=>h.fn.collectionSave(h.trip,'X',100),/valid trip member/);
  assert.throws(()=>h.fn.collectionSave(h.trip,'A',0),/valid amount/);
  assert.throws(()=>h.fn.collectionSave(h.trip,'A',-2),/valid amount/);
  h.allow(false);
  assert.throws(()=>h.fn.collectionSave(h.trip,'A',150),/Trip Admin/);
  assert.equal(h.trip.collection.payments.length,0);
});

test('failed storage write rolls back a new payment', () => {
  const h = harness();
  h.persistence(false);
  assert.throws(()=>h.fn.collectionSave(h.trip,'A',100),/not saved/);
  assert.equal(h.trip.collection.payments.length,0);
});

test('members view includes save-path entry and guarded removal button', () => {
  const h = harness();
  h.owner(true);
  const html = h.fn.tripMembers(h.trip);
  assert.match(html,/data-action="remove-member"/);
  assert.match(html,/data-action="modal-add-member"/);
  assert.doesNotMatch(html,/data-member="D"/);
  h.allow(false);
  const readOnly = h.fn.tripMembers(h.trip);
  assert.doesNotMatch(readOnly,/data-action="remove-member"/);
});

test('chat remains upcoming for owners and members without a misleading composer', () => {
  const h = harness();
  h.trip.chats.group=[{from:'A',text:'<img src=x onerror=alert(1)>',time:'10:00'}];
  for (const owner of [true,false]) {
    h.owner(owner);
    for (const room of ['group','direct:A','admins']) {
      h.context.chatRoom=room;
      const rendered=h.fn.chatsPage(h.trip);
      assert.match(rendered,/Upcoming/);
      assert.doesNotMatch(rendered,/id="chatForm"|id="directChatMember"|<img/);
    }
  }
});
