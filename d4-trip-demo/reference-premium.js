/* D4 Trip — Reference UI v36. Presentation and existing delegated actions only.
   All monetary figures come from current trip records; no Firebase writes. */
(function(){
  'use strict';
  const previous = {
    bottomNav:bottomNav, tripOverview:tripOverview, collectionsPage:collectionsPage, home:home,
    tripMembers:tripMembers, expensesPage:expensesPage, entryPage:entryPage,
    tripPage:tripPage, adminPage:adminPage
  };
  let quickPanel = '';
  const html = value => esc(value == null ? '' : String(value));
  const travelCover = '<span class="ref-sun" aria-hidden="true"></span><span class="ref-palm" aria-hidden="true">🌴</span>';
  function iconButton(icon,label,action,attr=''){
    return '<button type="button" class="ref-action" data-action="'+action+'" '+attr+'>'+
      '<span class="ref-action-ico" aria-hidden="true">'+icon+'</span><strong>'+html(label)+'</strong></button>';
  }
  function memberRole(t,name){
    if(isMain() && String(name)===String(profile)) return 'Main Admin';
    return Array.isArray(t.admins)&&t.admins.includes(name) ? 'Admin':'Member';
  }
  function roleBadge(role){
    return '<span class="ref-role '+(role==='Main Admin'?'owner':role==='Admin'?'admin':'member')+'">'+
      (role==='Main Admin'?'👑 ':role==='Admin'?'🛡️ ':'')+role+'</span>';
  }
  // High-fidelity, theme-matched inline vector artwork. No third-party images
  // or emoji assets, so icons remain sharp on Android/iPhone Retina displays.
  function luxeIcon(key){
    const gold='lg-g-'+key,blue='lg-b-'+key,paper='lg-p-'+key,shade='lg-s-'+key;
    const symbols={
      calendar:'<g filter="url(#'+shade+')">'+
        '<rect x="22" y="18" width="56" height="60" rx="10" fill="url(#'+paper+')" stroke="#fff1bf" stroke-width="1.5"/>'+
        '<path d="M22 29Q22 18 33 18H67Q78 18 78 29V39H22Z" fill="#c63c38"/>'+
        '<path d="M33 11v16M65 11v16" stroke="url(#'+gold+')" stroke-width="6" stroke-linecap="round"/>'+
        '<path d="M37 49H45M53 49H63M37 58H44M56 59H65" stroke="#91aac0" stroke-width="3.5" stroke-linecap="round"/>'+
        '<text x="35" y="73" font-size="19" font-weight="900" font-family="Arial,sans-serif" fill="#17324b">31</text></g>'+
        '<path d="M17 83C35 89 66 88 86 63" stroke="url(#'+gold+')" stroke-width="2.7" fill="none" stroke-linecap="round"/>'+
        '<path d="m66 55 18-6-7 17-6-5-11 5-3-3 10-8Z" fill="url(#'+paper+')" stroke="#d9ab57" stroke-width="1.6"/>',
      memories:'<g filter="url(#'+shade+')"><rect x="11" y="24" width="74" height="56" rx="10" fill="url(#'+blue+')" stroke="url(#'+gold+')" stroke-width="4"/><circle cx="33" cy="42" r="8" fill="#ffda78"/><path d="M18 72l20-23 15 15 10-12 16 20" fill="none" stroke="#b3f6d9" stroke-width="6" stroke-linejoin="round"/><path d="M29 16h40" stroke="#ffe2a2" stroke-width="5" stroke-linecap="round"/></g>',
      members:'<g filter="url(#'+shade+')">'+
        '<circle cx="25" cy="35" r="12" fill="url(#'+paper+')" stroke="#cce7fa"/>'+
        '<path d="M5 69c0-14 8-22 20-22s20 8 20 22v7H5Z" fill="url(#'+blue+')" stroke="#a1cbed"/>'+
        '<circle cx="72" cy="35" r="12" fill="url(#'+paper+')" stroke="#cce7fa"/>'+
        '<path d="M52 69c0-14 8-22 20-22s20 8 20 22v7H52Z" fill="url(#'+blue+')" stroke="#a1cbed"/>'+
        '<circle cx="49" cy="29" r="16" fill="url(#'+gold+')" stroke="#ffefbb" stroke-width="2"/>'+
        '<path d="M22 76c0-20 11-30 27-30s27 10 27 30v9H22Z" fill="url(#'+gold+')" stroke="#ffe4a1" stroke-width="1.5"/></g>',
      wallet:'<g filter="url(#'+shade+')">'+
        '<rect x="24" y="17" width="53" height="56" rx="7" transform="rotate(-12 24 17)" fill="#194f7c" stroke="#5dc6ee" stroke-width="2"/>'+
        '<rect x="18" y="23" width="58" height="53" rx="8" transform="rotate(-5 18 23)" fill="url(#'+blue+')" stroke="#8cd3ff" stroke-width="1.4"/>'+
        '<rect x="14" y="31" width="69" height="52" rx="11" fill="#0e1e32" stroke="url(#'+gold+')" stroke-width="2.8"/>'+
        '<path d="M17 42h61" stroke="#d8a34d" stroke-dasharray="3 3" opacity=".8"/>'+
        '<rect x="59" y="47" width="29" height="23" rx="6" fill="url(#'+gold+')" stroke="#fff2c4" stroke-width="1.8"/>'+
        '<circle cx="70" cy="59" r="5" fill="#663d17"/>'+
        '<text x="28" y="72" font-size="33" font-weight="900" font-family="Arial,sans-serif" fill="url(#'+gold+')">₹</text></g>',
      expenses:'<g filter="url(#'+shade+')">'+
        '<path d="M25 15H70Q77 15 77 24V84l-8-5-8 5-8-5-8 5-8-5-8 5-8-5V24Q21 15 25 15Z" fill="url(#'+paper+')" stroke="#ffffff" stroke-width="1.7"/>'+
        '<path d="M33 31h21m-21 12h34m-34 9h34m-34 9h19" stroke="#7691a9" stroke-width="3.6" stroke-linecap="round"/>'+
        '<text x="55" y="73" font-size="20" font-family="Arial,sans-serif" font-weight="900" fill="#153b59">₹</text></g>',
      check:'<g filter="url(#'+shade+')"><rect x="18" y="18" width="60" height="60" rx="16" fill="#1a5a43" stroke="#72e7a2" stroke-width="3"/>'+
        '<path d="M31 47l12 12 24-28" fill="none" stroke="#a6ffc8" stroke-linecap="round" stroke-linejoin="round" stroke-width="8"/></g>',
      hourglass:'<g filter="url(#'+shade+')"><path d="M27 15H69M27 81H69" stroke="url(#'+gold+')" stroke-width="6" stroke-linecap="round"/>'+
        '<path d="M31 20Q31 40 49 49Q31 59 31 76H65Q65 58 49 49Q65 40 65 20Z" fill="#542e0e" stroke="url(#'+gold+')" stroke-width="3"/>'+
        '<path d="M38 26H58Q57 36 48 43Q39 36 38 26ZM38 69Q43 59 48 58Q53 59 58 69Z" fill="#ffce63"/></g>',
      coins:'<g filter="url(#'+shade+')"><ellipse cx="49" cy="70" rx="31" ry="11" fill="url(#'+gold+')" stroke="#fff0ba" stroke-width="2"/>'+
        '<path d="M18 61v10c0 12 62 12 62 0V61" fill="#ae6d24" stroke="#ffd781" stroke-width="2"/>'+
        '<ellipse cx="49" cy="61" rx="31" ry="11" fill="url(#'+gold+')" stroke="#fff0ba" stroke-width="2"/>'+
        '<path d="M28 44v10c0 11 50 11 50 0V44" fill="#ad6a1f" stroke="#ffe3a0" stroke-width="2"/>'+
        '<ellipse cx="53" cy="43" rx="25" ry="9" fill="url(#'+gold+')" stroke="#fff0ba" stroke-width="2"/>'+
        '<path d="M24 30v10c0 10 40 10 40 0V30" fill="#a86a23" stroke="#ffe0a0" stroke-width="2"/>'+
        '<ellipse cx="44" cy="29" rx="20" ry="8" fill="url(#'+gold+')" stroke="#fff0ba" stroke-width="2"/></g>',
      target:'<circle cx="48" cy="50" r="33" fill="#103b4f" stroke="url(#'+gold+')" stroke-width="5"/>'+
        '<circle cx="48" cy="50" r="21" fill="#092739" stroke="#b5e4da" stroke-width="4"/>'+
        '<circle cx="48" cy="50" r="8" fill="#f8d98a"/>'+
        '<path d="m47 49 28-30m-8 3 12-8-3 12" stroke="#ffdb8b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    if(!Object.prototype.hasOwnProperty.call(symbols,key))return '';
    return '<svg class="ref-luxe-svg" width="88" height="88" viewBox="0 0 96 96" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'+
      '<defs>'+
      '<linearGradient id="'+gold+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff6cd"/><stop offset=".24" stop-color="#ffdc88"/><stop offset=".56" stop-color="#c8862c"/><stop offset=".78" stop-color="#ffdd93"/><stop offset="1" stop-color="#8d531f"/></linearGradient>'+
      '<linearGradient id="'+blue+'" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#d7ecff"/><stop offset=".36" stop-color="#4f97d0"/><stop offset=".75" stop-color="#175086"/><stop offset="1" stop-color="#091f3a"/></linearGradient>'+
      '<linearGradient id="'+paper+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".68" stop-color="#e8edf1"/><stop offset="1" stop-color="#99aec4"/></linearGradient>'+
      '<filter id="'+shade+'" x="-35%" y="-35%" width="170%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-opacity=".6"/></filter>'+
      '</defs>'+symbols[key]+'</svg>';
  }
  function tripHero(t){
    const c=collectionTotals(t);
    const days=datesInTrip(t).length;
    // Dynamic from the current collection ledger, never hard-code the preview money.
    const amount=Number(c.progress);
    const p=Number.isFinite(amount)?Math.max(0,Math.min(100,amount)):0;
    const pc=Math.round(p);
    return '<section class="ref-trip-hero ref-luxe-home" aria-label="Trip overview">'+travelCover+
      '<div class="ref-hero-brand">✦ D4 Trip <span>YOUR ADVENTURE</span></div>'+
      '<h2>'+html(t.name)+'</h2><p>📍 '+html(t.destination)+' · '+html(shortDate(t.start))+' — '+html(shortDate(t.end))+'</p>'+
      '<div class="ref-hero-stats ref-luxe-stats">'+
        '<div><span class="ref-luxe-stat-icon">'+luxeIcon('members')+'</span><b>'+t.members.length+'</b><small>Members</small></div>'+
        '<div><span class="ref-luxe-stat-icon">'+luxeIcon('check')+'</span><b>'+money(c.paid)+'</b><small>Received</small></div>'+
        '<div><span class="ref-luxe-stat-icon">'+luxeIcon('hourglass')+'</span><b>'+money(c.pending)+'</b><small>Pending</small></div></div>'+
      '<nav class="ref-hero-actions ref-luxe-actions" aria-label="Main trip sections">'+
        iconButton(luxeIcon('memories'),'Memories','open-tab','data-ctx="memories"')+
        iconButton(luxeIcon('members'),'Members','open-tab','data-ctx="members"')+
        iconButton(luxeIcon('wallet'),'Payments','nav','data-view="collections"')+
        iconButton(luxeIcon('expenses'),'Expenses','nav','data-view="expenses"')+iconButton('🎟️','Tickets','nav','data-view="tickets"')+'</nav>'+
      '<section class="ref-luxe-tracker" aria-label="Trip payments circular tracker">'+
        '<div class="ref-luxe-tracker-title"><span class="ref-luxe-coins">'+luxeIcon('coins')+'</span><h3>Trip Payments</h3><span class="ref-luxe-tracker-tag">'+pc+'%</span></div>'+
        '<div class="ref-luxe-money-grid">'+
          '<div class="ref-luxe-money-side"><span class="ref-luxe-mini-icon">'+luxeIcon('check')+'</span><small>Received</small><strong>'+money(c.paid)+'</strong></div>'+
          '<div class="ref-luxe-dial" style="--luxe-percent:'+p+'%" role="progressbar" aria-label="Trip payment collection" aria-valuenow="'+pc+'" aria-valuemin="0" aria-valuemax="100">'+
            '<div class="ref-luxe-dial-inner"><strong>'+pc+'%</strong><span>COLLECTED</span><span class="ref-luxe-dial-art" aria-hidden="true">✦</span></div></div>'+
          '<div class="ref-luxe-money-side"><span class="ref-luxe-mini-icon">'+luxeIcon('hourglass')+'</span><small>Pending</small><strong>'+money(c.pending)+'</strong></div></div>'+
        '<div class="ref-luxe-target">'+luxeIcon('target')+'<span>Trip Target <b>'+money(c.target)+'</b></span></div>'+
        '<p class="ref-hero-foot">'+days+' trip days · Amounts update from your saved member payments</p>'+
      '</section></section>';
  }
  function memberAmountPanel(t){
    const c=collectionTotals(t),canEdit=isTripAdmin(t);
    const entry=row=>'<article class="ref-balance-person">'+
      '<span class="ref-balance-initial" aria-hidden="true">'+html(String(row.member).slice(0,1).toUpperCase())+'</span>'+
      '<div class="ref-balance-details"><b>'+html(row.member)+'</b><small class="ref-balance-status">'+html(row.status)+'</small>'+
      '<div><span>Paid <strong>'+money(row.paid)+'</strong></span><span>Due <strong>'+money(row.pending)+'</strong></span></div></div>'+
      (canEdit?'<button type="button" class="ref-edit-paid" data-action="collection-member-total" data-member="'+html(row.member)+'" aria-label="Edit paid amount for '+html(row.member)+'">✎ Edit</button>':'')+'</article>';
    const first=c.rows.slice(0,4).map(entry).join('');
    const rest=c.rows.slice(4).map(entry).join('');
    return '<section class="ref-home-balances" aria-label="Live member payment balances">'+
      '<div class="ref-section-title"><h3>👥 Member Amounts</h3><button type="button" data-action="nav" data-view="collections">Payments ›</button></div>'+
      '<div class="ref-home-balances-total"><span>Received <b>'+money(c.paid)+'</b></span><span>Remaining <b>'+money(c.pending)+'</b></span></div>'+
      (first||'<p class="ref-empty">No members in this trip yet.</p>')+
      (rest?'<details class="ref-all-balances"><summary>Show all '+c.rows.length+' members <span>⌄</span></summary>'+rest+'</details>':'')+
      '</section>';
  }
  home=function(){
    const t=current(),legacy=previous.home();
    return t?memberAmountPanel(t)+legacy:legacy;
  };
  // Keep all nine destinations visible by default; Hide only collapses the grid.
  // This preference lives locally and never writes to a trip or Firebase.
  const SECTIONS_KEY='d4_trip_section_tiles_open_v37';
  let sectionsOpen=true;
  try{sectionsOpen=localStorage.getItem(SECTIONS_KEY)!=='closed'}catch(_){}
  const sectionIconPaths={
    'Overview':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    'Day Plan':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 14h3m-3 4h7"/>',
    'Expenses':'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3z"/><path d="M8 8h8M8 12h7M8 16h5"/>',
    'Paid / Pending':'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h5"/>',
    'Members':'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2zM17 5a3 3 0 0 1 0 6m1.5 3a5 5 0 0 1 2.5 4v2"/>',
    'Alerts':'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 10h18c0-3-3-3-3-10zM10 21h4"/>',
    'Memories':'<path d="M4 7h4l2-3h4l2 3h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><circle cx="12" cy="14" r="4"/>',
    'Reports':'<path d="M4 3h16v18H4zM8 17v-5m4 5V8m4 9v-7"/>',
    'Settings':'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l.8 3 2 1 2.8-1.4 2.4 3.4-2.2 2.3v3.4l2.2 2.3-2.4 3.4-2.8-1.4-2 1-.8 3h-4l-.8-3-2-1-2.8 1.4L2 16l2.2-2.3v-3.4L2 8l2.4-3.4L7.2 6l2-1z"/>'
  };
  const sectionDefs=[
    ['Overview','open-tab','data-ctx="overview"',0],
    ['Day Plan','open-tab','data-ctx="plan"',1],
    ['Expenses','open-tab','data-ctx="expenses"',2],
    ['Paid / Pending','nav','data-view="collections"',3],
    ['Members','open-tab','data-ctx="members"',4],
    ['Alerts','open-tab','data-ctx="reminders"',5],
    ['Memories','open-tab','data-ctx="memories"',6],
    ['Reports','open-tab','data-ctx="report"',7],
    ['Settings','nav','data-view="profile"',8]
  ];
  function tripSections(){
    const tiles=sectionDefs.map(([name,action,attrs,i])=>{
      const svg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+sectionIconPaths[name]+'</svg>';
      const selected=view==='trip'&&((i===0&&tripTab==='overview')||(i===1&&tripTab==='plan')||(i===2&&tripTab==='expenses')||(i===4&&tripTab==='members'));
      return '<button type="button" class="d4p-tile" data-action="'+action+'" '+attrs+' aria-label="'+html(name)+'"'+(selected?' aria-current="page"':'')+'>'+
        '<span class="ref-section-icon">'+svg+'</span><strong>'+html(name)+'</strong><span class="ref-section-glint" aria-hidden="true">✦</span></button>';
    }).join('');
    return '<details class="ref-trip-sections" '+(sectionsOpen?'open':'')+'>'+
      '<summary class="ref-sections-head" aria-label="Show or hide Trip Sections">'+
      '<span class="ref-sections-head-copy"><small>EXPLORE THE JOURNEY</small><strong>Trip Sections</strong><span>All 9 sections · premium quick access</span></span>'+
      '<span class="ref-sections-visibility"><span class="ref-visible-hide">Hide</span><span class="ref-visible-show">Show</span><span aria-hidden="true">⌄</span></span></summary>'+
      '<nav class="d4p-grid d4p-nav-grid ref-sections-grid" aria-label="Trip section navigation">'+tiles+'</nav></details>';
  }
  document.addEventListener('toggle',function(e){
    if(!e.target?.classList?.contains('ref-trip-sections'))return;
    sectionsOpen=e.target.open;
    try{localStorage.setItem(SECTIONS_KEY,sectionsOpen?'open':'closed')}catch(_){}
  },true);
  tripOverview=function(t){
    if(!t)return previous.tripOverview(t);
    const legacy=previous.tripOverview(t).replace(/<h3 class="d4p-title">Trip Sections<\/h3><nav class="d4p-grid d4p-nav-grid" aria-label="Trip section navigation">[\s\S]*?<\/nav>/,'');
    return tripHero(t)+memberAmountPanel(t)+tripSections()+
      '<details class="ref-expand-tools"><summary>✨ More Trip Tools &amp; Admin Options <span>⌄</span></summary>'+
      '<div class="ref-tool-body">'+legacy+'</div></details>';
  };
  // Every approved member is shown directly on Payments — no pagination or popup.
  // Paid, partial and unpaid are derived from the original collectionTotals records.
  let paymentRosterFilter='all';
  function paymentRoster(t){
    const totals=collectionTotals(t),canEdit=isTripAdmin(t);
    const definitions=[
      {key:'paid',status:'Paid',label:'Paid in Full',icon:'✓',summary:'Completed payments'},
      {key:'partial',status:'Partial',label:'Advance / Partial',icon:'◐',summary:'Partially paid'},
      {key:'unpaid',status:'Pending',label:'Unpaid',icon:'!',summary:'Still awaiting payment'},
      {key:'unset',status:'Not set',label:'Target not set',icon:'?',summary:'Set trip amount to track'}
    ];
    const counter={all:totals.rows.length,paid:totals.full,partial:totals.partial,unpaid:totals.unpaid,
      unset:totals.rows.filter(row=>row.status==='Not set').length};
    if(!counter[paymentRosterFilter])paymentRosterFilter='all';
    const filterButtons=[
      ['all','All Members'],['paid','Paid'],['partial','Partial'],['unpaid','Unpaid'],
      ...(counter.unset?[['unset','Not set']]:[])
    ].map(([key,label])=>'<button type="button" class="ref-roster-filter'+(paymentRosterFilter===key?' active':'')+
      '" data-roster-filter="'+key+'" aria-pressed="'+(paymentRosterFilter===key)+'">'+html(label)+
      '<b>'+counter[key]+'</b></button>').join('');
    const items=definitions.map(g=>{
      const rows=totals.rows.filter(row=>row.status===g.status);
      if(!rows.length)return '';
      const cards=rows.map(row=>{
        const p=row.target>0?Math.max(0,Math.min(100,Math.round(row.paid/row.target*100))):0;
        return '<article class="ref-roster-card ref-status-'+g.key+'" data-roster-card data-roster-name="'+
          html(String(row.member).toLocaleLowerCase())+'">'+
          '<span class="ref-roster-avatar" aria-hidden="true">'+html(String(row.member).slice(0,1).toUpperCase())+'</span>'+
          '<div class="ref-roster-content"><div class="ref-roster-name-line"><strong>'+html(row.member)+'</strong>'+
          '<span class="ref-roster-badge">'+(g.key==='paid'?'✓ PAID':g.key==='partial'?'◐ PARTIAL':g.key==='unpaid'?'● UNPAID':'TARGET NOT SET')+'</span></div>'+
          '<div class="ref-roster-amounts"><span>Paid <b>'+money(row.paid)+'</b></span><span>Balance <b>'+money(row.pending)+'</b></span></div>'+
          '<div class="ref-roster-track" role="progressbar" aria-label="Paid progress for '+html(row.member)+
          '" aria-valuenow="'+p+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+p+'%"></span></div>'+
          (canEdit?'<div class="ref-roster-actions">'+
          '<button type="button" class="ref-roster-edit" data-action="collection-member-total" data-member="'+html(row.member)+'" aria-label="Edit total paid for '+html(row.member)+'">✎ Edit Paid</button>'+
          '<button type="button" class="ref-roster-add" data-action="collection-member-pay" data-member="'+html(row.member)+'" aria-label="Add payment for '+html(row.member)+'">＋ Add</button></div>':'')+
          '</div></article>';
      }).join('');
      return '<section class="ref-roster-group ref-roster-'+g.key+'" data-roster-group="'+g.key+'"'+
        (paymentRosterFilter==='all'||paymentRosterFilter===g.key?'':' hidden')+'>'+
        '<div class="ref-roster-group-head"><span class="ref-roster-group-symbol" aria-hidden="true">'+g.icon+'</span>'+
        '<div><h4>'+g.label+'</h4><small>'+g.summary+'</small></div>'+
        '<b>'+rows.length+' '+(rows.length===1?'member':'members')+'</b></div>'+
        '<div class="ref-roster-cards">'+cards+'</div></section>';
    }).join('');
    return '<section class="ref-payment-roster" id="d4-payment-roster" aria-labelledby="ref-roster-title" data-roster-total="'+
      totals.rows.length+'"><div class="ref-roster-heading"><div><span class="ref-overline">✦ TRAVELLER PAYMENTS</span>'+
      '<h3 id="ref-roster-title">Member Payment Status</h3><p>All '+totals.rows.length+
      ' members · paid, advance and unpaid in one place</p></div>'+
      '<span class="ref-roster-total">👥 '+totals.rows.length+'</span></div>'+
      '<div class="ref-roster-filters" aria-label="Filter members by payment status">'+filterButtons+'</div>'+
      '<label class="ref-roster-search">⌕ <input type="search" data-roster-search placeholder="Search member name..." aria-label="Search members by name" autocomplete="off"></label>'+
      '<div class="ref-roster-scroll" data-roster-scroll tabindex="0" aria-label="Scrollable payment list of every trip member">'+
      (items||'<p class="ref-empty">No trip members yet.</p>')+
      '<p class="ref-roster-empty" data-roster-empty hidden>No members match this filter or search.</p></div>'+
      '<div class="ref-roster-footer"><span data-roster-visible-count>'+totals.rows.length+
      ' of '+totals.rows.length+' shown</span><span>↕ Scroll to see everyone</span></div></section>';
  }
  function refreshPaymentRoster(){
    const root=document.querySelector('#d4-payment-roster');
    if(!root)return;
    const query=(root.querySelector('[data-roster-search]')?.value||'').trim().toLocaleLowerCase();
    let shown=0;
    root.querySelectorAll('[data-roster-group]').forEach(section=>{
      let inGroup=0;
      const included=paymentRosterFilter==='all'||section.dataset.rosterGroup===paymentRosterFilter;
      section.querySelectorAll('[data-roster-card]').forEach(card=>{
        const visible=included&&String(card.dataset.rosterName||'').includes(query);
        card.hidden=!visible;
        if(visible)inGroup++;
      });
      section.hidden=inGroup===0;
      shown+=inGroup;
    });
    root.querySelectorAll('[data-roster-filter]').forEach(button=>{
      const active=button.dataset.rosterFilter===paymentRosterFilter;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const count=root.querySelector('[data-roster-visible-count]');
    if(count)count.textContent=shown+' of '+root.dataset.rosterTotal+' shown';
    const empty=root.querySelector('[data-roster-empty]');
    if(empty)empty.hidden=shown!==0;
  }
  document.addEventListener('click',function(event){
    const filter=event.target.closest('[data-roster-filter]');
    if(filter){
      event.preventDefault();
      paymentRosterFilter=filter.dataset.rosterFilter||'all';
      refreshPaymentRoster();
      const scroller=document.querySelector('#d4-payment-roster [data-roster-scroll]');
      if(scroller)scroller.scrollTop=0;
      return;
    }
    if(event.target.closest('[data-roster-jump]')){
      event.preventDefault();
      const area=document.querySelector('#d4-payment-roster');
      area?.scrollIntoView({behavior:'smooth',block:'start'});
    }
  },true);
  document.addEventListener('input',function(event){
    if(event.target.matches?.('[data-roster-search]'))refreshPaymentRoster();
  });
  collectionsPage=function(){
    const t=current();
    if(!t)return previous.collectionsPage();
    const c=collectionTotals(t),canEdit=isTripAdmin(t);
    const allPayments=(t.collection?.payments||[]).slice().reverse();
    const receiptRow=item=>'<div class="ref-receipt"><span class="ref-receipt-avatar">'+html(String(item.member||'?').slice(0,1).toUpperCase())+'</span>'+
      '<div><strong>'+html(item.member)+'</strong><small>'+(item.adjustment?'Balance correction · ':'')+html(item.date||'')+' · '+html(item.method||'Manual')+'</small></div>'+
      '<b>'+money(item.amount)+'</b>'+
      (canEdit&&!item.adjustment&&item.id?'<button type="button" class="ref-edit-receipt" data-action="collection-edit-payment" data-id="'+html(item.id)+'" aria-label="Edit payment for '+html(item.member)+'">✎ Edit</button>':'')+
      '</div>';
    const history=allPayments.slice(0,6).map(receiptRow).join('');
    const fullHistory=allPayments.map(receiptRow).join('');
    return '<section class="ref-finance-cover"><span class="ref-overline">✦ TRIP COLLECTIONS</span><h2>Payments</h2>'+
      '<p>'+html(t.name)+' · '+t.members.length+' members</p>'+
      '<div class="ref-finance-grid"><div class="ref-ring" style="--pct:'+c.progress+'"><span><strong>'+c.progress+'%</strong><small>Collected</small></span></div>'+
      '<div class="ref-finance-values"><div><small>Total target</small><b>'+money(c.target)+'</b></div>'+
      '<div><small>Received</small><b class="ref-good">'+money(c.paid)+'</b></div>'+
      '<div><small>Remaining</small><b class="ref-due">'+money(c.pending)+'</b></div></div></div>'+
      '<div class="ref-status-grid"><span>✅ Paid <b>'+c.full+'</b></span><span>◐ Partial <b>'+c.partial+'</b></span><span>⏳ Pending <b>'+c.unpaid+'</b></span></div>'+
      '<div class="ref-finance-buttons"><button type="button" class="ref-primary" data-roster-jump="1">👥 All Member Payments</button>'+
      (canEdit?'<button class="ref-secondary" data-action="collection-quick-add" data-id="'+html(t.id)+'">＋ Add Payment</button>':'<span class="ref-readonly">🔒 View only</span>')+'</div></section>'+
      paymentRoster(t)+
      '<section class="ref-card ref-recent"><div class="ref-section-title"><h3>Recent Payments</h3><span class="ref-history-count">Last 6</span></div>'+
      (history||'<p class="ref-empty">No payments recorded yet.</p>')+'</section>'+
      '<details class="ref-full-payment-history"><summary>🧾 All Payment Entries ('+allPayments.length+') <span>⌄</span></summary>'+
      '<div class="ref-history-inner">'+(fullHistory||'<p class="ref-empty">No entries yet.</p>')+'</div></details>'+
      '<details class="ref-original-finance" aria-label="More payment tools"><summary>⚙️ Additional payment tools <span>⌄</span></summary><div class="ref-original-finance-inner">'+previous.collectionsPage()+'</div></details>';
  };
  tripMembers=function(t){
    if(!t)return previous.tripMembers(t);
    const balances=collectionTotals(t).rows,canEdit=isTripAdmin(t);
    const members=(t.members||[]).map(name=>{
      const role=memberRole(t,name);
      const amounts=balances.find(row=>row.member===name);
      return '<article class="ref-person" data-ref-person="'+html(String(name).toLocaleLowerCase())+'">'+
        '<span class="ref-person-avatar" aria-hidden="true">'+html(String(name).slice(0,1).toUpperCase())+'</span>'+
        '<div><strong>'+html(name)+'</strong>'+roleBadge(role)+
        (amounts?'<small class="ref-person-finance">Paid '+money(amounts.paid)+' · Due '+money(amounts.pending)+'</small>':'')+'</div>'+
        (canEdit?'<button type="button" class="ref-edit-paid" data-action="collection-member-total" data-member="'+html(name)+'" aria-label="Edit amount for '+html(name)+'">✎ Edit</button>':'<span class="ref-person-arrow" aria-hidden="true">›</span>')+'</article>';
    }).join('');
    const editors=(t.admins||[]).length;
    return '<section class="ref-members-head"><span class="ref-overline">✦ YOUR PEOPLE</span><h2>Members <em>('+t.members.length+')</em></h2>'+
      '<p>Everyone in your trip, together.</p>'+
      '<div class="ref-member-counts"><span>👥 All '+t.members.length+'</span><span>🛡️ Admins '+editors+'</span></div>'+
      '<label class="ref-member-search">⌕ <input type="search" id="ref-member-search" placeholder="Search member..." aria-label="Search members"></label></section>'+
      '<section class="ref-person-list" id="ref-person-list">'+(members||'<div class="ref-empty">No members yet.</div>')+'</section>'+
      '<details class="ref-expand-tools"><summary>👥 Member Management &amp; Cloud Roster <span>⌄</span></summary>'+
      '<div class="ref-tool-body">'+previous.tripMembers(t)+'</div></details>';
  };
  expensesPage=function(){
    const t=current();
    if(!t)return previous.expensesPage();
    const c=calculations(t);
    const icons={stay:'🛏️',hotel:'🛏️',travel:'🚕',transport:'🚕',food:'🍴',drink:'☕',activity:'🎭',sightseeing:'🏖️',other:'🧾'};
    const rows=Object.entries(c.categories||{}).sort((a,b)=>b[1]-a[1]);
    const cards=rows.map(([name,amount])=>{
      const key=String(name).toLowerCase();
      const emoji=Object.entries(icons).find(([k])=>key.includes(k))?.[1]||'🧾';
      return '<div class="ref-expense-row"><span class="ref-expense-icon">'+emoji+'</span><strong>'+html(name)+'</strong><b>'+money(amount)+'</b></div>';
    }).join('');
    return '<section class="ref-expense-cover"><span class="ref-overline">✦ TRIP EXPENSES</span><h2>Expenses</h2><p>'+html(t.name)+'</p>'+
      '<div class="ref-expense-sum"><span>💼</span><div><small>Total spent</small><strong>'+money(c.total)+'</strong></div></div></section>'+
      '<section class="ref-card"><div class="ref-section-title"><h3>Spending Categories</h3><span>'+rows.length+' categories</span></div>'+
      (cards||'<p class="ref-empty">No expenses recorded yet.</p>')+'</section>'+
      (isTripAdmin(t)?'<button class="ref-primary ref-wide" data-action="quick-expense">＋ Add Expense</button>':'<p class="ref-readonly">🔒 Members can view expenses.</p>')+
      '<section class="ref-existing-expenses">'+previous.expensesPage()+'</section>';
  };
  adminPage=function(){
    if(!isMain())return previous.adminPage();
    return '<section class="ref-admin-hero"><span class="ref-crown">♛</span><span class="ref-overline">D4 TRIP · CONTROL CENTRE</span>'+
      '<h2>Main Admin</h2><p>Manage trips and permissions securely.</p></section>'+
      '<div class="ref-admin-shortcuts">'+
      iconButton('👥','Members','open-tab','data-ctx="members"')+
      iconButton('💳','Payments','nav','data-view="collections"')+
      iconButton('🗓️','Trip Plan','open-tab','data-ctx="plan"')+
      iconButton('⚙️','Settings','nav','data-view="profile"')+'</div>'+previous.adminPage();
  };
  tripPage=function(){
    const t=current();
    if(!t)return previous.tripPage();
    if(tripTab!=='plan')return previous.tripPage();
    return '<div class="ref-plan-cover"><span class="ref-overline">✦ DAY BY DAY</span><h2>Day Plan</h2>'+
      '<p>'+html(t.name)+' · '+html(shortDate(t.start))+' — '+html(shortDate(t.end))+'</p></div>'+
      previous.tripPage();
  };
  entryPage=function(){
    return '<div class="ref-entry-heading"><span>✦ D4 TRIP</span><strong>Plan · Track · Share · Enjoy</strong></div>'+
      previous.entryPage();
  };
  const navPaths={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M8 14h3m-3 4h3"/>',
    chat:'<path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
    more:'<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  const navSvg=key=>'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+navPaths[key]+'</svg>';
  function mobileItem(icon,label,action,attr,active){
    return '<button type="button" class="ref-nav-item'+(active?' active':'')+'" data-action="'+action+'" '+attr+' aria-label="'+label+'"'+
      (active?' aria-current="page"':'')+'><span class="ref-nav-icon" aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>';
  }
  bottomNav=function(){
    if(view==='entry'||!current())return previous.bottomNav();
    const t=current();
    const canEdit=isTripAdmin(t);
    const items=[
      mobileItem(navSvg('home'),'Home','open-tab','data-ctx="overview"',view==='trip'&&tripTab==='overview'),
      mobileItem(navSvg('calendar'),'Day Plan','open-tab','data-ctx="plan"',view==='trip'&&tripTab==='plan'),
      '<button type="button" class="ref-nav-plus" data-ref-action="toggle-plus" aria-label="'+(canEdit?'Add trip item':'Explore trip sections')+'" aria-expanded="'+(quickPanel==='plus')+'"><span>＋</span></button>',
      mobileItem(navSvg('chat'),'Chat','nav','data-view="chat"',view==='chat'),
      '<button type="button" class="ref-nav-item'+(quickPanel==='more'?' active':'')+'" data-ref-action="toggle-more" aria-label="More sections" aria-expanded="'+(quickPanel==='more')+'"><span class="ref-nav-icon">'+navSvg('more')+'</span><small>More</small></button>'
    ];
    let overlay='';
    if(quickPanel){
      const links=quickPanel==='plus'&&canEdit
        ?[
          ['💳','Record Payment','collection-quick-add','data-id="'+html(t.id)+'"'],
          ['🧾','Add Expense','quick-expense',''],
          ['🗓️','Add Activity','quick-plan',''],
          ['👥','Add Member','modal-add-member','']
        ]
        :[
          ['👥','Members','open-tab','data-ctx="members"'],
          ['💳','Payments','nav','data-view="collections"'],
          ['🧾','Expenses','nav','data-view="expenses"'],
          ['📊','Reports','nav','data-view="reports"'],
          ['📸','Memories','nav','data-view="memories"'],
          ['🔔','Alerts','nav','data-view="alerts"'],
          ['⚙️','Settings','nav','data-view="profile"'],
          ...(isMain()?[['👑','Main Admin','d4-admin-panel','']]:[])
        ];
      overlay='<div class="ref-nav-overlay" role="group" aria-label="'+(quickPanel==='plus'?'Quick actions':'More trip sections')+'">'+
        '<div class="ref-nav-overlay-title">'+(quickPanel==='plus'?(canEdit?'Quick Add':'Explore'):'More Sections')+
        '<button type="button" data-ref-action="close-panel" aria-label="Close menu">✕</button></div>'+
        links.map(([emoji,label,action,attr])=>'<button class="ref-menu-link" type="button" data-action="'+action+'" '+attr+'><span>'+emoji+'</span>'+label+'<b>›</b></button>').join('')+
        '</div>';
    }
    return '<nav class="bottom-nav ref-bottom-nav" aria-label="D4 Trip navigation">'+overlay+items.join('')+'</nav>';
  };
  document.addEventListener('click',function(event){
    const el=event.target.closest('[data-ref-action]');
    if(el){
      event.preventDefault();event.stopImmediatePropagation();
      if(el.dataset.refAction==='toggle-plus')quickPanel=quickPanel==='plus'?'':'plus';
      else if(el.dataset.refAction==='toggle-more')quickPanel=quickPanel==='more'?'':'more';
      else quickPanel='';
      render();
    } else if(event.target.closest('.ref-menu-link')){
      quickPanel='';
    }
  },true);
  document.addEventListener('input',function(event){
    if(event.target.id!=='ref-member-search')return;
    const q=event.target.value.trim().toLocaleLowerCase();
    document.querySelectorAll('[data-ref-person]').forEach(el=>{
      el.hidden=!el.dataset.refPerson.includes(q);
    });
  });
  render();
})();
