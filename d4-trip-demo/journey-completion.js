/* D4 Trips · Journey completion UI, purely derived from existing trip records.
   No new Firestore documents, status fields, or permission changes. */
(function () {
  'use strict';
  if (typeof tripOverview !== 'function' || typeof tripPlan !== 'function') return;
  const oldOverview = tripOverview, oldPlan = tripPlan;
  let showFinishFor = '';
  const imageForDay = i => './milestone-day'+((i%3)+1)+'.svg';
  const clean = value => esc(String(value == null ? '' : value));
  const number = value => Number(value) || 0;
  const pct = (done,total) => total ? Math.round(100 * done / total) : 0;
  const datesFor = t => datesInTrip(t);
  function statsFor(t) {
    const dates = datesFor(t);
    const all = Array.isArray(t.plans) ? t.plans.filter(p => dates.includes(p.date)) : [];
    const done = all.filter(p=>!!p.done).length;
    return {dates,all,done,total:all.length,progress:pct(done,all.length),complete:all.length>0&&all.length===done};
  }
  function daily(t,date) {
    const steps=(Array.isArray(t.plans)?t.plans:[]).filter(p=>p.date===date);
    const done=steps.filter(p=>!!p.done).length;
    return {total:steps.length,done,percent:pct(done,steps.length),complete:steps.length>0&&done===steps.length};
  }
  function dayTitle(t,i) {
    const goa = /goa/i.test(String(t.destination||'')+' '+String(t.name||''));
    if (goa && datesFor(t).length===3) return ['Arrival & Explore','Adventure & Beach','Sightseeing & Return'][i]||'Trip Day';
    return 'Activities & Memories';
  }
  function header(t,s) {
    return '<section class="journey-cover"><div class="journey-brand">✦ D4 TRIPS <span>TRAVEL • PLAN • COMPLETE</span></div>'+
      '<h2>'+clean(t.name)+'</h2><p>📍 '+clean(t.destination)+' · '+clean(shortDate(t.start))+' – '+clean(shortDate(t.end))+'</p>'+
      '<div class="journey-cover-metrics"><div><b>'+t.members.length+'</b><span>Members</span></div>'+
      '<div><b>'+s.dates.length+'</b><span>Days</span></div><div><b>'+s.total+'</b><span>Milestones</span></div>'+
      '<div class="journey-ring" style="--journey-pct:'+s.progress+'%"><b>'+s.progress+'%</b><span>Complete</span></div></div></section>';
  }
  function dayCards(t,s) {
    return '<section class="journey-days" aria-label="Day-wise journey progress"><div class="journey-section-title">'+
      '<h3>📍 Trip Milestones</h3><small>'+s.done+' of '+s.total+' completed</small></div>'+
      s.dates.map((date,i)=>{
        const a=daily(t,date);
        const badge=a.complete?'✓ Day completed':a.done?'● In progress':'○ Upcoming';
        return '<button type="button" class="journey-day-card" data-d4-journey="day" data-date="'+clean(date)+'" aria-label="Open Day '+(i+1)+': '+clean(dayTitle(t,i))+'">'+
          '<img class="journey-day-art" src="'+imageForDay(i)+'" alt="" loading="lazy" decoding="async">'+
          '<span class="journey-day-main"><strong>Day '+(i+1)+'</strong><b>'+clean(dayTitle(t,i))+'</b>'+
          '<small>'+a.done+' / '+a.total+' milestones · '+clean(shortDate(date))+'</small>'+
          '<span class="journey-day-progress" aria-hidden="true"><i style="width:'+a.percent+'%"></i></span></span>'+
          '<span class="journey-day-right"><span class="'+(a.complete?'is-done':'')+'">'+badge+'</span><b>'+a.percent+'%</b><span aria-hidden="true">›</span></span>'+
          '</button>';
      }).join('')+'</section>';
  }
  function actions(t,s) {
    const disabled=!s.complete;
    return '<div class="journey-final-cta">'+(disabled?
       '<div class="journey-cta-note">🏁 Complete the remaining '+(s.total-s.done)+' milestone'+(s.total-s.done===1?'':'s')+' to unlock your Trip Completion screen.</div>':
       '<button type="button" class="journey-finish" data-d4-journey="finish">🏆 View Trip Completed! <span>››</span></button>')+
       '<p>Completion is calculated from your saved activities. No trip data is overwritten.</p></div>';
  }
  function finished(t,s) {
    if(!s.complete)return '<section class="journey-error"><h2>Complete your trip milestones first</h2><button type="button" data-d4-journey="back">← Back to Day Plan</button></section>';
    const c=collectionTotals(t),exp=calculations(t);
    return '<section class="journey-celebrate" aria-label="Trip completion summary">'+
      '<div class="journey-confetti" aria-hidden="true">✦ 🎉 ✨ 🎉 ✦</div>'+
      '<div class="journey-trophy" aria-hidden="true">🏆</div><h2>Trip Completed!</h2>'+
      '<p>'+clean(t.name)+' · '+s.dates.length+' unforgettable days</p>'+
      '<div class="journey-photo-stack" aria-hidden="true">'+s.dates.slice(0,3).map((d,i)=>'<img src="'+imageForDay(i)+'" alt="">').join('')+'</div>'+
      '<div class="journey-finish-stats"><div><b>'+t.members.length+'</b><span>Members</span></div>'+
      '<div><b>'+s.dates.length+'</b><span>Days</span></div><div><b>'+s.total+'</b><span>Milestones</span></div>'+
      '<div><b>'+s.done+'</b><span>Completed</span></div></div>'+
      '<div class="journey-summary"><h3>Trip Summary</h3>'+
      '<div><span>🧾 Total recorded expenses</span><strong>'+money(number(exp.total))+'</strong></div>'+
      '<div><span>✅ Payments received</span><strong>'+money(number(c.paid))+'</strong></div>'+
      '<div><span>⌛ Payments pending</span><strong>'+money(number(c.pending))+'</strong></div>'+
      '</div><div class="journey-memory-link"><strong>📸 Trip Memories</strong><small>Photos, videos & highlights from this trip</small></div>'+
      '<div class="journey-finish-buttons"><button type="button" data-d4-journey="report">📑 Open PDF Report</button>'+
      '<button type="button" data-d4-journey="memories">🖼️ View Memories</button></div>'+
      '<button type="button" class="journey-back" data-d4-journey="back">← Back to Milestones</button></section>';
  }
  tripOverview = function (t) {
    if(!t)return oldOverview(t);
    const s=statsFor(t);
    return '<div class="journey-overview">'+header(t,s)+dayCards(t,s)+actions(t,s)+
      '<details class="journey-extra"><summary>More Trip Tools & Details</summary><div>'+oldOverview(t)+'</div></details></div>';
  };
  tripPlan = function (t) {
    if(!t)return oldPlan(t);
    const s=statsFor(t);
    if (showFinishFor === t.id) return finished(t,s);
    const selected=s.dates.includes(daySelected)?daySelected:s.dates[0];
    const idx=Math.max(0,s.dates.indexOf(selected)), a=daily(t,selected);
    return '<div class="journey-plan-head"><button type="button" data-d4-journey="overview">← Trip Overview</button>'+
      '<span>Day '+(idx+1)+' / '+s.dates.length+' · '+a.done+'/'+a.total+' completed</span></div>'+
      oldPlan(t)+
      '<div class="journey-plan-footer">'+(a.complete?'<strong>✅ Day '+(idx+1)+' completed!</strong>':
        '<strong>📍 Day '+(idx+1)+' · '+(a.total-a.done)+' remaining</strong>')+
      (s.complete?'<button type="button" data-d4-journey="finish">🏆 View Trip Completed</button>':
        '<p>Tap Complete on each milestone to finish your journey.</p>')+'</div>';
  };
  document.addEventListener('click',event=>{
    const node=event.target.closest && event.target.closest('[data-d4-journey]');
    if(!node)return;
    event.preventDefault(); event.stopPropagation();
    const t=current(),action=node.dataset.d4Journey;
    if(!t||!canSee(t))return toast('Trip access required.');
    if(action==='day'){
      if(!datesFor(t).includes(node.dataset.date))return;
      daySelected=node.dataset.date; showFinishFor=''; tripTab='plan'; view='trip';render();return;
    }
    if(action==='finish'){
      if(!statsFor(t).complete)return toast('Complete all milestones first.');
      showFinishFor=t.id; tripTab='plan';view='trip';render();return;
    }
    showFinishFor='';
    if(action==='back'){tripTab='plan';render();return;}
    if(action==='overview'){tripTab='overview';render();return;}
    if(action==='memories'){tripTab='memories';render();return;}
    if(action==='report'){tripTab='report';render();return;}
  },true);
  window.D4JourneyCompletion={statsFor,daily,imageForDay};
})();
