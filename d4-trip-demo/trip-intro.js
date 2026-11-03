/* D4 Trip cinematic introduction. Independent of trip data and authentication. */
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
  #trip-intro{position:fixed;inset:0;z-index:10000;background:radial-gradient(ellipse at 50% 38%,#136b71 0%,#073b49 43%,#031c2b 85%);color:#fff;overflow:hidden;font-family:Outfit,system-ui,sans-serif;display:grid;place-items:center;transition:opacity .7s;isolation:isolate}
  #trip-intro *{box-sizing:border-box}#trip-intro.leaving{opacity:0;pointer-events:none}
  .ti-frame{position:relative;width:min(100%,580px);height:min(780px,100dvh);overflow:hidden}
  .ti-eyebrow{position:absolute;top:calc(35px + env(safe-area-inset-top));width:100%;text-align:center;font-size:10px;font-weight:800;letter-spacing:5px;color:#9cd9da}
  .ti-orbit{position:absolute;width:420px;height:420px;left:50%;top:44%;border:1px solid #9be6df20;border-radius:50%;transform:translate(-50%,-50%)}.ti-orbit:before,.ti-orbit:after{content:'';position:absolute;inset:35px;border:1px dashed #9be6df20;border-radius:50%}.ti-orbit:after{inset:-42px;border-style:solid}
  .ti-stars{position:absolute;inset:0;background-image:radial-gradient(circle,#aaffdf 1px,transparent 1.5px);background-size:79px 101px;opacity:.22;mask-image:linear-gradient(transparent,#000,transparent)}
  .ti-lineup{position:absolute;top:43%;left:50%;width:310px;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;gap:14px}
  .ti-d4{font-size:80px;font-weight:900;letter-spacing:-7px;color:#d2fff4;text-shadow:0 8px 35px #53dfce40}
  .ti-wordbox{width:178px;position:relative;height:92px;display:grid;align-items:center}
  .ti-diet{position:absolute;font-size:37px;color:#ffb074;font-weight:900;animation:ti-diet 2s both}
  .ti-dig{position:absolute;font-size:33px;white-space:nowrap;color:#ffca83;font-weight:900;transform-origin:bottom;animation:ti-press 6s both}
  .ti-trip{position:absolute;left:0;top:14px;font-size:57px;letter-spacing:-2px;color:#ffb65c;font-weight:900;opacity:0;animation:ti-trip 6s both}
  .ti-logo-scene{position:absolute;inset:0;animation:ti-logo-out 8s both}
  .ti-cargo{position:absolute;width:205px;height:205px;left:calc(50% - 48px);top:calc(43% - 225px);animation:ti-cargo 6s both;opacity:0}
  .ti-cargo svg{width:155px;display:block;overflow:visible;filter:drop-shadow(0 12px 12px #001c2c55)}
  .ti-rotor{transform-origin:75px 22px;animation:ti-rotor .13s linear infinite}
  .ti-rope{position:absolute;width:70px;height:75px;left:43px;top:74px;border-left:2px solid #b7f4ed;border-right:2px solid #b7f4ed;animation:ti-release 6s both}
  .ti-package{position:absolute;left:18px;top:145px;background:linear-gradient(140deg,#ffcf83,#ff9a3d);border-radius:14px;color:#153e47;padding:8px 22px;font-weight:900;font-size:36px;box-shadow:0 12px 30px #001c2c55;animation:ti-release 6s both}
  .ti-caption{position:absolute;top:59%;width:100%;text-align:center;color:#9fd9db;font-size:13px;letter-spacing:1px;animation:ti-caption 8s both}
  .ti-world{position:absolute;inset:0;opacity:0;animation:ti-world 19.5s both}
  .ti-map{position:absolute;left:8%;top:25%;width:84%;height:42%;border:1px solid #82d8d632;border-radius:50%;background:radial-gradient(ellipse,#137c7955,transparent 70%);overflow:hidden;box-shadow:inset 0 0 65px #48c5c512}
  .ti-map svg{width:100%;height:100%}.ti-land{fill:#3a9d8e;stroke:#84d6bc;stroke-width:.7}.ti-grid{fill:none;stroke:#9ce8df;stroke-width:.5;opacity:.18}
  .ti-route{stroke:#ffc37c;stroke-width:1;fill:none;stroke-dasharray:4 5;animation:ti-route 3s linear infinite}
  .ti-pin{position:absolute;width:13px;height:13px;border:3px solid #fff2c6;background:#ffad58;border-radius:50%;box-shadow:0 0 0 8px #ffc47e20;transition:left .7s,top .7s;left:69%;top:57%;animation:ti-pulse 1.4s ease-in-out infinite}
  .ti-pin-label{position:absolute;left:50%;top:70%;transform:translateX(-50%);font-size:23px;font-weight:800;color:#ffe1ad;white-space:nowrap}
  .ti-search{position:absolute;top:17%;left:14%;width:72%;height:52px;border:1px solid #a6e8dc70;border-radius:18px;background:#0c3849d9;display:flex;align-items:center;padding:0 18px;gap:12px;color:#fff;box-shadow:0 10px 30px #001a2c44;font:500 17px system-ui}.ti-search svg{width:20px;height:20px;flex:none}.ti-cursor{height:20px;width:2px;background:#ffbe6a;animation:ti-blink .8s infinite}
  .ti-finding{position:absolute;top:12%;text-align:center;width:100%;font-size:10px;letter-spacing:4px;color:#a6dcd8}
  .ti-plane{position:absolute;top:26%;left:-20%;font-size:43px;animation:ti-plane 5.7s 6.6s linear infinite;filter:drop-shadow(0 8px 10px #0005)}
  .ti-train{position:absolute;bottom:21%;width:145px;left:-35%;animation:ti-train 6s 6.6s linear infinite}.ti-train svg{width:100%}
  .ti-boat{position:absolute;right:10%;top:58%;width:67px;animation:ti-bob 2s ease-in-out infinite}.ti-boat svg{width:100%}
  .ti-landmarks{position:absolute;bottom:14%;width:100%;display:flex;justify-content:center;align-items:end;gap:25px;color:#ffd092}.ti-landmarks svg{width:62px;height:85px;overflow:visible}.ti-tower{animation:ti-sway 3.2s ease-in-out infinite}.ti-circus{animation:ti-bob 2.5s ease-in-out infinite}.ti-jumper{animation:ti-jump 1.4s ease-in-out infinite;transform-origin:30px 30px}
  .ti-final{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse,#0a535ee8,#032333f5);opacity:0;pointer-events:none;animation:ti-final 19.5s both}.ti-final-icon{font-size:58px;margin-bottom:20px}.ti-final h1{font-size:clamp(44px,12vw,68px);letter-spacing:-2.5px;margin:0;color:#fff}.ti-final h1 span{color:#ffc17c}.ti-final p{font-size:11px;letter-spacing:3px;color:#b5e3df;margin-top:18px}
  .ti-skip{position:absolute;right:20px;top:calc(19px + env(safe-area-inset-top));min-height:44px;min-width:60px;border:1px solid #b7eddf44;background:#ffffff0c;color:#d4f9ee;border-radius:22px;font:600 12px system-ui;cursor:pointer}.ti-skip:focus-visible,#ti-replay:focus-visible{outline:3px solid #ffc17c;outline-offset:3px}
  .ti-progress{position:absolute;bottom:calc(32px + env(safe-area-inset-bottom));left:20%;width:60%;height:2px;background:#ffffff20;overflow:hidden}.ti-progress:after{content:'';display:block;height:100%;background:#ffc17c;transform-origin:left;animation:ti-progress 19.5s linear both}
  #ti-replay{position:fixed;right:14px;bottom:calc(87px + env(safe-area-inset-bottom));z-index:21;min-height:44px;padding:8px 12px;border-radius:30px;border:1px solid #a9e4d65c;background:#063d48;color:#d0fff3;font:700 11px system-ui;box-shadow:0 4px 15px #001b2e55;cursor:pointer}
  @keyframes ti-diet{0%,65%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-22px)}}
  @keyframes ti-press{0%,30%{opacity:0;transform:translateY(16px)}38%,76%{opacity:1;transform:scaleY(1)}85%,100%{opacity:0;transform:translateY(25px) scaleY(.05)}}
  @keyframes ti-trip{0%,81%{opacity:0;transform:translateY(-15px)}86%{opacity:1;transform:translateY(8px) scaleY(.8)}94%,100%{opacity:1;transform:translateY(0) scaleY(1)}}
  @keyframes ti-cargo{0%,30%{opacity:0;transform:translate(250px,-140px) rotate(-8deg)}40%{opacity:1}62%{opacity:1;transform:translate(0,0) rotate(0)}81%,86%{opacity:1;transform:translate(0,75px)}100%{opacity:0;transform:translate(-300px,-220px) rotate(-12deg)}}
  @keyframes ti-release{0%,80%{opacity:1}83%,100%{opacity:0}}
  @keyframes ti-rotor{to{transform:scaleX(-1)}}@keyframes ti-logo-out{0%,86%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}
  @keyframes ti-caption{0%,90%{opacity:1}100%{opacity:0}}
  @keyframes ti-world{0%,35%{opacity:0;transform:scale(.85)}42%,86%{opacity:1;transform:scale(1)}96%,100%{opacity:0;transform:scale(1.1)}}
  @keyframes ti-final{0%,83%{opacity:0;transform:scale(.94)}96%,100%{opacity:1;transform:scale(1)}}
  @keyframes ti-plane{0%{left:-20%;transform:translateY(30px) rotate(-15deg)}100%{left:120%;transform:translateY(-55px) rotate(-15deg)}}
  @keyframes ti-train{to{left:120%}}@keyframes ti-bob{50%{transform:translateY(-7px) rotate(3deg)}}@keyframes ti-sway{50%{transform:rotate(3deg)}}@keyframes ti-jump{50%{transform:translateY(-30px) rotate(12deg)}}@keyframes ti-route{to{stroke-dashoffset:-45}}@keyframes ti-pulse{50%{box-shadow:0 0 0 14px #ffc47e08}}@keyframes ti-blink{50%{opacity:0}}@keyframes ti-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @media(prefers-reduced-motion:reduce){#trip-intro *{animation:none!important;transition:none!important}.ti-logo-scene,.ti-world{display:none}.ti-final{opacity:1}.ti-progress{display:none}}
  @media(max-height:590px){.ti-eyebrow{top:16px}.ti-landmarks{bottom:10%}.ti-landmarks svg{height:55px}.ti-d4{font-size:60px}.ti-caption{top:66%}.ti-progress{bottom:15px}}
  @media print{#trip-intro,#ti-replay{display:none!important}}
  `;
  document.head.append(style);
  const svg = (body, view = '0 0 120 90') => `<svg viewBox="${view}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const helicopter = svg(`<path d="M27 48H10L4 30h8l19 12" fill="#ffb164"/><ellipse cx="78" cy="52" rx="41" ry="23" fill="#ffba68"/><path d="M83 32q28 3 32 21H83Z" fill="#c6fff1"/><path d="M48 72v10m48-10v10M35 83h72M75 30V20" fill="none" stroke="#d6fff6" stroke-width="4" stroke-linecap="round"/><g class="ti-rotor"><path d="M10 20h133" stroke="#d6fff6" stroke-width="5" stroke-linecap="round"/></g>`, '0 0 155 95');
  const train = svg(`<path d="M5 29h87q17 0 22 23v20H5Z" fill="#ffbd70"/><path d="M75 37h19l10 17H75Z" fill="#174c59"/><path d="M12 37h17v16H12Zm27 0h17v16H39Z" fill="#174c59"/><path d="M5 60h106" stroke="#fff3cd" stroke-width="4"/><g fill="#123c4d" stroke="#99dfd6" stroke-width="3"><circle cx="24" cy="73" r="8"/><circle cx="87" cy="73" r="8"/></g><path d="M0 86h120" stroke="#8dc5c1" stroke-width="2"/>`);
  const boat = svg(`<path d="M6 60h105L95 80H26Z" fill="#ffbd70"/><path d="M56 7v52H15Zm5 8 39 41H61Z" fill="#caf5e8"/><path d="M2 87q15-8 30 0t30 0 30 0 30 0" fill="none" stroke="#6fe1db" stroke-width="3"/>`);
  const tower = svg(`<g fill="none" stroke="#efc18a" stroke-width="3"><path d="M30 3 24 38 18 60 4 83h12l8-22h12l8 22h12L42 60 36 38 30 3ZM20 53h20M16 64h28M22 40h16M24 27h12M19 60l20-20M22 40l20 20"/></g>`, '0 0 60 90');
  const circus = svg(`<path d="M5 43 35 17l30 26v36H5Z" fill="#ffb269"/><path d="m35 17-10 26v36H13V43Zm0 0 10 26v36h12V43Z" fill="#e67772"/><path d="M29 79V59a6 6 0 0 1 12 0v20" fill="#114954"/><path d="M35 17V3l17 5-17 5" stroke="#ffe6b8" stroke-width="2" fill="#ffe6b8"/>`, '0 0 70 90');
  const trampoline = svg(`<ellipse cx="32" cy="69" rx="27" ry="8" fill="#0d3445" stroke="#89e3d5" stroke-width="3"/><path d="m9 72-4 14m50-14 4 14" stroke="#ffbd70" stroke-width="3"/><g class="ti-jumper" stroke="#ffd395" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="31" r="5" fill="#ffbd70"/><path d="M32 38v15m0-9-13-6m13 6 12-9M32 53l-10 9m10-9 11 8" fill="none"/></g>`, '0 0 65 90');
  let panel, timeout, tick, previousFocus, restored = [], lockedBody;
  function close() {
    if (!panel || panel.classList.contains('leaving')) return;
    clearTimeout(timeout); clearInterval(tick);
    const closing = panel;
    closing.classList.add('leaving');
    restored.forEach(([el, inert]) => { el.inert = inert; }); restored = [];
    document.body.style.overflow = lockedBody;
    (previousFocus?.isConnected ? previousFocus : document.getElementById('ti-replay'))?.focus({preventScroll:true});
    panel = null;
    setTimeout(() => closing.remove(), 750);
  }
  function play() {
    if (panel) return;
    previousFocus = document.activeElement;
    lockedBody = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel = document.createElement('section');
    panel.id = 'trip-intro'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label','D4 Trip travel introduction');
    panel.innerHTML = `<div class="ti-frame"><div class="ti-stars"></div><div class="ti-orbit"></div><div class="ti-eyebrow">THE D4 UNIVERSE</div><div class="ti-logo-scene" aria-hidden="true"><div class="ti-lineup"><span class="ti-d4">D4</span><div class="ti-wordbox"><span class="ti-diet">Diet</span><span class="ti-dig">Dig Up</span><span class="ti-trip">Trip</span></div></div><div class="ti-cargo">${helicopter}<div class="ti-rope"></div><div class="ti-package">Trip</div></div><p class="ti-caption">A new adventure is landing.</p></div><div class="ti-world" aria-hidden="true"><div class="ti-finding">FINDING YOUR NEXT ADVENTURE</div><div class="ti-search">${svg('<circle cx="11" cy="11" r="7" fill="none" stroke="#c9f9ed" stroke-width="2"/><path d="m16 16 6 6" stroke="#c9f9ed" stroke-width="2"/>','0 0 24 24')}<span id="ti-query">Goa</span><i class="ti-cursor"></i></div><div class="ti-map">${svg(`<g class="ti-grid"><path d="M0 80h360M0 120h360M0 160h360M0 200h360M0 240h360M90 0v280M180 0v280M270 0v280"/><ellipse cx="180" cy="140" rx="85" ry="135"/><ellipse cx="180" cy="140" rx="150" ry="135"/></g><g class="ti-land"><path d="m35 70 35-19 40 13 10 26-24 14-10 29-25-12-9-28-22-7Z"/><path d="m96 141 28 10 12 36-15 43-15-17-5-38-15-18Z"/><path d="m166 79 30-19 21 13-4 22-27 6-9 20-24-12Z"/><path d="m177 116 34-9 27 23-13 47-20 27-19-32-10-29Z"/><path d="m215 70 51-15 54 26 11 35-33 10-19-16-13 24-16-5-6 24-17-27-9-23-16-8Z"/><path d="m275 195 30-14 27 15-9 22-34 3Z"/></g><path class="ti-route" d="M84 92Q170 10 249 151Q270 210 254 172"/>`, '0 0 360 280')}<span class="ti-pin" id="ti-pin"></span></div><span class="ti-pin-label" id="ti-place">Goa</span><span class="ti-plane">✈️</span><div class="ti-train">${train}</div><div class="ti-boat">${boat}</div><div class="ti-landmarks"><div class="ti-tower">${tower}</div><div class="ti-circus">${circus}</div><div>${trampoline}</div></div></div><div class="ti-final"><div class="ti-final-icon" aria-hidden="true">🌍</div><h1>Dig <span>4</span> Trip</h1><p>FIND · PLAN · GO TOGETHER</p></div><div class="ti-progress" aria-hidden="true"></div></div><button type="button" class="ti-skip">Skip intro</button>`;
    document.body.append(panel);
    [...document.body.children].filter(el => el !== panel && el instanceof HTMLElement && !['SCRIPT','STYLE'].includes(el.tagName)).forEach(el => {restored.push([el,el.inert]);el.inert = true;});
    const skip = panel.querySelector('.ti-skip'); skip.addEventListener('click',close); skip.focus({preventScroll:true});
    panel.addEventListener('keydown', e => { if(e.key === 'Escape') close(); if(e.key === 'Tab') {e.preventDefault();skip.focus();} });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const destinations = [['Goa',69,55],['Kerala',70,59],['New York',24,34],['Munnar',71,58],['Hyderabad',71,52]];
    if (!reduced) tick = setInterval(() => {
      if (!panel) return;
      const elapsed = performance.now() - start - 8000;
      if (elapsed < 0) return;
      const index = Math.min(4,Math.floor(elapsed/1600));
      const [name,x,y] = destinations[index];
      const length = Math.min(name.length,Math.floor((elapsed%1600)/95)+1);
      panel.querySelector('#ti-query').textContent = name.slice(0,length);
      panel.querySelector('#ti-place').textContent = name;
      const pin = panel.querySelector('#ti-pin');pin.style.left=x+'%';pin.style.top=y+'%';
    },80);
    timeout = setTimeout(close,reduced ? 2200 : 20000);
  }
  // Start after the existing app initializes so its dynamically rendered UI can be made inert.
  function init() {
    const replay = document.createElement('button');replay.id='ti-replay';replay.type='button';replay.textContent='↻ Intro';replay.setAttribute('aria-label','Replay D4 Trip introduction');replay.addEventListener('click',play);document.body.append(replay);play();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
