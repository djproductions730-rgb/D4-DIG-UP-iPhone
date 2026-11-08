/* D4 Trip premium UI bridge for the existing Firebase-backed application.
 * Presentation and existing action wiring only. No access codes, fake data,
 * migrations, cloud writes, or privilege changes are performed here.
 */
(function () {
  'use strict';
  const original = {
    topBar: topBar, home: home, tripsPage: tripsPage, entryPage: entryPage, bottomNav: bottomNav, collectionsPage: collectionsPage,
    tripPage: tripPage, tripMembers: tripMembers, tripOverview: tripOverview, profilePage: profilePage, chatsPage: chatsPage
  };
  const MODE_KEY = 'd4_trip_premium_mode_v2_ocean';
  const modes = ['midnight', 'light', 'sunset'];
  let mode = 'midnight';
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (modes.includes(stored)) mode = stored;
  } catch (_) {}
  function applyTheme() {
    document.body.classList.add('d4-premium');
    document.body.classList.toggle('d4-light', mode === 'light');
    document.body.classList.toggle('d4-sunset', mode === 'sunset');
    document.documentElement.style.colorScheme = mode === 'light' ? 'light' : 'dark';
  }
  function safe(value) { return esc(value == null ? '' : value); }
  function button(icon, title, action, attr) {
    return '<button type="button" class="d4p-tile" data-action="' + action + '" ' + (attr || '') +
      '><span class="d4p-icon" aria-hidden="true">' + icon + '</span><strong>' + safe(title) + '</strong></button>';
  }
  function teamButton(icon, title, action) {
    return '<button type="button" class="d4p-tile" data-team="' + action +
      '"><span class="d4p-icon" aria-hidden="true">' + icon + '</span><strong>' + safe(title) + '</strong></button>';
  }
  function mainSharePanel(t) {
    if (!t || !(teamId ? window.D4Team?.canEdit?.() : isMain())) return '';
    const tripId=teamId||t.id;
    if(!/^[A-Za-z0-9_-]{1,100}$/.test(String(tripId)))return '';
    const url=new URL(location.pathname,location.origin);
    url.searchParams.set('team',tripId);
    const full=url.href;
    return '<section class="card d4-main-share-panel" aria-label="Main Admin Share Join Link">'+
      '<h3>🔗 Share Join Link</h3>'+
      '<p>Send this link to members. They enter their name and request approval.</p>'+
      '<label for="d4-main-join-link">Your Trip Join Link</label>'+
      '<input id="d4-main-join-link" class="input d4-main-join-link" type="text" readonly aria-label="Your Trip Join Link" value="'+safe(full)+'">'+
      '<button type="button" class="btn mint block d4-share-join-button" data-team="share-join-link">📋 Copy Link</button>'+
      '<p class="tiny">'+(teamId?'Link is for the selected shared trip.':'First copy also publishes a shared copy after Main Admin Firebase sign-in.')+'</p>'+
      '</section>';
  }

  function sharedSyncGuide(t) {
    if (!t) return '';
    if (teamId) {
      const info=window.D4Team?.syncInfo?.()||{};
      const canUpdate=window.D4Team?.canEdit?.()===true;
      const role=canUpdate ? '🛡️ Admin editing' : '👁️ Member view only';
      const state=info.connected?'☁️ Firebase shared trip · live':'⏳ '+(info.status||'Connecting to shared trip');
      const summary=info.connected ? ' · revision '+Number(info.revision||0) : '';
      return '<section class="d4-team-sync-guide shared" aria-label="Firebase shared trip status">'+
        '<div class="d4-team-sync-head"><strong>'+safe(state+summary)+'</strong><span>'+role+'</span></div>'+
        '<p>Everyone approved for this exact trip link can view the same Members, Day Plans, Payments and Expenses. Only Main Admin / Trip Admin can edit.</p>'+
        '<div class="d4-team-sync-actions"><span>'+t.members.length+' members · '+(t.plans||[]).length+' day-plan stops</span>'+
        '<button type="button" class="d4-refresh-mini" data-team="refresh-shared" aria-label="Refresh shared trip data" title="Refresh shared trip data">↻</button></div>'+
        (info.saving?'<p class="d4-team-sync-saving">Saving changes for members…</p>':'')+'</section>';
    }
    if (!isMain()) return '<section class="d4-team-sync-guide private"><strong>📱 Device-only trip</strong><p>This local copy does not automatically show changes to other devices. Open an approved Firebase shared trip link to view the group trip.</p></section>';
    return '<section class="d4-team-sync-guide private" aria-label="Device-only trip notice">'+
      '<strong>⚠️ Private trip copy — other members cannot see edits here</strong>'+
      '<p>Changes to Members and Day Plan on this screen stay in your private copy. Open the Firebase shared copy before editing the group itinerary. Existing private edits are not automatically transferred.</p>'+
      '<button type="button" data-team="open-shared">☁️ Open Shared Trip for Everyone</button></section>';
  }
  function tileRow(t) {
    if (!t || !isTripAdmin(t)) return '';
    const buttons = [
      button('💳', 'Record Payment', 'collection-quick-add', 'data-id="' + safe(t.id) + '"'),
      button('🧾', 'Add Expense', 'quick-expense'),
      button('📅', 'Edit Trip Days', 'open-tab', 'data-ctx="plan"'),
      button('👥', 'Manage Members', 'open-tab', 'data-ctx="members"')
    ];
    if (teamId) {
      buttons.push(teamButton('🔗', 'Share Trip Link', 'copy'));
      if (isMain()) {
        buttons.push(teamButton('🛡️', 'Promote Admin', 'admin'));
        buttons.push(teamButton('↘️', 'Demote Admin', 'invite'));
        buttons.push(teamButton('⛔', 'Remove Access', 'revoke'));
      }
    } else if (isMain()) {
      buttons.push(button('🛡️', 'Assign Trip Admin', 'modal', 'data-modal="assign-admin"'));
    }
    return '<h3 class="d4p-title">' + (isMain() ? 'Main Admin Quick Actions' : 'Admin Quick Actions') +
      '</h3><p class="d4p-caption">Only permitted actions are shown. Firebase rules remain the authority for shared trips.</p>' +
      '<div class="d4p-grid d4p-admin-grid">' + buttons.join('') + '</div>';
  }
  // A clear, reachable Back action on every inner screen (never a dead-end tab).
  topBar = function () {
    const header = original.topBar();
    const t = current();
    const isTripDetail = view === 'trip' && tripTab !== 'overview';
    const destination = requestsOpen || adminOpen || isTripDetail ? 'Trip Dashboard' :
      view === 'trip' ? 'Payments' :
      view === 'collections' || view === 'home' || view === 'trips' ? 'My Trips' :
      t ? 'Trip Dashboard' : 'My Trips';
    const back = '<button type="button" class="d4p-nav-back" data-action="d4-back" aria-label="Back to ' +
      destination + '">← Back <span>' + destination + '</span></button>';
    const library = view === 'entry' ? '' : teamId
      ? '<a class="d4p-nav-library" href="./">My Trips</a>'
      : '<button type="button" class="d4p-nav-library" data-action="entry-back">My Trips</button>';
    return '<nav class="d4p-breadcrumb" aria-label="Back navigation">' + back + library + '</nav>' + header + (window.D4TripJoin?.notificationBanner?.()||'')+(window.D4TripJoin?.mainAdminBanner?.()||'');
  };
  const GUEST_NAME_KEY='d4_trip_guest_name_v1';
  const JOIN_STAGE_KEY='d4_trip_guest_join_stage_v1';
  // A Firebase auth callback can re-render while a guest pastes a link.
  // Preserve the unsent value in memory so iOS WebKit never loses it.
  let pendingTripLink='';
  function savedGuestName(){
    try{return String(localStorage.getItem(GUEST_NAME_KEY)||'').slice(0,50)}catch(_){return ''}
  }
  function guestJoinStage(){
    try{return sessionStorage.getItem(JOIN_STAGE_KEY)==='link' && savedGuestName().trim().length>=2?'link':'name'}catch(_){return 'name'}
  }
  document.addEventListener('input',function(event){
    if(event.target?.id==='d4-trip-link-input'){
      pendingTripLink=String(event.target.value||'').slice(0,2048);
      return;
    }
    if(event.target?.id!=='d4-guest-name-input')return;
    try{localStorage.setItem(GUEST_NAME_KEY,String(event.target.value||'').slice(0,50))}catch(_){}
  });
  function inviteLinkCard() {
    const name=savedGuestName();
    const stage=guestJoinStage();
    const first='<form id="d4-save-join-name" style="display:grid;gap:12px">'+
      '<div class="d4-join-name-field"><label for="d4-guest-name-input">👤 Your Name</label>'+
      '<input id="d4-guest-name-input" name="name" class="input d4-join-visible-name" type="text" minlength="2" maxlength="50" autocomplete="name" value="'+safe(name)+'" placeholder="Type your name here" required>'+
      '<small>Your name saves automatically on this device.</small></div>'+
      '<button type="submit" class="btn mint block d4-guest-join-button">Submit Name</button></form>';
    const second='<p class="d4-join-saved-name">✅ Name saved: <strong>'+safe(name)+'</strong></p>'+
      '<form id="d4-open-trip-link" style="display:grid;gap:12px">'+
      '<label for="d4-trip-link-input">Paste Trip Link</label>'+
      '<input id="d4-trip-link-input" name="tripLink" class="input" type="url" inputmode="url" autocomplete="url" value="'+safe(pendingTripLink)+'" placeholder="Paste your Main Admin link here" required>'+
      '<button type="submit" class="btn mint block d4-guest-join-button">Continue with the Link</button></form>'+
      '<button type="button" class="btn small ghost" data-action="d4-edit-join-name">✎ Edit Name</button>';
    return '<section class="card d4-name-link-card" id="d4-invite-link-card" aria-label="Join Trip by name then link">'+
      '<h2>🔗 Join Trip</h2>'+
      '<p>'+(stage==='name'?'Step 1 of 2 · Enter your name first.':'Step 2 of 2 · Paste the link shared by your admin.')+'</p>'+
      (stage==='name'?first:second)+
      '<p class="tiny">Main Admin or Trip Admin must approve your request. No trip code, email or password required.</p>'+
      '</section>';
  }
  document.addEventListener('submit',function(event){
    if(event.target?.id!=='d4-save-join-name')return;
    event.preventDefault();
    const name=String(new FormData(event.target).get('name')||'').trim().replace(/\s+/g,' ');
    if(name.length<2||name.length>50){window.D4TripLocal?.toast?.('Enter your name (2–50 characters).');return}
    try{
      localStorage.setItem(GUEST_NAME_KEY,name);
      sessionStorage.setItem(JOIN_STAGE_KEY,'link');
    }catch(_){}
    render();
    document.querySelector('#d4-trip-link-input')?.focus({preventScroll:true});
  });
  document.addEventListener('submit',function(event){
    if(event.target?.id!=='d4-open-trip-link')return;
    event.preventDefault();
    const value=String(new FormData(event.target).get('tripLink')||'').trim();
    const name=savedGuestName().trim().replace(/\s+/g,' ');
    try{
      if(name.length<2||name.length>50)throw Error('Save your name first.');
      const url=new URL(value);
      const trip=url.searchParams.get('team');
      if(!trip||!/^[A-Za-z0-9_-]{1,100}$/.test(trip))throw Error('Use a valid Trip Share Link from your admin.');
      if(url.origin!==location.origin||url.pathname!==location.pathname)
        throw Error('This link must be for the same D4 Trip app.');
      // Do not expose member names in URLs. This same-tab handoff creates a request after navigation.
      sessionStorage.setItem('d4_trip_join_name_v1_'+trip,name);
      pendingTripLink='';
      location.href=url.origin+url.pathname+'?team='+encodeURIComponent(trip);
    }catch(err){window.D4TripLocal?.toast?.(err.message||'Invalid Trip Share Link')}
  });
  document.addEventListener('click',function(event){
    if(event.target.closest('[data-action="d4-edit-join-name"]')){
      event.preventDefault();
      try{sessionStorage.setItem(JOIN_STAGE_KEY,'name')}catch(_){}
      render();
      document.querySelector('#d4-guest-name-input')?.focus({preventScroll:true});
      return;
    }
    if(!event.target.closest('[data-action="d4-open-invite"]'))return;
    event.preventDefault();
    event.stopPropagation();
    try{sessionStorage.setItem(JOIN_STAGE_KEY,'name')}catch(_){}
    view='entry';
    render();
    document.querySelector('#d4-invite-link-card')?.scrollIntoView({block:'center',behavior:'smooth'});
    document.querySelector('#d4-guest-name-input, #d4-trip-link-input')?.focus({preventScroll:true});
  },true);
  // One guest join entry, visible immediately; never bury the Name input inside
  // the old fixed-height trip-card list, which clips on small phones.
  entryPage = function () {
    if (!isMain() && !teamId) {
      // Show the name box at the top, but preserve existing selectable trips
      // beneath it so previous users and smoke-tested local trips still work.
      const legacy=original.entryPage();
      const listStart=legacy.indexOf('<div class="d4-new-card-list">');
      const listEnd=legacy.indexOf('<div class="d4-new-bottom">',listStart);
      const oldTrips=listStart>=0&&listEnd>listStart&&legacy.includes('data-action="entry-select-trip"')
        ?'<section class="d4-guest-existing-trips"><h3>My Existing Trips</h3>'+legacy.slice(listStart,listEnd)+'</section>':'';
      return '<main class="d4-single-join-entry">'+
        '<div class="d4-join-entry-brand"><strong>D4 TRIP</strong><span>Travel together</span></div>'+
        inviteLinkCard()+oldTrips+
        '<p class="d4-join-entry-note">Approved members can open their trip from the invitation link.</p>'+
        '</main>';
    }
    return (isMain()?mainSharePanel(current()):'')+original.entryPage().replace('<h1>My Trips</h1>','<h1>Explore Trips</h1>')
      .replace(/<button class="d4-install-help" data-action="install-help">.*?<\/button>/s,'')
      .replace(/<button class="d4-install-help" data-action="replay-intro">.*?<\/button>/s,'');
  };
  // The local Home shows the name form directly, with no duplicate Join by Name
  // buttons; the Trips page retains normal trip browsing without another CTA.
  home = function () {
    const html=original.home();
    if(isMain())return mainSharePanel(current())+html;
    if(teamId)return html;
    return html.replace('</div></div>', '</div></div>'+inviteLinkCard());
  };
  tripsPage = function () {
    const html=original.tripsPage();
    if(isMain() || teamId)return html;
    return html.replace(/<button[^>]*data-action="d4-open-invite"[^>]*>.*?<\/button>/s,'');
  };
  collectionsPage = function () {
    const html = original.collectionsPage();
    const t = current();
    if (!t) return html;
    const c = collectionTotals(t);
    // Breakdown Option 3: totals use the original ledger calculations unchanged.
    // Partial/advance is a SUBSET of received, never counted a second time.
    const advance = c.rows.filter(r=>r.status==='Partial').reduce((sum,r)=>sum+r.paid,0);
    const fullReceived = c.paid-advance;
    const breakdown = '<section class="d4-blue-breakdown" aria-label="Detailed payment breakdown">'+
      '<div class="d4-blue-breakdown-head"><span>💳 DETAILED PAYMENT BREAKDOWN</span><strong>'+c.progress+'% received</strong></div>'+
      '<div class="d4-blue-breakdown-row"><span>🎯 Total Trip Amount</span><strong>'+money(c.target)+'</strong></div>'+
      '<div class="d4-blue-breakdown-row"><span>✅ Paid in Full</span><strong>'+money(fullReceived)+'</strong></div>'+
      '<div class="d4-blue-breakdown-row"><span>💠 Advance / Partial Paid</span><strong>'+money(advance)+'</strong></div>'+
      '<div class="d4-blue-breakdown-row d4-blue-total"><span>💰 Total Received</span><strong>'+money(c.paid)+'</strong></div>'+
      '<div class="d4-blue-breakdown-row d4-blue-outstanding"><span>⏳ Remaining Amount</span><strong>'+money(c.pending)+'</strong></div>'+
      '<p class="d4p-caption">Advance is included in Total Received. Remaining amounts are calculated from member balances; archived payments stay in history.</p>'+
      '<div class="d4-blue-status"><span>✅ '+c.full+' Paid</span><span>🟠 '+c.partial+' Partial</span><span>🔴 '+c.unpaid+' Unpaid</span></div></section>';
    const ring = '<section class="d4p-progress" aria-label="Payment progress ' + c.progress +
      ' percent"><div class="d4p-ring" style="--progress:' + c.progress +
      '%"><span>' + c.progress + '%</span></div><div><strong>Collected so far</strong><p>' +
      c.full + ' paid · ' + c.partial + ' partial · ' + c.unpaid + ' unpaid</p>' +
      '<p>' + money(c.paid) + ' received of ' + money(c.target) + '</p></div></section>';
    return html.replace('<div class="d4-payment-counts">', breakdown + ring + '<div class="d4-payment-counts">')
      .replace('✈️ Enter Trip →', 'Continue →')
      .replace('<button class="cc-open-members"',
        '<button type="button" class="cc-skip" data-action="enter-selected-trip">Skip →</button><button class="cc-open-members"');
  };
  let adminOpen = false, requestsOpen = false;
  // The old bottom navigation is now a compact, fixed RIGHT-side rail.
  // Keep the existing delegated data-action routing for all buttons.
  // Keep the compact Black & Gold navigation rendered by index.html.
  // The former liquid-rail override conflicted with the production stylesheet.
  bottomNav = function () { return original.bottomNav(); };
  // The local roster can lag behind a cloud approval. Show the authenticated
  // shared-trip member list alongside local records, without merging/deleting data.
  tripMembers = function (t) {
    return '<p class="d4-team-members-access">'+(teamId?'☁️ Live shared roster · Approved members can view every name.':'📱 Private roster · Changes here are not shared.')+'</p>' + original.tripMembers(t) + (window.D4TripJoin?.approvedMembersPanel?.(t?.id)||'');
  };
  function adminSurface(){
    const t=current();
    const shared=!!teamId;
    const sharedEditor=shared&&window.D4Team?.canEdit?.()===true;
    const verifiedMain=isMain();
    if(!t||!(shared?sharedEditor:isTripAdmin(t)))return '';
    const role=verifiedMain||(shared&&window.D4Team?.canRemove?.()===true)?'Main Admin':'Trip Admin';
    return '<section class="d4p-section d4-liquid-admin"><div class="d4p-hero"><small>👑 D4 TRIP · CONTROL CENTRE</small>'+
      '<h2>'+role+' Panel <small class="d4-build-version">v27</small></h2>'+
      '<p>Manage approved members, admin access and trip sharing.</p></div>'+
      (window.D4TripJoin?.approvedMembersPanel?.()||'')+
      mainSharePanel(t)+
      (shared||verifiedMain?'':'<section class="card"><h3>🔗 Share Trip Link</h3><p>Sign in as Main Admin to publish and copy this trip’s invitation link.</p></section>')+
      '<div class="d4p-grid">'+
      button('👥','Manage Members','open-tab','data-ctx="members"')+
      button('🔔','Join Requests','d4-requests-panel')+
      (shared&&window.D4Team?.canRemove?.()?teamButton('🛡️','Assign Admin','admin'):'')+
      '</div></section>';
  }
  // A dedicated Requests screen: reuse the existing Firebase listeners and
  // permission-checked Accept/Reject handlers; never clone or migrate trip data.
  function requestsSurface(){
    const t=current();
    const shared=!!teamId;
    const allowed=t && (shared ? window.D4Team?.canEdit?.()===true : isTripAdmin(t));
    if(!allowed)return '<section class="card"><h3>Access restricted</h3><p>Only Main Admin and Trip Admin may review join requests.</p></section>';
    const inbox=shared
      ?(window.D4TripJoin?.adminPanel?.()||'<section class="card"><p>Connecting to shared trip requests…</p></section>')
      :isMain()
        ?(window.D4TripJoin?.mainAdminInbox?.()||'<section class="card"><p>Connecting to Firebase join requests…</p></section>')
        :'<section class="card"><p>Sign in with the authorized Firebase admin account to review requests.</p>'+
          '<button type="button" class="btn mint" data-action="nav" data-view="profile">⚙️ Firebase Sign In</button></section>';
    return '<section class="d4p-section d4-requests-page" aria-label="Join Requests">'+
      '<div class="d4p-hero"><small>🔔 D4 TRIP · ACCESS REQUESTS</small>'+
      '<h2>Join Requests</h2><p>Review pending members and recent decisions in one place.</p></div>'+inbox+'</section>';
  }
  document.addEventListener('click',function(e){
    const action=e.target.closest('[data-action]');
    if(!action)return;
    const name=action.dataset.action;
    if(name!=='d4-admin-panel'&&name!=='d4-requests-panel'){
      if(['nav','open-tab','trip-tab','select-trip','entry-back','d4-back'].includes(name)){
        adminOpen=false;requestsOpen=false;
      }
      return;
    }
    e.preventDefault();
    if(!current() || !(teamId ? window.D4Team?.canEdit?.() : isTripAdmin(current())))return;
    adminOpen=name==='d4-admin-panel';
    requestsOpen=name==='d4-requests-panel';
    tripTab='overview';view='trip';render();
  },true);
  tripOverview = function (t) {
    const c = collectionTotals(t);
    const days = datesInTrip(t).length;
    return '<section class="d4p-section" aria-label="Trip dashboard">' +
      '<div class="d4p-hero"><small>✦ D4 TRIP · YOUR JOURNEY</small><h2>' +
      safe(t.destination) + '</h2><p>' + safe(t.name) + ' · ' +
      shortDate(t.start) + ' – ' + shortDate(t.end) + '</p></div>' +
      mainSharePanel(t) +
      '<div class="d4p-stats"><div class="d4p-stat"><small>Members</small><strong>' +
      t.members.length + '</strong></div><div class="d4p-stat"><small>Trip Days</small><strong>' +
      days + '</strong></div><div class="d4p-stat"><small>Remaining</small><strong>' +
      money(c.pending) + '</strong></div></div>' +
      '<h3 class="d4p-title">Plan & Explore</h3>'+
      '<div class="d4-blue-category-row" aria-label="Trip activity categories">'+
      button('✈️','Travel','open-tab','data-ctx="plan"')+
      button('🍽️','Food & Drinks','open-tab','data-ctx="plan"')+
      button('🌍','Explore','open-tab','data-ctx="plan"')+
      button('🏨','Hotel & Stay','open-tab','data-ctx="plan"')+
      '</div>'+
      '<h3 class="d4p-title">Trip Sections</h3><nav class="d4p-grid d4p-nav-grid" aria-label="Trip section navigation">' +
      button('🏠','Overview','open-tab','data-ctx="overview" aria-current="page"') +
      button('📅','Day Plan','open-tab','data-ctx="plan"') +
      button('🧾','Expenses','open-tab','data-ctx="expenses"') +
      button('💳','Paid / Pending','nav','data-view="collections"') +
      button('👥','Members','open-tab','data-ctx="members"') +
      button('🔔','Alerts','open-tab','data-ctx="reminders"') +
      button('📸','Memories','open-tab','data-ctx="memories"') +
      button('📑','Reports','open-tab','data-ctx="report"') +
      button('⚙️','Settings','nav','data-view="profile"') +
      '</nav>' + tileRow(t) + '</section>';
  };
  tripPage = function () {
    if(requestsOpen) return requestsSurface();
    if(adminOpen) return adminSurface();
    const t = current();
    if (!t) return original.tripPage();
    const sync=sharedSyncGuide(t);
    if (tripTab === 'overview') return sync+tripOverview(t);
    if (tripTab === 'plan') return sync+'<section class="d4p-section">' + tripPlan(t) + '</section>';
    if (tripTab === 'expenses') return sync+'<section class="d4p-section">' + tripExpenses(t) + '</section>';
    if (tripTab === 'members') return sync+'<section class="d4p-section">' + tripMembers(t) + '</section>';
    if (tripTab === 'reminders') return sync+'<section class="d4p-section">' + tripReminders(t) + '</section>';
    if (tripTab === 'memories') return sync+'<section class="d4p-section">' + tripMemories(t) + '</section>';
    if (tripTab === 'report') return sync+'<section class="d4p-section">' + tripReport(t) + '</section>';
    if (tripTab === 'collections') return sync+collectionsPage();
    // An old saved Split tab selection is never re-exposed. Financial history stays stored.
    if (tripTab === 'settle') { tripTab = 'overview'; return tripOverview(t); }
    return original.tripPage();
  };
  chatsPage = function () {
    return '<section class="d4p-section"><div class="d4p-coming">' +
      '<div class="d4p-chat-icon" aria-hidden="true">💬</div>' +
      '<h2>Chats — Coming Soon</h2>' +
      '<p>Trip messaging will arrive in a later release. Existing saved messages have not been deleted or modified.</p>' +
      '<span class="pill">🔒 Not active yet</span></div></section>';
  };
  profilePage = function () {
    // Guest invite links must open the name-only request form, never an account/login screen.
    if (teamId && !window.D4Team?.hasAccess?.()) return original.profilePage();
    const t = current();
    const account = window.D4TripCloud?.user;
    const label = isMain() ? 'Main Admin' : (t && isTripAdmin(t) ? 'Trip Admin' : 'Member');
    const email = account?.email ? safe(account.email) : 'Sign in to manage your cloud account';
    const modeButtons = modes.map(function (name) {
      const title = name === 'midnight' ? '🌊 Ocean Blue' : name === 'light' ? '☀️ Light' : '🌅 Sunset';
      return '<button type="button" data-d4-theme="' + name + '" aria-pressed="' +
        (name === mode ? 'true' : 'false') + '">' + title + '</button>';
    }).join('');
    const cloudPassword = account?.email
      ? '<button type="button" class="btn small ghost" data-cloud-action="reset-password">🔐 Change Password (email link)</button>'
      : '';
    const danger = isMain() && t
      ? '<h3 class="d4p-title">Trip management</h3><div class="card"><h3>Delete this trip</h3>' +
        '<p class="d4p-caption">Only Main Admin can delete trips. A backup and exact-name confirmation are required. Shared and private copies are separate.</p>' +
        '<button type="button" class="btn negative" data-action="delete-trip" data-id="' + safe(t.id) + '">🗑️ Delete ' + safe(t.name) + '</button></div>'
      : '';
    const joining = !t
      ? '<section class="card"><h3>🔗 Join a Trip by Name</h3>'+
        '<p>Open the trip invitation link from Main Admin or Trip Admin. Enter only your name and request approval.</p>'+
        '<div class="row"><button type="button" class="btn mint" data-action="d4-open-invite">Open Trip Link</button>'+
        '<button type="button" class="btn ghost" data-action="entry-back">← My Trips</button></div></section>'
      : '';
    return '<section class="d4p-section"><div class="d4p-hero"><small>⚙️ PROFILE & SETTINGS</small>' +
      '<h2>' + safe(label) + '</h2><p>' + email + '</p></div>' +
      mainSharePanel(t) +
      (!isMain()&&!isTripAdmin(t)?'<p class="d4p-caption">Your trip spending and trip days are available in view-only mode.</p>':'') +
      '<h3 class="d4p-title">Appearance</h3><div class="card"><p class="d4p-caption">Theme selection</p>' +
      '<div class="d4p-theme-grid">' + modeButtons + '</div></div>' +
      '<h3 class="d4p-title">Account & Notifications</h3><div class="card"><div class="row">' +
      cloudPassword +
      '<button type="button" class="btn small ghost" data-action="request-notify">🔔 Notifications</button>' +
      '</div><p class="d4p-caption">Password changes use Firebase email verification. Logout, sign-in, and Forgot Password remain in the secure Firebase account panel below.</p></div>' +
      danger + joining + '<h3 class="d4p-title">Firebase Account & Backup</h3>' + original.profilePage() + '</section>';
  };
  document.addEventListener('click', function (event) {
    const control = event.target.closest('[data-d4-theme]');
    if (!control) return;
    const next = control.dataset.d4Theme;
    if (!modes.includes(next)) return;
    mode = next;
    try { localStorage.setItem(MODE_KEY, mode); } catch (_) {}
    applyTheme();
    render();
  });
  applyTheme();
  render();
})();
