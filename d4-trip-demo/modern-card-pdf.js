/* D4 Trip Modern Card — print/PDF only; never changes saved data. */
(function(){
'use strict';
const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v)=>Number(v)||0;
const cash=(v)=>'₹'+num(v).toLocaleString('en-IN',{maximumFractionDigits:2});
const cell=(v)=>safe(v===undefined||v===null?'—':v);
const date=(v)=>v?new Date(v+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
const sheet=(title,body,kind='')=>'<section class="mc-page '+kind+'"><header class="mc-head"><b>D4 <span>Trips</span></b><strong>'+title+'</strong></header>'+body+'<footer>D4 Trips · '+title+' · Generated '+new Date().toLocaleDateString('en-IN')+'</footer></section>';
const grid=(heads,rows)=>'<table class="mc-table"><thead><tr>'+heads.map(x=>'<th>'+safe(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table>';
const tr=(arr)=>'<tr>'+arr.map(x=>'<td>'+x+'</td>').join('')+'</tr>';
const card=(name,value)=>'<div class="mc-stat"><small>'+safe(name)+'</small><strong>'+value+'</strong></div>';
const title=(v)=>'<h2>'+safe(v)+'</h2>';
window.D4ModernCardPDF={
 render(t,calc,col,days){
  if(!t)return '';
  const members=Array.isArray(t.members)?t.members:[];
  const expenses=Array.isArray(t.expenses)?t.expenses:[];
  const plans=Array.isArray(t.plans)?t.plans:[];
  const notes=Array.isArray(t.notes)?t.notes:[];
  const files=Array.isArray(t.files)?t.files:[];
  const payments=Array.isArray(t.collection?.payments)?t.collection.payments:[];
  const rows=Array.isArray(col?.rows)?col.rows:[];
  const dates=Array.isArray(days)?days:[];
  const done=plans.filter(x=>x.done).length;
  const categories=Object.entries(calc?.categories||{}).sort((a,b)=>num(b[1])-num(a[1]));
  const paidMembers=rows.filter(x=>/^(paid|complete)$/i.test(String(x.status||''))).length;
  const unpaidMembers=rows.length-paidMembers;
  const info='<div class="mc-stats">'+card('Members',members.length)+card('Days',dates.length)+card('Milestones',plans.length)+card('Completed',plans.length?Math.round(done/plans.length*100)+'%':'0%')+'</div>';
  const cover=sheet('Trip Report','<div class="mc-cover"><p>GROUP TRIP REPORT</p><h1>'+cell(t.name)+'</h1><div class="mc-destination">'+cell(t.destination||'Trip destination')+'</div><div class="mc-cover-details">'+date(t.start)+' — '+date(t.end)+'<br>'+members.length+' Members · '+dates.length+' Days</div></div>','mc-cover-page');
  const overview=sheet('Trip Overview',title('Trip Overview')+info+'<div class="mc-stats">'+card('Total Expenses',cash(calc?.total))+card('Received',cash(col?.paid))+card('Pending',cash(col?.pending))+card('Expense Records',expenses.length)+'</div>'+title('Payment Progress')+'<div class="mc-progress"><div style="width:'+Math.max(0,Math.min(100,(num(col?.paid)+num(col?.pending))?100*num(col.paid)/(num(col.paid)+num(col.pending)):0))+'%"></div></div><p>Paid: '+cash(col?.paid)+' · Pending: '+cash(col?.pending)+'</p><p>Paid members: '+paidMembers+' · Other statuses: '+unpaidMembers+'</p>');
  const goa=/goa/i.test(String(t.destination||'')+' '+String(t.name||''));
  const goaDetails=goa?title('Goa Package (16 Members)')+grid(['Item','Amount','Status'],[tr(['Package / person',cash(8500),'Includes ₹1,000 advance']),tr(['Package total · 16',cash(136000),'']),tr(['Package advance · 16',cash(16000),'16 / 16 paid']),tr(['Package collected',cash(col?.paid),'Includes ₹16,000 advance']),tr(['Package pending',cash(col?.pending),'₹7,500 each until further payments']),tr(['Train ticket / person',cash(1150),'Paid · separate']),tr(['Train tickets · 16',cash(18400),'Paid · separate']),tr(['Train pending',cash(0),'None'])]):'';
  const membersPage=sheet('Member Payments',goaDetails+title('Member Payment Status')+'<p>Amounts reflect recorded contributions; no equal split is assumed.</p>'+grid(['Member','Target','Paid','Pending','Status'],rows.length?rows.map(x=>tr([cell(x.member),cash(x.target),cash(x.paid),cash(x.pending),cell(x.status)])):[tr(['No member payment records','—','—','—','—'])])+title('Payment Transactions')+grid(['Date','Member','Amount','Method'],payments.length?payments.map(x=>tr([date(x.date),cell(x.member),cash(x.amount),cell(x.method||'Manual')])):[tr(['No payments recorded','—','—','—'])]));
  const expensePage=sheet('Expense Summary',title('Expense Breakdown')+'<div class="mc-stats">'+card('Total Spent',cash(calc?.total))+card('Expense Records',expenses.length)+'</div>'+grid(['Category','Amount','Share'],categories.length?categories.map(([k,v])=>tr([cell(k),cash(v),num(calc?.total)?(100*num(v)/num(calc.total)).toFixed(1)+'%':'0%'])):[tr(['No expenses recorded','—','—'])])+title('Expense Details')+grid(['Date','Description','Paid By','Method','Amount'],expenses.length?expenses.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).map(x=>tr([date(x.date),cell((x.category||'Other')+' — '+(x.note||'')),cell(x.paidBy),cell(x.method),cash(x.amount)])):[tr(['No expenses recorded','—','—','—','—'])]));
  const dayPage=sheet('Day Plan & Milestones',title('Day-by-Day Journey')+info+grid(['Day','Date','Activity','Location','Status'],plans.length?plans.slice().sort((a,b)=>(String(a.date||'')+String(a.time||'')).localeCompare(String(b.date||'')+String(b.time||''))).map(p=>tr([cell(p.time||'Flexible'),date(p.date),cell(p.title),cell(p.place),p.done?'Completed':'Upcoming'])):[tr(['No milestones recorded','—','—','—','—'])])+title('Day-wise Expenses')+grid(['Day','Date','Spent'],dates.length?dates.map((d,i)=>tr(['Day '+(i+1),date(d),cash(calc?.daily?.[d])])):[tr(['No trip dates','—','—'])]));
  const allDone=plans.length>0&&done===plans.length;
  const closing=sheet('Trip Summary','<div class="mc-finale"><div class="mc-trophy">'+(allDone?'★':'✈')+'</div><h1>'+(allDone?'Trip Completed!':'Trip Progress Report')+'</h1><p>'+cell(t.name)+'</p><strong>'+done+' / '+plans.length+' milestones completed</strong></div><div class="mc-stats">'+card('Total Spent',cash(calc?.total))+card('Received',cash(col?.paid))+card('Pending',cash(col?.pending))+card('Members',members.length)+'</div>'+title('Trip Notes')+(notes.length?notes.map(n=>'<p><b>'+date(n.date)+' · '+cell(n.by)+'</b>: '+cell(n.text)+'</p>').join(''):'<p>No notes recorded.</p>')+title('Receipts & Attachments')+'<p>'+files.length+' uploaded files · '+expenses.filter(x=>x.receipt).length+' expense receipts. Original files must be shared separately.</p>');
  return '<div class="print-report mc-report">'+cover+overview+membersPage+expensePage+dayPage+closing+'</div>';
 }
};
})();
