/* D4 Trip cinematic splash: no dependencies, replayable, skip-friendly and motion aware. */
(() => {
  'use strict';
  const KEY = 'd4_trip_cinema_seen_v1';
  const RUN_MS = 6200;
  const EXIT_MS = 420;
  const root = document.getElementById('d4Intro');
  if (!root) return;
  const skip = root.querySelector('[data-d4-intro-skip]');
  const reduced = () => typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = () => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  };
  const markSeen = () => {
    try { sessionStorage.setItem(KEY, '1'); } catch (_) { /* private browser */ }
  };
  let runTimer = null, exitTimer = null, lastFocus = null, running = false;
  const cancelTimers = () => {
    if (runTimer !== null) clearTimeout(runTimer);
    if (exitTimer !== null) clearTimeout(exitTimer);
    runTimer = null;
    exitTimer = null;
  };
  const finish = () => {
    cancelTimers();
    root.hidden = true;
    root.classList.remove('d4-cinema--closing','playing');
    document.body.classList.remove('d4-intro-playing');
    running = false;
    markSeen();
    const target = lastFocus && lastFocus.isConnected ? lastFocus :
      document.querySelector('#app h1, #app button');
    if (target && typeof target.focus === 'function') {
      if (target.matches('h1')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    lastFocus = null;
  };
  const close = (immediate = false) => {
    if (!running) return;
    if (immediate || reduced()) return finish();
    clearTimeout(runTimer);
    root.classList.add('d4-cinema--closing');
    exitTimer = setTimeout(finish, EXIT_MS);
  };
  const play = ({ force = false } = {}) => {
    if (!force && (saved() || reduced() ||
      new URLSearchParams(location.search).has('noIntro'))) return false;
    cancelTimers();
    lastFocus = document.activeElement;
    running = true;
    root.classList.remove('d4-cinema--closing','playing');
    root.hidden = false;
    document.body.classList.add('d4-intro-playing');
    // Restart CSS keyframes for the Replay action without rebuilding the app.
    void root.offsetHeight;
    root.classList.add('playing');
    if (skip) skip.focus({ preventScroll: true });
    runTimer = setTimeout(() => close(), reduced() ? 0 : RUN_MS);
    return true;
  };
  if (skip) skip.addEventListener('click', () => close(true));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Enter' && event.target === root) {
      event.preventDefault();
      close(true);
    }
  });
  window.D4TripIntro = {
    play, close,
    get active() { return running; }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => play(), { once: true });
  } else {
    play();
  }
})();
