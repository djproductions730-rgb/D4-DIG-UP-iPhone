/* D4 Trip · Day date controls v40
 * Presentation + permission-scoped updates through existing saveTripChange.
 * The itinerary is consecutive; editing a selected Day date shifts the full
 * trip calendar and its planned activities, without rewriting expense/payment records.
 */
(function(){
  'use strict';
  const oldTripPlan=tripPlan;
  const isoDate=raw=>{const s=String(raw||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
    const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s?s:null};
  const plusDays=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  const deltaDays=(a,b)=>Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/86400000);
  const between=(d,a,b)=>typeof d==='string'&&d>=a&&d<=b;
  const hasSchedule=(t,date)=>[
    ['activity',t.plans],['expense',t.expenses],['note',t.notes],['reminder',t.reminders],
    ['memory',t.memories],['file',t.files]
  ].filter(([_name,items])=>Array.isArray(items)&&items.some(x=>x.date===date))
   .map(([name])=>name);
  const authorized=t=>!!t&&isTripAdmin(t);
  function changeTripDay(t,mode,date){
    if(!authorized(t))throw Error('Only Main Admin or Trip Admin can edit trip dates');
    const days=datesInTrip(t),count=days.length;
    if(!count||!isoDate(t.start)||!isoDate(t.end))throw Error('Trip date range is invalid');
    if(mode==='add'){
      if(count>=90)throw Error('Maximum 90 days per trip');
      const end=plusDays(t.end,1);
      if(!isoDate(end))throw Error('New end date is invalid');
      saveTripChange(t,()=>{t.end=end});
      daySelected=end;
      return 'Added Day '+(count+1)+' · '+fmtDate(end);
    }
    if(mode==='remove'){
      if(count<=1)throw Error('A trip needs at least one day');
      const last=t.end,linked=hasSchedule(t,last);
      if(linked.length)throw Error('Cannot remove '+fmtDate(last)+': '+linked.join(', ')+' saved for this day. Move them first.');
      if(!confirm('Remove the last empty day ('+fmtDate(last)+')? Existing members, payments and other days remain unchanged.'))return '';
      const end=plusDays(last,-1);
      saveTripChange(t,()=>{t.end=end});
      daySelected=days.includes(daySelected)&&daySelected!==last?daySelected:end;
      return 'Removed empty last day. Trip now has '+(count-1)+' days.';
    }
    if(mode==='shift'){
      const next=isoDate(date);
      if(!next)throw Error('Choose a valid day date');
      const currentDate=days.includes(daySelected)?daySelected:days[0];
      const difference=deltaDays(currentDate,next);
      if(!difference)return 'This day already has that date';
      const start=plusDays(t.start,difference),end=plusDays(t.end,difference);
      if(!isoDate(start)||!isoDate(end))throw Error('Shift would exceed supported dates');
      if(!confirm('Move the whole '+count+'-day trip calendar by '+Math.abs(difference)+' day(s) '+(difference>0?'forward':'back')+'?\n\nPlanned activities, day notes and reminders will move with their days. Expense, receipt and payment transaction dates are unchanged.'))return '';
      const previousStart=t.start,previousEnd=t.end;
      saveTripChange(t,()=>{
        const shift=(arr)=>{if(!Array.isArray(arr))return;
          arr.forEach(item=>{if(between(item.date,previousStart,previousEnd))item.date=plusDays(item.date,difference)})};
        shift(t.plans);shift(t.notes);shift(t.reminders);
        t.start=start;t.end=end;
      });
      daySelected=next;
      return 'Trip dates updated · '+fmtDate(start)+' – '+fmtDate(end);
    }
    throw Error('Unknown day action');
  }
  function dayToolbar(t){
    const days=datesInTrip(t),selected=days.includes(daySelected)?daySelected:days[0];
    const idx=Math.max(0,days.indexOf(selected));
    const admin=authorized(t);
    return '<section class="ref-day-control" aria-label="Trip dates and day count">'+
      '<div class="ref-day-control-head"><div><span class="ref-overline">✦ TRIP CALENDAR</span>'+
      '<h3>Trip Days & Dates</h3><p>'+fmtDate(t.start)+' – '+fmtDate(t.end)+'</p></div>'+
      '<span class="ref-day-count"><b>'+days.length+'</b><small>Days</small></span></div>'+
      '<div class="ref-day-select"><span>Selected</span><strong>Day '+(idx+1)+'</strong><b>'+fmtDate(selected)+'</b></div>'+
      (admin?
        '<div class="ref-day-buttons">'+
          '<button type="button" class="ref-day-minus" data-trip-day-action="remove"'+(days.length<=1?' disabled':'')+' aria-label="Remove last empty trip day">− <span>Day</span></button>'+
          '<button type="button" class="ref-day-plus" data-trip-day-action="add"'+(days.length>=90?' disabled':'')+' aria-label="Add one trip day">＋ <span>Day</span></button>'+
          '<button type="button" class="ref-day-edit" data-action="plan-dates" aria-label="Edit trip start and end dates">✎ Edit Dates</button>'+
        '</div>'+
        '<p class="ref-day-button-help">＋ adds a day at the end. − removes the last empty day only.</p>'+
        '<div class="ref-day-date-edit"><label for="ref-selected-day-date">Change Day '+(idx+1)+' date</label>'+
        '<div><input type="date" id="ref-selected-day-date" value="'+selected+'" aria-describedby="ref-day-edit-note">'+
        '<button type="button" data-trip-day-action="shift" aria-label="Save selected day date and move itinerary">Save Date</button></div>'+
        '<p id="ref-day-edit-note">Day dates stay consecutive. Changing this date moves all '+days.length+' days and their planned activities together.</p></div>'
        :'<p class="ref-day-view-only">🔒 Members can view all days; only admins can change the calendar.</p>')+
      '</section>';
  }
  tripPlan=function(t){
    const content=oldTripPlan(t);
    if(!t)return content;
    return dayToolbar(t)+content;
  };
  document.addEventListener('click',function(event){
    const button=event.target.closest?.('[data-trip-day-action]');
    if(!button)return;
    event.preventDefault();event.stopPropagation();
    const t=current(),mode=button.dataset.tripDayAction;
    try{
      if(!authorized(t))throw Error('Only Main Admin or Trip Admin can edit dates');
      const date=mode==='shift'?document.querySelector('#ref-selected-day-date')?.value:'';
      const result=changeTripDay(t,mode,date);
      if(result){tripTab='plan';render();toast(result)}
    }catch(error){toast(error?.message||'Could not update trip dates')}
  },true);
  window.D4TripDays={changeTripDay,isoDate,plusDays,hasSchedule};
})();
