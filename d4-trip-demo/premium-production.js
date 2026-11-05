/* D4 Trip premium UI bridge for the existing Firebase-backed application.
 * Presentation and existing action wiring only. No access codes, fake data,
 * migrations, cloud writes, or privilege changes are performed here.
 */
(function () {
  'use strict';
  const original = {
    topBar: topBar, entryPage: entryPage, bottomNav: bottomNav, collectionsPage: collectionsPage,
    tripPage: tripPage, tripOverview: tripOverview, profilePage: profilePage, chatsPage: chatsPage
  };
  const MODE_KEY = 'd4_trip_premium_mode_v1';
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
  function tileRow(t) {
    if (!t || !isTripAdmin(t)) return '';
    const buttons = [
      button('💳', 'Record Payment', 'collection-quick-add', 'data-id="' + safe(t.id) + '"'),
      button('🧾', 'Add Expense', 'quick-expense'),
      button('📅', 'Edit Trip Days', 'open-tab', 'data-ctx="plan"'),
      button('👥', 'Manage Members', 'open-tab', 'data-ctx="members"')
    ];
    if (teamId) {
      buttons.push(teamButton('✉️', 'Invite Member', 'invite'));
      buttons.push(teamButton('🔗', 'Share Trip Link', 'copy'));
      if (isMain()) {
        buttons.push(teamButton('🛡️', 'Promote Admin', 'admin'));
        buttons.push(teamButton('↘️', 'Demote Admin', 'invite'));
        buttons.push(teamButton('⛔', 'Remove Access', 'revoke'));
      } else {
        buttons.push(teamButton('⛔', 'Remove Member Access', 'revoke'));
      }
    } else if (isMain()) {
      buttons.push(button('🛡️', 'Assign Trip Admin', 'modal', 'data-modal="assign-admin"'));
      buttons.push(button('🔑', 'Manage Trip Code', 'modal', 'data-modal="new-code"'));
    }
    return '<h3 class="d4p-title">' + (isMain() ? 'Main Admin Quick Actions' : 'Admin Quick Actions') +
      '</h3><p class="d4p-caption">Only permitted actions are shown. Firebase rules remain the authority for shared trips.</p>' +
      '<div class="d4p-grid">' + buttons.join('') + '</div>';
  }
  topBar = function () {
    const header = original.topBar();
    if (!current() || view === 'collections') return header;
    const back = '<button type="button" class="btn small ghost" data-action="open-tab" data-ctx="overview">← Trip Dashboard</button>';
    const library = teamId ? '<a class="btn small ghost" href="./">My Trips</a>' : '<button type="button" class="btn small ghost" data-action="entry-back">My Trips</button>';
    return header + '<div class="row d4p-breadcrumb" aria-label="Trip navigation">' + back + library + '</div>';
  };
  entryPage = function () {
    const html = original.entryPage();
    return html.replace('<h1>My Trips</h1>', '<h1>Explore Trips</h1>')
      .replace('<button data-action="enter-app">Open dashboard</button>', '')
      .replace(/<button class="d4-install-help" data-action="install-help">[\s\S]*?<\/button>/, '')
      .replace(/<button class="d4-install-help" data-action="replay-intro">[\s\S]*?<\/button>/, '')
      .replace('Choose a trip → Collection → Trip Dashboard', 'Choose a destination to see payment progress');
  };
  collectionsPage = function () {
    const html = original.collectionsPage();
    const t = current();
    if (!t) return html;
    const c = collectionTotals(t);
    const ring = '<section class="d4p-progress" aria-label="Payment progress ' + c.progress +
      ' percent"><div class="d4p-ring" style="--progress:' + c.progress +
      '%"><span>' + c.progress + '%</span></div><div><strong>Payment progress</strong><p>' +
      c.full + ' paid · ' + c.partial + ' partial · ' + c.unpaid + ' unpaid</p>' +
      '<p>' + money(c.paid) + ' received of ' + money(c.target) + '</p></div></section>';
    return html.replace('<div class="d4-payment-counts">', ring + '<div class="d4-payment-counts">')
      .replace('✈️ Enter Trip →', 'Continue →')
      .replace('<button class="cc-open-members"',
        '<button type="button" class="cc-skip" data-action="enter-selected-trip">Skip →</button><button class="cc-open-members"');
  };
  bottomNav = function () {
    const t = current();
    if (!t || view === 'entry') return '';
    const items = [
      {icon:'🧾',label:'Expenses',action:'nav',name:'expenses',attr:'data-view="expenses"',active:view==='expenses'||(view==='trip'&&tripTab==='expenses')},
      {icon:'🗓️',label:'Trip Days',action:'open-tab',name:'plan',attr:'data-ctx="plan"',active:view==='trip'&&tripTab==='plan'},
      {icon:'⚙️',label:'Settings',action:'nav',name:'profile',attr:'data-view="profile"',active:view==='profile'},
      {icon:'💬',label:'Chats',action:'nav',name:'chat',attr:'data-view="chat"',active:view==='chat'}
    ];
    return '<nav class="d4p-bottom" aria-label="Trip sections">' +
      items.map(i => '<button type="button" data-action="' + i.action + '" ' + i.attr +
        ' class="' + (i.active ? 'active' : '') + '" aria-label="' + i.label +
        '" aria-current="' + (i.active ? 'page' : 'false') + '"><span aria-hidden="true">' +
        i.icon + '</span>' + i.label + '</button>').join('') + '</nav>';
  };
  tripOverview = function (t) {
    const c = collectionTotals(t);
    const days = datesInTrip(t).length;
    return '<section class="d4p-section" aria-label="Trip dashboard">' +
      '<div class="d4p-hero"><small>✦ D4 TRIP · YOUR JOURNEY</small><h2>' +
      safe(t.destination) + '</h2><p>' + safe(t.name) + ' · ' +
      shortDate(t.start) + ' – ' + shortDate(t.end) + '</p></div>' +
      '<div class="d4p-stats"><div class="d4p-stat"><small>Members</small><strong>' +
      t.members.length + '</strong></div><div class="d4p-stat"><small>Trip Days</small><strong>' +
      days + '</strong></div><div class="d4p-stat"><small>Remaining</small><strong>' +
      money(c.pending) + '</strong></div></div>' +
      '<h3 class="d4p-title">Your Trip</h3><div class="d4p-grid">' +
      button('💳','Payment Scoreboard','nav','data-view="collections"') +
      button('👥','Members','open-tab','data-ctx="members"') +
      button('📅','Trip Days','open-tab','data-ctx="plan"') +
      button('🧾','Expenses','open-tab','data-ctx="expenses"') +
      '</div>' + tileRow(t) + '</section>';
  };
  tripPage = function () {
    const t = current();
    if (!t) return original.tripPage();
    if (tripTab === 'overview') return tripOverview(t);
    if (tripTab === 'plan') return '<section class="d4p-section">' + tripPlan(t) + '</section>';
    if (tripTab === 'expenses') return '<section class="d4p-section">' + tripExpenses(t) + '</section>';
    if (tripTab === 'members') return '<section class="d4p-section">' + tripMembers(t) + '</section>';
    if (tripTab === 'collections') return collectionsPage();
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
    const t = current();
    const account = window.D4TripCloud?.user;
    const label = isMain() ? 'Main Admin' : (t && isTripAdmin(t) ? 'Trip Admin' : 'Member');
    const email = account?.email ? safe(account.email) : 'Sign in to manage your cloud account';
    const modeButtons = modes.map(function (name) {
      const title = name === 'midnight' ? '🌙 Midnight' : name === 'light' ? '☀️ Light' : '🌅 Sunset';
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
    return '<section class="d4p-section"><div class="d4p-hero"><small>⚙️ PROFILE & SETTINGS</small>' +
      '<h2>' + safe(label) + '</h2><p>' + email + '</p></div>' +
      (tileRow(t) || '<p class="d4p-caption">Your trip spending and trip days are available in view-only mode.</p>') +
      '<h3 class="d4p-title">Appearance</h3><div class="card"><p class="d4p-caption">Theme selection</p>' +
      '<div class="d4p-theme-grid">' + modeButtons + '</div></div>' +
      '<h3 class="d4p-title">Account & Notifications</h3><div class="card"><div class="row">' +
      cloudPassword +
      '<button type="button" class="btn small ghost" data-action="request-notify">🔔 Notifications</button>' +
      '</div><p class="d4p-caption">Password changes use Firebase email verification. Logout, sign-in, and Forgot Password remain in the secure Firebase account panel below.</p></div>' +
      danger + '<h3 class="d4p-title">Firebase Account & Backup</h3>' + original.profilePage() + '</section>';
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
