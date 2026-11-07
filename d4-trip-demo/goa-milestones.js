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
    fort:'https://s7ap1.scene7.com/is/image/incredibleindia/fort-aguada-goa-3-musthead-hero?qlt=76&ts=1742162053837',
    beach:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=240&q=72',
    lunch:'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=240&q=72',
    dinner:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=240&q=72',
    breakfast:'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=240&q=72',
    hotel:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=240&q=72',
    bike:'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=240&q=72',
    train:'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=240&q=72',
    water:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=240&q=72',
    mountains:'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=240&q=72'
  };
  const visualCategories=[
    {id:'fort',label:'Fort',icon:'🏰',category:'Sightseeing',photo:'fort'},
    {id:'beach',label:'Beach',icon:'🏖️',category:'Sightseeing',photo:'beach'},
    {id:'lunch',label:'Lunch',icon:'🍛',category:'Food',photo:'lunch'},
    {id:'dinner',label:'Dinner',icon:'🍽️',category:'Food',photo:'dinner'},
    {id:'breakfast',label:'Breakfast',icon:'🍳',category:'Food',photo:'breakfast'},
    {id:'hotel',label:'Hotel',icon:'🏨',category:'Stay',photo:'hotel'},
    {id:'bike',label:'Bike / Car',icon:'🛵',category:'Travel',photo:'bike'},
    {id:'train',label:'Railway',icon:'🚆',category:'Travel',photo:'train'},
    {id:'scuba',label:'Water Sports',icon:'🤿',category:'Activity',photo:'water'},
    {id:'waterfall',label:'Waterfall',icon:'💦',category:'Sightseeing',photo:'mountains'},
    {id:'shopping',label:'Shopping',icon:'🛍️',category:'Shopping',photo:'beach'},
    {id:'church',label:'Church',icon:'⛪',category:'Sightseeing',photo:'fort'},
    {id:'temple',label:'Temple',icon:'🛕',category:'Sightseeing',photo:'fort'},
    {id:'other',label:'Other',icon:'📍',category:'Other',photo:''}
  ];
  const visualById=Object.fromEntries(visualCategories.map(v=>[v.id,v]));
  const validClock=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v||'');
  let inlineEditor=null;
  const htmlSafe = s => esc(s);
  const textKey = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function iconFor(p) {
    if (p.goaVisual && visualById[p.goaVisual]) return visualById[p.goaVisual].icon;
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
    if (p.goaVisual && visualById[p.goaVisual])return photoUrls[visualById[p.goaVisual].photo]||'';
    const v=String(p.title||'').toLowerCase();
    if (/water sport|scuba|parasail|jet ski|banana ride|boat ride|bumper|dive/.test(v)) return photoUrls.water;
    if (/fort|aguada|chapora|lighthouse/.test(v)) return photoUrls.fort;
    if (/lunch|thali/.test(v)) return photoUrls.lunch;
    if (/dinner|buffet|starters/.test(v)) return photoUrls.dinner;
    if (/breakfast/.test(v)) return photoUrls.breakfast;
    if (/hotel|check.in|check.out|overnight|stay|reception/.test(v))return photoUrls.hotel;
    if (/bike|scooter|car collection/.test(v))return photoUrls.bike;
    if (/railway|train|madgaon|madgoan/.test(v))return photoUrls.train;
    if (/beach|cruise|view point|dona paula|miramar/.test(v)) return photoUrls.beach;
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
    const rank=p=>Number.isFinite(p.goaOrder)?p.goaOrder:templateStepRank(p,day)*1000;
    return rank(a)-rank(b) ||
      String(a.time||'').localeCompare(String(b.time||'')) ||
      String(a.title||'').localeCompare(String(b.title||''));
  }
  function orderedForDate(t,date) {
    const dateItems=t.plans.filter(p=>p.date===date),day=goaDays[dayIndex(t,date)];
    return dateItems.sort((dateItems.some(p=>p.goaPresetKey||Number.isFinite(p.goaOrder)))
      ?(a,b)=>sortSteps(a,b,day)
      :(a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  }
  function afterMinutes(clock,minutes) {
    if(!validClock(clock))return '';
    const n=(Number(clock.slice(0,2))*60+Number(clock.slice(3))+minutes)%(24*60);
    return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  }
  function packageEndClock(p) {
    if(validClock(p.goaEndTime))return p.goaEndTime;
    const label=String(p.goaTimeLabel||'');
    const m=label.match(/(\d{1,2}):(\d{2})[–-](\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if(!m)return '';
    const hour=Number(m[3])%12+(m[5].toUpperCase()==='PM'?12:0);
    return String(hour).padStart(2,'0')+':'+m[4];
  }
  function suggestedNextTime(items,atIndex) {
    if(atIndex<0||!items.length)return '';
    const anchor=items[atIndex];
    if(/overnight|next day/i.test(String(anchor?.goaTimeLabel||'')+' '+String(anchor?.title||'')))return '';
    for(let i=atIndex;i>=0;i--){
      const p=items[i];
      if(/overnight|next day/i.test(String(p.goaTimeLabel||'')+' '+String(p.title||'')))return '';
      const base=packageEndClock(p)||p.time;
      if(!validClock(base))continue;
      const hops=atIndex-i+1;
      if(hops>8)return '';
      const guess=afterMinutes(base,30*hops);
      const following=items[atIndex+1];
      if(following&&validClock(following.time) && guess>=following.time && base<following.time){
        const available=Number(following.time.slice(0,2))*60+Number(following.time.slice(3))
          -Number(base.slice(0,2))*60-Number(base.slice(3));
        return available>10?afterMinutes(base,Math.floor(available/2)):'';
      }
      return guess;
    }
    return '';
  }
  function suggestedDayTime(t,date) {
    const items=orderedForDate(t,date);
    return suggestedNextTime(items,items.length-1);
  }
  function formatTimeWindow(start,end) {
    if(!start)return 'Flexible';
    if(!end)return ampm(start);
    return ampm(start)+' – '+ampm(end)+(end<start?' (next day)':'');
  }
  function renderMilestones(t) {
    const original = previousTripPlan(t);
    const marker='<div class="plan-timeline">';
    const noteMarker='<div class="plan-view-note">';
    const start=original.indexOf(marker);
    const end=original.indexOf(noteMarker,start+marker.length);
    if(start<0 || end<0) return original;
    const dates=datesInTrip(t),di=dayIndex(t,daySelected),day=goaDays[di];
    const ordered=orderedForDate(t,daySelected);
    const loaded=ordered.some(p=>p.goaPresetKey);
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
      return '<article class="d4-ms-item '+status+'" data-goa-step-id="'+htmlSafe(p.id)+'" '+(p===next?'data-goa-next="true"':'')+'>'+
        '<div class="d4-ms-rail" aria-hidden="true"><span class="d4-ms-num">'+(p.done?'✓':String(i+1))+'</span><i></i></div>'+
        '<div class="d4-ms-card"><div class="d4-ms-top">'+symbol+'<div class="d4-ms-copy"><span class="d4-ms-time">'+htmlSafe(time)+'</span><h3>'+htmlSafe(p.title)+'</h3><p>'+htmlSafe(p.place||'Location to be decided')+'</p></div></div>'+
        '<div class="d4-ms-bottom"><span class="d4-ms-status">'+(status==='done'?'✓ Completed':status==='next'?'● Next stop':'○ Upcoming')+'</span>'+
        (admin?'<div class="d4-ms-actions"><button type="button" data-action="plan-edit" data-id="'+htmlSafe(p.id)+'" aria-label="Edit '+htmlSafe(p.title)+'">Edit details</button><button type="button" class="d4-ms-check" data-action="plan-toggle" data-id="'+htmlSafe(p.id)+'" aria-label="'+(p.done?'Undo completion for ':'Mark complete: ')+htmlSafe(p.title)+'">'+(p.done?'↶ Undo':'✓ '+(status==='next'?'Complete & Next':'Complete'))+'</button></div>':'')+'</div>'+
        (admin?'<div class="d4-ms-inline-buttons"><button type="button" data-goa-action="time" data-id="'+htmlSafe(p.id)+'">🕒 Edit time</button><button type="button" data-goa-action="add" data-id="'+htmlSafe(p.id)+'">＋ Add below</button></div>':'')+
        (admin&&inlineEditor&&inlineEditor.tripId===t.id&&inlineEditor.date===daySelected&&inlineEditor.afterId===p.id
          ?renderInlineEditor(t,ordered,i,p):'')+'</div></article>';
    }).join('')+'</div>':
      '<div class="empty bright-empty"><div class="emoji">🧭</div><h3>Your next adventure starts here</h3><p>Admins can add day-wise journey milestones.</p></div>';
    const bottomButton=admin?'<div class="d4-ms-add-next"><button type="button" data-goa-action="add" data-id="'+(ordered.length?htmlSafe(ordered[ordered.length-1].id):'')+'">＋ Add Next Milestone</button><p>New stop stays below the previous one · time continues from your schedule.</p></div>':'';
    const firstEditor=admin&&ordered.length===0&&inlineEditor&&inlineEditor.tripId===t.id&&inlineEditor.date===daySelected
      ?renderInlineEditor(t,ordered,-1,null):'';
    return before+importButton+progress+timeline+bottomButton+firstEditor+original.slice(end);
  }
  function matchExisting(p,s,dayNo) {
    if(p.goaPresetKey===('goa3-v1-'+dayNo+'-'+s[6]))return true;
    const title=textKey(p.title),target=textKey(s[1]);
    if(title===target)return true;
    if(dayNo!==1)return false;
    if(s[6]==='rail-pickup')return /madg[ao]|magao|margao/.test(title)&&/pick|station/.test(title);
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
            item.match.goaTimeLabel=(item.timeLabel==='Flexible' && item.match.time) ? ampm(item.match.time) : item.timeLabel;
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

  function renderInlineEditor(t,ordered,index,anchor) {
    const kind=inlineEditor?.kind;
    if(!kind)return '';
    const isTime=kind==='time',p=isTime?anchor:null;
    const chosenTime=isTime?(p.time||''):suggestedNextTime(ordered,index);
    const range=isTime?(p.goaEndTime||''):'';
    const categoryChoices=visualCategories.map(v=>
      '<button type="button" class="d4-ms-visual '+(v.id==='other'?'chosen':'')+'" data-goa-action="visual" data-visual="'+v.id+'" aria-pressed="'+(v.id==='other'?'true':'false')+'">'+
      '<span class="d4-ms-visual-photo">'+(v.photo?'<img loading="lazy" decoding="async" src="'+photoUrls[v.photo]+'" alt="">':'')+'<b aria-hidden="true">'+v.icon+'</b></span><span>'+v.label+'</span></button>'
    ).join('');
    return '<form class="d4-ms-inline-editor" data-goa-editor-form="'+(isTime?'time':'add')+'" data-goa-editor="true">'+
      '<h4>'+(isTime?'🕒 Edit this milestone time':'＋ Add a milestone right here')+'</h4>'+
      (isTime?'<p>Current: '+htmlSafe(p.goaTimeLabel||ampm(p.time))+'</p>':
        '<p>Choose a category, then add the next stop. Suggested timing follows the previous stop; you can change it.</p>'+
        '<div class="d4-ms-visual-list" aria-label="Choose an activity category">'+categoryChoices+'</div>'+
        '<input type="hidden" name="visual" value="other">'+
        '<label class="d4-ms-field">Activity name<input class="d4-ms-input" name="title" type="text" maxlength="100" required placeholder="e.g. Fort Aguada, Lunch, Beach"></label>'+
        '<label class="d4-ms-field">Location / details<input class="d4-ms-input" name="place" type="text" maxlength="120" placeholder="Where will you go?"></label>')+
      '<div class="d4-ms-time-fields">'+
      '<label class="d4-ms-field">Start time<input class="d4-ms-input" name="time" type="time" value="'+htmlSafe(chosenTime)+'" '+(isTime?'required':'')+'></label>'+
      '<label class="d4-ms-field">End time (optional)<input class="d4-ms-input" name="endTime" type="time" value="'+htmlSafe(range)+'"></label>'+
      '</div><p class="d4-ms-time-hint">'+(chosenTime?'Suggested: '+htmlSafe(ampm(chosenTime))+' · confirm before saving':'No safe time to infer: choose a time, or save the stop as Flexible')+'</p>'+
      '<div class="d4-ms-form-actions"><button type="submit" class="d4-ms-save">'+(isTime?'✓ Save time':'✓ Save & continue below')+'</button>'+
      '<button type="button" data-goa-action="cancel">Cancel</button></div>'+
      '</form>';
  }
  function focusInPlan(selector) {
    requestAnimationFrame(()=>{
      const node=document.querySelector(selector);
      node?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    });
  }
  function openInline(kind,afterId) {
    const t=current();
    if(!t||!isTripAdmin(t))return toast('Only admins can edit milestones.');
    const items=orderedForDate(t,daySelected);
    if(afterId&&!items.some(p=>p.id===afterId))return toast('This milestone is no longer on the selected day.');
    const id=afterId||'';
    inlineEditor={kind,afterId:id,tripId:t.id,date:daySelected};
    render();
    focusInPlan('[data-goa-editor="true"]');
  }
  function appendAfter(t,date,afterId,fields) {
    if(!isTripAdmin(t))throw Error('Admins only');
    if(!datesInTrip(t).includes(date))throw Error('Invalid trip date');
    const title=String(fields.title||'').trim(),place=String(fields.place||'').trim();
    const start=String(fields.time||''),end=String(fields.endTime||''),visual=visualById[fields.visual];
    if(!title||title.length>100||place.length>120)throw Error('Enter a valid activity name and location.');
    if(!visual|| !planCategories.includes(visual.category))throw Error('Choose a valid category');
    if(start&&!validClock(start)||end&&(!start||!validClock(end)))throw Error('Check the start and end times.');
    const ordered=orderedForDate(t,date),index=afterId?ordered.findIndex(p=>p.id===afterId):ordered.length-1;
    if(afterId&&index<0)throw Error('Selected milestone no longer exists.');
    let saved;
    saveTripChange(t,()=>{
      ordered.forEach((p,i)=>{p.goaOrder=(i+1)*1000});
      saved={
        id:uid(),date,time:start,title,place,category:visual.category,done:false,
        goaVisual:visual.id,goaIcon:visual.icon,goaOrder:(index+1)*1000+500,
        goaEndTime:end,goaTimeLabel:formatTimeWindow(start,end)
      };
      t.plans.push(saved);
    });
    return saved;
  }
  function editMilestoneTime(t,id,start,end) {
    if(!isTripAdmin(t))throw Error('Admins only');
    if(!validClock(start)||end&&!validClock(end))throw Error('Choose a valid time.');
    const item=t.plans.find(p=>p.id===id&&p.date===daySelected);
    if(!item)throw Error('Milestone not found on this day.');
    saveTripChange(t,()=>{
      item.time=start;
      item.goaEndTime=end;
      item.goaTimeLabel=formatTimeWindow(start,end);
    });
    return item;
  }
  function submitInlineForm(e) {
    const form=e.target;
    if(!form||!form.hasAttribute('data-goa-editor-form'))return;
    e.preventDefault();e.stopImmediatePropagation();
    const t=current(),state=inlineEditor;
    if(!state||!t||state.tripId!==t.id||state.date!==daySelected||!isTripAdmin(t))return toast('Open this milestone again.');
    const fd=new FormData(form);
    try{
      const time=String(fd.get('time')||''),end=String(fd.get('endTime')||'');
      const saved=state.kind==='time'
        ?editMilestoneTime(t,state.afterId,time,end)
        :appendAfter(t,daySelected,state.afterId,{
          title:fd.get('title'),place:fd.get('place'),time,endTime:end,visual:fd.get('visual')
        });
      inlineEditor=null;
      render();
      focusInPlan('[data-goa-step-id="'+CSS.escape(saved.id)+'"]');
      toast(state.kind==='time'?'✅ Milestone timing updated':'✅ Added below! Tap ＋ Add below to continue.');
    }catch(error){toast('⚠️ '+error.message)}
  }
  if(typeof document.addEventListener==='function') {
    document.addEventListener('click',e=>{
      const node=e.target.closest?.('[data-goa-action]');
      if(!node)return;
      e.preventDefault();
      e.stopPropagation();
      const cmd=node.dataset.goaAction;
      if(cmd==='cancel'){inlineEditor=null;render();return;}
      if(cmd==='add'||cmd==='time'){openInline(cmd,node.dataset.id||'');return;}
      if(cmd==='visual'){
        const form=node.closest('form'),choice=visualById[node.dataset.visual];
        if(!form||!choice)return;
        form.querySelector('[name="visual"]').value=choice.id;
        form.querySelectorAll('[data-goa-action="visual"]').forEach(button=>{
          const selected=button.dataset.visual===choice.id;
          button.classList.toggle('chosen',selected);
          button.setAttribute('aria-pressed',String(selected));
        });
        const input=form.querySelector('[name="title"]');
        if(input&&!input.value)input.placeholder='e.g. '+choice.label+' stop';
      }
    },true);
    document.addEventListener('submit',submitInlineForm,true);
  }
  tripPlan=renderMilestones;
  window.D4GoaMilestones={importPlan:importGoa,focusNext:focusNext,suggestDayTime:suggestedDayTime,appendAfter,editMilestoneTime,orderedForDate};
})();
