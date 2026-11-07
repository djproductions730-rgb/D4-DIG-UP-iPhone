/* D4 Trip — Goa day-by-day milestone timeline.
   Imported template adds missing stops only; original activities, IDs and completion states are preserved.
   The scenic photos are decorative travel imagery, not verified photos of the named places. */
(function () {
  'use strict';
  if (typeof tripPlan !== 'function') return;
  const previousTripPlan = tripPlan;
  const goaDays = [
    {label:'North Goa • Sightseeing',steps:[
      ['🚆','Madgaon Railway Station Pickup','Pickup 4:00–5:00 AM · Madgaon Railway Station','Travel','04:00','4:00–5:00 AM','rail-pickup'],
      ['🧳','Hotel Luggage Drop & Fresh Up','Reception luggage storage · Party hall washroom','Stay','','Flexible','hotel-reception'],
      ['🛵','Bike & Car Collection','Collect two-wheeler and car','Travel','08:00','8:00–9:00 AM','vehicle-collection'],
      ['🚀','Start from Hotel','Begin North Goa sightseeing','Travel','09:30','9:30–10:00 AM','hotel-start'],
      ['🏰','Fort Aguada','North Goa fort visit','Sightseeing','','Flexible','fort-aguada'],
      ['💡','Lighthouse View Point','Aguada lighthouse viewpoint','Sightseeing','','Flexible','lighthouse'],
      ['🏰','Lower Aguada Fort','Lower Aguada sightseeing','Sightseeing','','Flexible','lower-aguada'],
      ['🏖️','Sinquerim Beach','North Goa beach stop','Sightseeing','','Flexible','sinquerim'],
      ['🏖️','Candolim Beach','North Goa beach stop','Sightseeing','','Flexible','candolim'],
      ['🍽️','Lunch Break','Lunch during sightseeing','Food','','Flexible','lunch-1'],
      ['🏨','Return to Hotel for Check-in','Hotel check-in, then continue sightseeing','Stay','','Flexible','hotel-checkin'],
      ['🏰','Chapora Fort','Chapora Fort visit','Sightseeing','','Flexible','chapora'],
      ['🏖️','Anjuna Beach','Beach sightseeing','Sightseeing','','Flexible','anjuna'],
      ['🏖️','Vagator Beach','Beach sightseeing','Sightseeing','','Flexible','vagator'],
      ['🏖️','Calangute Beach','Beach sightseeing','Sightseeing','','Flexible','calangute'],
      ['🏨','Return to Hotel','Fresh up before the dinner cruise','Stay','','Flexible','hotel-return'],
      ['🚌','Luxury Dinner Cruise Pickup','Cruise transfer pickup','Travel','19:00','7:00–7:30 PM','cruise-pickup'],
      ['🥗','Cruise Starters','Veg or non-veg starters','Food','','During cruise','cruise-starters'],
      ['🌙','Luxury Dinner Cruise Party','Dinner, music and party on the cruise','Activity','','Evening','cruise-party'],
      ['🥂','Cruise Included Drinks','Two beers or hot drinks, as stated in package','Food','','During cruise','cruise-drinks'],
      ['🚌','Cruise Drop-off','Return transfer · 12:00–12:30 AM the next day','Travel','','12:00–12:30 AM (next day)','cruise-drop'],
      ['🛌','Overnight Hotel Stay','Rest at the hotel','Stay','','Overnight','night-1']
    ]},
    {label:'Malvan • Water Adventure',steps:[
      ['🚌','Malvan Water Sports Pickup','VP Holidays · Malvan Fort Island excursion','Travel','07:00','7:00 AM','malvan-pickup'],
      ['🍳','Adventure Breakfast','Vegetarian breakfast (limited)','Food','','During tour','malvan-breakfast'],
      ['🦺','Safety Training & Equipment','Safety gear, briefing and instructor guidance','Activity','','During tour','malvan-safety'],
      ['🪂','Parasailing','Water sports ride 1 of 5','Activity','','During tour','parasailing'],
      ['🏍️','Jet Ski','Water sports ride 2 of 5','Activity','','During tour','jetski'],
      ['🍌','Banana Ride','Water sports ride 3 of 5','Activity','','During tour','banana'],
      ['🚤','Boat Ride','Water sports ride 4 of 5','Activity','','During tour','boat'],
      ['🛟','Sleeping Bumper Ride','Water sports ride 5 of 5','Activity','','During tour','bumper'],
      ['🤿','Open Sea Scuba Diving','Expert / PADI guidance · non-swimmers with safety guidance','Activity','','During tour','scuba'],
      ['🎥','Complimentary Underwater Video','Collect the included underwater video','Photos','','During tour','underwater-video'],
      ['🍱','Adventure Lunch','Limited veg or non-veg lunch','Food','','During tour','malvan-lunch'],
      ['🌴','Beach & Water Sports Time','Continue beach activities before return','Sightseeing','','During tour','malvan-beach'],
      ['🚌','Malvan Evening Drop Back','Full adventure tour approximately 7 AM–6 PM','Travel','18:00','Around 6:00 PM','malvan-drop'],
      ['🎶','Baga Beach DJ Night Party','DJ music and colourful beach night','Activity','19:00','7:00–8:30 PM','baga-dj'],
      ['🏨','Return to Hotel','After Baga party','Stay','','Evening','hotel-return-2'],
      ['🍽️','Buffet Dinner','Dinner at hotel','Food','','Evening','dinner-2'],
      ['🛌','Overnight Hotel Stay','Rest after adventure day','Stay','','Overnight','night-2']
    ]},
    {label:'South Goa • Heritage & Return',steps:[
      ['🍳','Breakfast','Breakfast before check-out','Food','','Morning','breakfast-3'],
      ['🏨','Hotel Check-out','Check-out between 10:00 and 11:00 AM','Stay','10:00','10:00–11:00 AM','checkout'],
      ['🛵','Start from Hotel','South Goa sightseeing begins','Travel','','After check-out','hotel-start-3'],
      ['⛪','Old Goa Church','Old Goa heritage stop','Sightseeing','','Flexible','old-goa-church'],
      ['🛕','Mangeshi Temple','Temple sightseeing','Sightseeing','','Flexible','mangeshi'],
      ['🏖️','Miramar Beach','Beach visit','Sightseeing','','Flexible','miramar'],
      ['🍽️','Lunch Break','Lunch during sightseeing','Food','','Flexible','lunch-3'],
      ['🌊','Dona Paula View Point','Scenic coastal viewpoint','Sightseeing','','Flexible','dona-paula'],
      ['💦','Dudhsagar Waterfalls','Waterfall excursion · verify travel and access time','Sightseeing','','Flexible','dudhsagar'],
      ['🛍️','Panjim Shopping','Shopping in Panjim','Shopping','','Flexible','panjim-shopping'],
      ['🏨','Return to Hotel & Fresh Up','Return between 7:00 and 8:00 PM','Stay','19:00','7:00–8:00 PM','hotel-return-3'],
      ['🛵','Bike & Car Handover','Hand over vehicles at hotel before journey home','Travel','','After return','bike-handover'],
      ['🚆','Madgaon Railway Station Drop','Railway station transfer included','Travel','','After handover','rail-drop']
    ]}
  ];

  const photoUrls = {
    beach:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=160&q=65',
    water:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=160&q=65',
    mountains:'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=160&q=65'
  };
  const htmlSafe = s => esc(s);
  const textKey = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function iconFor(p) {
    if (p.goaIcon) return p.goaIcon;
    const v=String(p.title||'').toLowerCase();
    if (/madga|railway|station|train/.test(v)) return '🚆';
    if (/bike|scooter|car collection|vehicle/.test(v)) return '🛵';
    if (/scuba/.test(v)) return '🤿';
    if (/fort/.test(v)) return '🏰';
    if (/lighthouse/.test(v)) return '💡';
    if (/beach/.test(v)) return '🏖️';
    if (/waterfall|dudhsagar/.test(v)) return '💦';
    if (/hotel|check.in|stay|reception/.test(v)) return '🏨';
    if (/cruise/.test(v)) return '🛳️';
    if (/lunch|dinner|breakfast|food/.test(v)) return '🍽️';
    if (/shopping/.test(v)) return '🛍️';
    if (/start|pickup|pick.up|drop/.test(v)) return '🚐';
    return (planPalette[planCategory(p)]||planPalette.Other).emoji;
  }
  function artFor(p) {
    const v=String(p.title||'').toLowerCase();
    if (/water sport|scuba|parasail|jet ski|banana ride|boat ride|bumper|dive/.test(v)) return photoUrls.water;
    if (/beach|lighthouse|cruise|view point|dona paula|miramar/.test(v)) return photoUrls.beach;
    if (/waterfall|dudhsagar/.test(v)) return photoUrls.mountains;
    return '';
  }
  function dayIndex(t,date){return datesInTrip(t).indexOf(date);}
  function templateStepRank(p,day) {
    if (Number.isFinite(p.goaStep)) return p.goaStep;
    if (!day) return 999;
    if (!p.time) return 999;
    const minutes = Number(p.time.slice(0,2))*60 + Number(p.time.slice(3,5));
    let step = 0;
    day.steps.forEach((s,i) => {
      if (s[4] && Number(s[4].slice(0,2))*60 + Number(s[4].slice(3,5)) <= minutes) step=i+1;
    });
    return step + 0.5;
  }
  function sortSteps(a,b,day) {
    return templateStepRank(a,day)-templateStepRank(b,day) ||
      String(a.time||'').localeCompare(String(b.time||'')) ||
      String(a.title||'').localeCompare(String(b.title||''));
  }
  function renderMilestones(t) {
    const original = previousTripPlan(t);
    const marker='<div class="plan-timeline">';
    const noteMarker='<div class="plan-view-note">';
    const start=original.indexOf(marker);
    const end=original.indexOf(noteMarker,start+marker.length);
    if(start<0 || end<0) return original;
    const dates=datesInTrip(t),di=dayIndex(t,daySelected),day=goaDays[di];
    const items=t.plans.filter(p=>p.date===daySelected);
    const loaded=items.some(p=>p.goaPresetKey);
    const ordered=items.sort((a,b)=>loaded?sortSteps(a,b,day):String(a.time||'').localeCompare(String(b.time||'')));
    const next=ordered.find(p=>!p.done),completed=ordered.filter(p=>!!p.done).length;
    const pct=ordered.length?Math.round(100*completed/ordered.length):0;
    const admin=isTripAdmin(t),goa=String(t.kind||'').toLowerCase()==='goa'||/goa/i.test((t.name||'')+' '+(t.destination||''));
    const title=loaded && day ? 'Day '+(di+1)+' · '+day.label+' Milestones' : 'Day '+(di+1)+' · Journey Milestones';
    let before=original.slice(0,start);
    before=before.replace(/📅 Day \d+ Schedule/,'🗺️ '+title)
                 .replace('Sorted by time','Follow stops in journey order');
    const importButton=goa&&admin&&dates.length>=3 ?
      '<div class="d4-ms-import"><span>🏖️ 3 Days Goa Sightseeing + Malvan Adventure</span><button type="button" data-action="goa-import">'+(loaded?'↻ Add missing stops':'＋ Load Goa 3-Day Plan')+'</button></div>' : '';
    const progress='<section class="d4-ms-summary" aria-label="Day plan progress"><div class="d4-ms-summary-head"><div><span class="d4-ms-eyebrow">🧭 TRIP PROGRESS</span><strong>'+completed+' / '+ordered.length+' milestones completed</strong></div><b>'+pct+'%</b></div><div class="d4-ms-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><span style="width:'+pct+'%"></span></div>'+
      (next?'<div class="d4-ms-next"><span>⏭ NEXT UP</span><b>'+htmlSafe(iconFor(next)+' '+next.title)+'</b><small>'+htmlSafe(next.goaTimeLabel||ampm(next.time))+'</small></div>':
       ordered.length?'<div class="d4-ms-finished">🏆 All milestones completed for this day!</div>':'<div class="d4-ms-next">Add activities to start your journey.</div>')+'</section>';
    const timeline=ordered.length?'<div class="d4-ms-track" aria-label="Milestone checklist">'+ordered.map((p,i)=>{
      const status=p.done?'done':p===next?'next':'pending';
      const icon=iconFor(p),visual=artFor(p),time=p.goaTimeLabel|| (p.time?ampm(p.time):'Time flexible');
      const symbol='<span class="d4-ms-symbol">'+(visual?'<img src="'+visual+'" alt="" loading="lazy" decoding="async" />':'')+'<span aria-hidden="true">'+htmlSafe(icon)+'</span></span>';
      return '<article class="d4-ms-item '+status+'" '+(p===next?'data-goa-next="true"':'')+'>'+
        '<div class="d4-ms-rail" aria-hidden="true"><span class="d4-ms-num">'+(p.done?'✓':String(i+1))+'</span><i></i></div>'+
        '<div class="d4-ms-card"><div class="d4-ms-top">'+symbol+'<div class="d4-ms-copy"><span class="d4-ms-time">'+htmlSafe(time)+'</span><h3>'+htmlSafe(p.title)+'</h3><p>'+htmlSafe(p.place||'Location to be decided')+'</p></div></div>'+
        '<div class="d4-ms-bottom"><span class="d4-ms-status">'+(status==='done'?'✓ Completed':status==='next'?'● Next stop':'○ Upcoming')+'</span>'+
        (admin?'<div class="d4-ms-actions"><button type="button" data-action="plan-edit" data-id="'+htmlSafe(p.id)+'" aria-label="Edit '+htmlSafe(p.title)+'">Edit</button><button type="button" class="d4-ms-check" data-action="plan-toggle" data-id="'+htmlSafe(p.id)+'" aria-label="'+(p.done?'Undo completion for ':'Mark complete: ')+htmlSafe(p.title)+'">'+(p.done?'↶ Undo':'✓ '+(status==='next'?'Complete & Next':'Complete'))+'</button></div>':'')+'</div></div></article>';
    }).join('')+'</div>':
      '<div class="empty bright-empty"><div class="emoji">🧭</div><h3>Your next adventure starts here</h3><p>Admins can add day-wise journey milestones.</p></div>';
    return before+importButton+progress+timeline+original.slice(end);
  }
  function matchExisting(p,s,dayNo) {
    if(p.goaPresetKey===('goa3-v1-'+dayNo+'-'+s[6]))return true;
    const title=textKey(p.title),target=textKey(s[1]);
    if(title===target)return true;
    if(dayNo!==1)return false;
    if(s[6]==='rail-pickup')return /madga|magao/.test(title)&&/pick|station/.test(title);
    if(s[6]==='vehicle-collection')return /bike/.test(title)&&/car|collection/.test(title);
    if(s[6]==='hotel-start')return /tripstarted|startfromhotel/.test(title);
    if(s[6]==='hotel-reception')return /hotelluanova|hotelreached/.test(title);
    return false;
  }
  function importGoa(t) {
    if(!isTripAdmin(t))return toast('Only Main Admin / Trip Admin can load the itinerary.');
    const dates=datesInTrip(t);
    if(dates.length<3)return toast('Set at least 3 trip dates before loading this package.');
    if(!confirm('Add the missing Goa Day 1–3 milestones? Existing activities, status, members, expenses and payments will be preserved. No duplicate preset steps will be created.'))return;
    let added=0,updated=0;
    const pending=[];
    goaDays.forEach((day,dayIdx)=>{
      const date=dates[dayIdx],used=new Set();
      day.steps.forEach((s,i)=>{
        const key='goa3-v1-'+(dayIdx+1)+'-'+s[6];
        let match=t.plans.find(p=>p.date===date&&!used.has(p.id)&&matchExisting(p,s,dayIdx+1));
        if(match){used.add(match.id);
          if(match.goaPresetKey!==key || match.goaStep!==i+1 || !match.goaIcon){pending.push({match,key,step:i+1,icon:s[0],timeLabel:s[5]});updated++;}
        }else{pending.push({newStep:{
          id:uid(),date:date,time:s[4],title:s[1],place:s[2],category:s[3],done:false,
          goaPresetKey:key,goaStep:i+1,goaIcon:s[0],goaTimeLabel:s[5]
        }});added++;}
      });
    });
    if(!pending.length)return toast('✅ Goa 3-day milestones are already included.');
    try{
      saveTripChange(t,()=>{
        pending.forEach(item=>{
          if(item.newStep)t.plans.push(item.newStep);
          else {
            item.match.goaPresetKey=item.key;
            item.match.goaStep=item.step;
            item.match.goaIcon=item.icon;
            item.match.goaTimeLabel=item.timeLabel;
          }
        });
      });
      daySelected=dates[0];tripTab='plan';render();
      toast('✅ Added '+added+' stops · linked '+updated+' existing activities');
    }catch(error){toast('Could not save the itinerary: '+error.message);}
  }
  function focusNext() {
    requestAnimationFrame(()=>{
      const node=document.querySelector('[data-goa-next="true"]');
      if(node && typeof node.scrollIntoView==='function')node.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
  tripPlan=renderMilestones;
  window.D4GoaMilestones={importPlan:importGoa,focusNext:focusNext};
})();
