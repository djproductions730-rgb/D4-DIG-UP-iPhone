/* Five-second launch sequence. All state is local to this browser tab. */
(() => {
  'use strict';
  const root = document.getElementById('d4Intro');
  if (!root) return;
  const sessionKey = 'd4_trip_logo_reveal_seen_v2';
  const duration = 5000;
  const fade = 350;
  let timers = [];
  let previousFocus;
  let inertElements = [];

  function close() {
    if (root.hidden) return;
    timers.forEach(clearTimeout);
    timers = [];
    root.hidden = true;
    root.classList.remove('playing', 'd4-cinema--closing');
    document.body.classList.remove('d4-intro-playing');
    inertElements.forEach(element => { element.inert = false; });
    inertElements = [];
    const target = previousFocus?.isConnected && previousFocus !== document.body
      ? previousFocus
      : document.querySelector('#app button');
    target?.focus({ preventScroll: true });
  }

  function play({ force = false } = {}) {
    if (!root.hidden) return false;
    try {
      if (!force && sessionStorage.getItem(sessionKey)) return false;
      sessionStorage.setItem(sessionKey, '1');
    } catch (_) { /* Storage can be unavailable in private browsing. */ }
    previousFocus = document.activeElement;
    inertElements = ['app', 'modalRoot'].map(id => document.getElementById(id))
      .filter(element => element && !element.inert);
    inertElements.forEach(element => { element.inert = true; });
    root.hidden = false;
    document.body.classList.add('d4-intro-playing');
    void root.offsetHeight;
    root.classList.add('playing');
    root.focus({ preventScroll: true });
    timers = [
      setTimeout(() => root.classList.add('d4-cinema--closing'), duration - fade),
      setTimeout(close, duration)
    ];
    return true;
  }

  root.addEventListener('keydown', event => {
    if (event.key === 'Tab') event.preventDefault();
  });
  window.D4TripIntro = { play, close, get active() { return !root.hidden; } };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => play(), { once: true });
  } else {
    play();
  }
})();
