document.body.classList.add('motion-ready');

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Mobile navigation
const menuButton = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');
if (menuButton && menu) {
  menuButton.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    menuButton.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    menuButton.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }));
  menu.querySelectorAll('details').forEach((group) => {
    group.addEventListener('toggle', () => {
      if (!group.open) return;
      menu.querySelectorAll('details').forEach((other) => {
        if (other !== group) other.open = false;
      });
    });
  });
  document.addEventListener('click', (event) => {
    if (menu.contains(event.target)) return;
    menu.querySelectorAll('details[open]').forEach((group) => { group.open = false; });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    menu.querySelectorAll('details[open]').forEach((group) => { group.open = false; });
    if (menu.classList.contains('is-open')) menuButton.click();
  });
}

// The opening veil dissolves the way ink wicks through paper. Blots bloom
// outward in rings from where the visitor pressed; the union of many small
// ones reads as ink creeping, where a single big one would only read as a
// shape being zoomed. The geometry is generated here rather than shipped as
// markup, because 70 KB of path data does not belong in the document.
const INK_BLOTS = [
  { x: 50, y: 53, s: 31, d: 0 },
  { x: 50, y: 31, s: 27, d: 150 }, { x: 69, y: 42, s: 27, d: 205 },
  { x: 69, y: 64, s: 27, d: 260 }, { x: 50, y: 75, s: 27, d: 315 },
  { x: 31, y: 64, s: 27, d: 370 }, { x: 31, y: 42, s: 27, d: 425 },
  { x: 50, y: 10, s: 25, d: 500 }, { x: 76, y: 20, s: 25, d: 545 },
  { x: 93, y: 53, s: 25, d: 590 }, { x: 76, y: 86, s: 25, d: 635 },
  { x: 50, y: 96, s: 25, d: 680 }, { x: 24, y: 86, s: 25, d: 725 },
  { x: 7,  y: 53, s: 25, d: 770 }, { x: 24, y: 20, s: 25, d: 815 },
  { x: 3,  y: 3,  s: 23, d: 860 }, { x: 97, y: 3,  s: 23, d: 885 },
  { x: 3,  y: 97, s: 23, d: 910 }, { x: 97, y: 97, s: 23, d: 935 },
];
// spatter beading ahead of the front
const INK_DROPS = [
  { x: 18, y: 26, s: 7, d: 380 }, { x: 84, y: 22, s: 6, d: 440 },
  { x: 14, y: 78, s: 7, d: 500 }, { x: 88, y: 74, s: 6, d: 560 },
  { x: 58, y: 91, s: 5, d: 620 },
];

const buildInkVeil = (() => {
  let built = false;
  return (veil) => {
    if (built || !veil) return;
    built = true;

    let seed = 20260825;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const between = (lo, hi) => lo + rnd() * (hi - lo);

    // A closed outline: gentle low-frequency lobes with broad soft fibres.
    // Sampled densely, so no feature collapses into a spike when it is scaled up.
    const outline = ({ pts, drop }) => {
      const amp = drop ? [.14, .08, .04] : [.115, .07, .036, .018];
      const waves = amp.map((a, i) => ({
        a,
        f: Math.round(between(2 + i * 4, 5 + i * 8)),
        p: between(0, Math.PI * 2),
      }));
      const fibres = Array.from({ length: drop ? 3 : 5 }, () => ({
        t: between(0, Math.PI * 2),
        w: between(.09, .2),
        h: between(.09, .23),
      }));
      const squash = between(.88, 1.13);

      const points = [];
      for (let i = 0; i < pts; i += 1) {
        const th = (i / pts) * Math.PI * 2;
        let r = 1;
        for (const w of waves) r += w.a * Math.sin(w.f * th + w.p);
        for (const f of fibres) {
          let delta = th - f.t;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          r += f.h * Math.exp(-((delta / f.w) ** 2));
        }
        r = Math.max(r, .55) * 100;
        points.push([Math.cos(th) * r * squash, Math.sin(th) * r / squash]);
      }

      // Catmull-Rom through the samples, emitted as cubic beziers
      const n = points.length;
      const at = (i) => points[(i % n + n) % n];
      const round = (v) => Math.round(v * 10) / 10;
      let d = `M${round(points[0][0])} ${round(points[0][1])}`;
      for (let i = 0; i < n; i += 1) {
        const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
        d += `C${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(p1[1] + (p2[1] - p0[1]) / 6)}`
          + ` ${round(p2[0] - (p3[0] - p1[0]) / 6)} ${round(p2[1] - (p3[1] - p1[1]) / 6)}`
          + ` ${round(p2[0])} ${round(p2[1])}`;
      }
      return `${d}Z`;
    };

    const specs = [
      ...INK_BLOTS.map((b, i) => ({ ...b, r0: i % 2 ? -7 : 6, r1: i % 2 ? 5 : -4, pts: 72, drop: false })),
      ...INK_DROPS.map((b) => ({ ...b, r0: 0, r1: 11, pts: 48, drop: true })),
    ];

    const shapes = document.createDocumentFragment();
    specs.forEach((spec) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', outline(spec));
      path.setAttribute('class', spec.drop ? 'ink-blot ink-blot-drop' : 'ink-blot');
      path.style.cssText = `--x:${spec.x}px;--y:${spec.y}px;--s:${spec.s};`
        + `--r0:${spec.r0}deg;--r1:${spec.r1}deg;--d:${spec.d}ms`;
      shapes.append(path);
    });

    // filled copies punch the hole; stroked copies trace the wet edge
    veil.querySelectorAll('[data-ink-front]').forEach((g) => g.append(shapes.cloneNode(true)));
    // only the stroked copy needs a constant on-screen stroke width; on the
    // filled copy it rebuilt a stroke geometry that is never painted
    veil.querySelectorAll('[data-ink-edge]').forEach((g) => {
      const copy = shapes.cloneNode(true);
      copy.querySelectorAll('path').forEach((p) => p.setAttribute('vector-effect', 'non-scaling-stroke'));
      g.append(copy);
    });
  };
})();

// Gold motes catching the light along the wet edge as it travels
const scatterInkSparkles = (layer, origin) => {
  if (!layer) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  const start = performance.now();
  const DURATION = 2600;
  let lastMote = 0;
  const tick = (now) => {
    const t = (now - start) / DURATION;
    if (t >= 1) return;
    if (now - lastMote < 70) { window.requestAnimationFrame(tick); return; }
    lastMote = now;
    // matches the blots' ease-out, so motes ride the visible front
    const eased = 1 - Math.pow(1 - t, 2.6);
    const reach = Math.hypot(window.innerWidth, window.innerHeight) * .58 * eased;
    const count = t < .16 ? 3 : 2;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = reach * (.82 + Math.random() * .3);
      const mote = document.createElement('span');
      const isStar = Math.random() > .58;
      mote.className = `ink-mote${isStar ? ' is-star' : ''}`;
      if (isStar) mote.textContent = Math.random() > .5 ? '✦' : '⋆';
      mote.style.left = `${origin.x + Math.cos(angle) * radius}px`;
      mote.style.top = `${origin.y + Math.sin(angle) * radius}px`;
      mote.style.setProperty('--drift', `${(Math.random() - .5) * 34}px`);
      mote.style.setProperty('--rise', `${-18 - Math.random() * 30}px`);
      mote.style.setProperty('--scale', (.55 + Math.random() * .85).toFixed(2));
      layer.append(mote);
      mote.addEventListener('animationend', () => mote.remove(), { once: true });
      window.setTimeout(() => mote.remove(), 1400);
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
};

// Curtain opening. Browsers require a click before sound can begin.
const opening = document.querySelector('[data-opening]');
if (opening) {
  const openButton = opening.querySelector('[data-curtain-open]');
  const skipButton = opening.querySelector('[data-curtain-skip]');
  const openingAudio = opening.querySelector('[data-opening-audio]');
  const stopButton = document.querySelector('[data-opening-stop]');
  const hasSeenOpening = sessionStorage.getItem('dey-opening-seen') === 'yes';
  const inkVeil = opening.querySelector('.ink-veil');
  const sparkleLayer = opening.querySelector('[data-ink-sparkles]');
  const reducedMotionOpening = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealDuration = reducedMotionOpening ? 20 : 3600;

  const stopOpeningAudio = () => {
    if (openingAudio) {
      openingAudio.pause();
      openingAudio.currentTime = 0;
    }
    if (stopButton) stopButton.hidden = true;
  };

  const playOpeningAudio = async () => {
    if (!openingAudio) return;
    try {
      await openingAudio.play();
      if (stopButton) stopButton.hidden = false;
    } catch {
      const fallback = openingAudio.dataset.fallback;
      if (!fallback) return;
      openingAudio.src = fallback;
      try {
        await openingAudio.play();
        if (stopButton) stopButton.hidden = false;
      } catch {}
    }
  };

  const openCurtain = (withSound, source) => {
    if (opening.classList.contains('is-open')) return;
    sessionStorage.setItem('dey-opening-seen', 'yes');
    if (withSound) playOpeningAudio();
    else stopOpeningAudio();

    // Measure before building: a read that precedes the write is free, and
    // the motes need to know where the visitor pressed.
    const spot = source?.getBoundingClientRect();
    const origin = spot
      ? { x: spot.left + spot.width / 2, y: spot.top + spot.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight * .53 };
    buildInkVeil(inkVeil);
    scatterInkSparkles(sparkleLayer, origin);

    opening.classList.add('is-open');
    window.setTimeout(() => {
      opening.classList.add('is-gone');
      document.body.classList.remove('has-opening');
      document.dispatchEvent(new CustomEvent('dey:opening-done'));
    }, revealDuration);
  };

  stopButton?.addEventListener('click', stopOpeningAudio);
  openingAudio?.addEventListener('ended', () => {
    if (stopButton) stopButton.hidden = true;
  });

  if (hasSeenOpening) {
    opening.classList.add('is-open', 'is-gone');
    document.body.classList.remove('has-opening');
  } else {
    document.body.style.overflow = 'hidden';
    const releaseScroll = () => { document.body.style.overflow = ''; };
    openButton?.addEventListener('click', () => { openCurtain(true, openButton); releaseScroll(); });
    skipButton?.addEventListener('click', () => { openCurtain(false, skipButton); releaseScroll(); });
    // Build one frame after the opening has painted: early enough that no
    // human can beat it, late enough not to delay first paint.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => buildInkVeil(inkVeil)));
  }
}

// Custom audio players
const players = [...document.querySelectorAll('[data-audio-player]')];
const stopOtherPlayers = (current) => {
  players.forEach((player) => {
    if (player === current) return;
    const audio = player.querySelector('audio');
    audio?.pause();
    player.classList.remove('is-playing');
  });
};

players.forEach((player) => {
  const audio = player.querySelector('audio');
  const toggle = player.querySelector('.audio-toggle');
  const track = player.querySelector('.audio-track');
  const progress = track?.querySelector('i');
  const time = player.querySelector('[data-time]');
  if (!audio || !toggle) return;

  // With preload="none" the duration is unknown until playback starts, so fall
  // back to the length printed in the markup rather than flashing 00:00.
  const printedTotal = time ? time.textContent.trim() : '';
  const update = () => {
    const known = Number.isFinite(audio.duration) && audio.duration > 0;
    const ratio = known ? audio.currentTime / audio.duration : 0;
    // scaleX composites; width relayouts the bar on every timeupdate tick
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (time) time.textContent = `${formatTime(audio.currentTime)} / ${known ? formatTime(audio.duration) : printedTotal}`;
  };

  toggle.addEventListener('click', async () => {
    stopOtherPlayers(player);
    if (audio.paused) {
      try {
        await audio.play();
        player.classList.add('is-playing');
        toggle.setAttribute('aria-label', 'Pause audio');
      } catch {
        player.classList.remove('is-playing');
      }
    } else {
      audio.pause();
      player.classList.remove('is-playing');
      toggle.setAttribute('aria-label', 'Play audio');
    }
  });

  track?.addEventListener('click', (event) => {
    if (!audio.duration) return;
    const rect = track.getBoundingClientRect();
    audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
  });
  audio.addEventListener('loadedmetadata', update);
  audio.addEventListener('timeupdate', update);
  audio.addEventListener('ended', () => {
    player.classList.remove('is-playing');
    toggle.setAttribute('aria-label', 'Play audio');
  });
});

// Gentle entrance animation
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add('is-visible'));
}

// The guide fairy. She flies a slow round of the things worth clicking,
// hovering over each long enough to be noticed, and breaks off to follow the
// pointer whenever the visitor moves. Motion and pointer-precision gated:
// no fairy on touch screens or for visitors who asked for less movement.
// A slighter, lighter sprite: narrow body, short petal-hemmed dress, a top knot,
// and wings large against the frame. Built in JS so every page gets her from one
// source, and only when she is going to be used.
const FAIRY_SVG = `
<svg class="fairy" viewBox="0 0 64 64" width="56" height="56">
  <defs>
    <radialGradient id="fairy-aura">
      <stop offset="0%" stop-color="rgba(255,241,196,.55)"/>
      <stop offset="34%" stop-color="rgba(255,212,128,.17)"/>
      <stop offset="62%" stop-color="rgba(255,214,130,.09)"/>
      <stop offset="100%" stop-color="rgba(255,198,104,0)"/>
    </radialGradient>
    <linearGradient id="fairy-wing" x1=".1" y1="1" x2=".9" y2="0">
      <stop offset="0%" stop-color="rgba(255,253,242,.72)"/>
      <stop offset="42%" stop-color="rgba(236,220,255,.42)"/>
      <stop offset="100%" stop-color="rgba(196,182,255,.1)"/>
    </linearGradient>
    <linearGradient id="fairy-body" x1="0" y1="0" x2=".35" y2="1">
      <stop offset="0%" stop-color="#fffdf2"/>
      <stop offset="48%" stop-color="#f9e3b2"/>
      <stop offset="100%" stop-color="#e0b46c"/>
    </linearGradient>
  </defs>

  <circle class="fairy-aura" cx="32" cy="30" r="31" fill="url(#fairy-aura)"/>

  <g class="fairy-wings fairy-wings-upper">
    <path d="M30.9 24.4C27 20.3 20.6 14.6 14.6 12.1C11.2 16.7 13.6 24.4 20 28.1C24 30.3 28.2 29.6 30.9 26.9Z"/>
    <path d="M33.1 24.4C37 20.3 43.4 14.6 49.4 12.1C52.8 16.7 50.4 24.4 44 28.1C40 30.3 35.8 29.6 33.1 26.9Z"/>
    <path class="fairy-vein" d="M29.7 25.9C26.7 22.5 22.9 18.2 17.9 14.9"/>
    <path class="fairy-vein" d="M34.3 25.9C37.3 22.5 41.1 18.2 46.1 14.9"/>
  </g>
  <g class="fairy-wings fairy-wings-lower">
    <path d="M31 28.2C27.8 27.6 22.6 29.1 19.8 34C21.6 39.3 27.4 41 31.5 37.6C32.6 36.3 31.9 31.4 31 28.2Z"/>
    <path d="M33 28.2C36.2 27.6 41.4 29.1 44.2 34C42.4 39.3 36.6 41 32.5 37.6C31.4 36.3 32.1 31.4 33 28.2Z"/>
    <path class="fairy-vein" d="M30.2 30C27.3 30.3 24.3 31.8 22.3 34.1"/>
    <path class="fairy-vein" d="M33.8 30C36.7 30.3 39.7 31.8 41.7 34.1"/>
  </g>

  <g class="fairy-figure">
    <path class="fairy-leg" d="M30.9 38.4C30.6 41.6 30.3 44.6 29.8 47.6"/>
    <path class="fairy-leg" d="M33.1 38.4C33.4 41.4 33.7 44.2 34.2 47.2"/>
    <ellipse class="fairy-foot" cx="29.5" cy="48.3" rx=".75" ry="1.1" transform="rotate(-12 29.5 48.3)"/>
    <ellipse class="fairy-foot" cx="34.5" cy="47.9" rx=".75" ry="1.1" transform="rotate(10 34.5 47.9)"/>

    <path class="fairy-arm" d="M34 22.4C36 21.9 37.6 20.8 38.7 19.2"/>
    <path class="fairy-arm" d="M30 22.6C28.5 23.5 27.4 24.9 26.8 26.6"/>
    <circle class="fairy-hand" cx="39.1" cy="18.7" r=".9"/>
    <circle class="fairy-hand" cx="26.6" cy="27.1" r=".9"/>

    <path class="fairy-gown" d="M30 21.3C31.3 20.7 32.7 20.7 34 21.3C35.3 22.2 35.8 23.8 35.5 25.8C35.3 27.3 35 28.6 34.9 30C34.8 32 35.3 34 36 36C36.3 36.9 36.6 37.6 36.8 38.4C35.6 37.9 34.7 37.7 34 37.9C33.5 38.7 33 39.4 32.4 40.2C32.2 39.3 32.1 38.6 32 37.9C31.9 38.6 31.8 39.3 31.6 40.2C31 39.4 30.5 38.7 30 37.9C29.3 37.7 28.4 37.9 27.2 38.4C27.4 37.6 27.7 36.9 28 36C28.7 34 29.2 32 29.1 30C29 28.6 28.7 27.3 28.5 25.8C28.2 23.8 28.7 22.2 30 21.3Z"/>
    <path class="fairy-gown-shade" d="M30 21.3C30.5 21 31 20.8 31.5 20.8C30.6 22.6 30.3 24.4 30.5 26.4C30.7 28.2 30.9 29.6 30.8 31.2C30.7 33.4 30.2 35.6 29.4 37.6C28.7 37.7 28 37.9 27.2 38.4C27.4 37.6 27.7 36.9 28 36C28.7 34 29.2 32 29.1 30C29 28.6 28.7 27.3 28.5 25.8C28.2 23.8 28.7 22.2 30 21.3Z"/>

    <path class="fairy-neck" d="M30.9 18.6H33.1V21.7H30.9Z"/>
    <ellipse class="fairy-head" cx="32" cy="15.2" rx="4.6" ry="5"/>
    <path class="fairy-hair" d="M32 9.8C35.8 9.8 38 12.4 37.7 16.4C37.4 14.7 36.8 13.5 35.9 12.6C34.9 13.6 33.5 14.2 31.8 14.2C29.5 14.2 27.4 13.3 26 12C25.4 13.3 25.1 14.9 25.1 16.4C24.7 12.3 27.2 9.8 32 9.8Z"/>
    <ellipse class="fairy-bun" cx="32" cy="8.9" rx="2.1" ry="1.8"/>
  </g>
</svg>`;

const fairy = (() => {
  const finePointerProbe = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedProbe = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointerProbe.matches || reducedProbe.matches) return null;
  const host = document.createElement('div');
  host.className = 'fairy-guide';
  host.setAttribute('data-fairy', '');
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = FAIRY_SVG;
  document.body.append(host);
  return host;
})();
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (fairy && finePointer.matches && !reducedMotion.matches) {
  const marked = [...document.querySelectorAll('[data-fairy-stop]')]
    .sort((p, q) => Number(p.dataset.fairyStop) - Number(q.dataset.fairyStop));
  // pages that mark nothing still get a tour, chosen by shape
  const DEFAULT_STOPS = [
    '.tale-voices .audio-toggle',   // the demo players, where they exist
    '.tale-seal',                   // the primary call to action on every subpage
    '.tale-onward',                 // "read her story" / "start a conversation"
    '.tale-address',                // the contact page's email
    '.tale-quill',                  // "view the whole Audible page"
    '.tale-seal-link',              // the letter's ways to begin
  ].join(', ');
  const stops = marked.length
    ? marked
    : [...document.querySelectorAll(DEFAULT_STOPS)].slice(0, 3);

  let x = window.innerWidth * .62;
  let y = window.innerHeight * .36;
  let pointerX = x;
  let pointerY = y;
  let facing = 1;
  let followUntil = 0;
  let lastSpark = 0;
  let stopIndex = 0;
  let stopUntil = 0;
  let highlighted = null;
  let toured = 0;
  const tourEnds = performance.now() + 30000;

  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX + 26;
    pointerY = event.clientY - 30;
    followUntil = performance.now() + 1600;
    wake();
  }, { passive: true });

  const clearHighlight = () => {
    if (highlighted) highlighted.classList.remove('is-fairy-lit');
    highlighted = null;
  };

  // Only stop at something actually on screen; skip anything scrolled away.
  // A 200ms-stale rect is not observable: she hovers each stop for 2600ms and
  // the per-frame motion is a sine wobble through a ~16-frame lerp.
  let stopCache = null;
  let stopMeasured = -1e9;
  const visibleStop = (now) => {
    if (stopCache && now - stopMeasured < 200) return stopCache;
    stopMeasured = now;
    stopCache = null;
    for (let i = 0; i < stops.length; i += 1) {
      const candidate = stops[(stopIndex + i) % stops.length];
      const box = candidate.getBoundingClientRect();
      const onScreen = box.top > 70 && box.bottom < window.innerHeight - 20
        && box.left > 0 && box.right < window.innerWidth;
      if (onScreen) {
        stopIndex = (stopIndex + i) % stops.length;
        stopCache = { el: candidate, box };
        return stopCache;
      }
    }
    return null;
  };

  // Sparks were spawning every 55ms for as long as she flew, including while
  // she was only drifting in a corner with nothing to point at. That is ~20 a
  // second of createElement + seven style writes + an animation, for the whole
  // visit. She now sheds them only when she is actually doing something, and
  // never more than LIVE_SPARKS at once.
  const LIVE_SPARKS = 14;
  let liveSparks = 0;
  const trail = (now, lively) => {
    if (!lively || liveSparks >= LIVE_SPARKS || now - lastSpark < 55) return;
    lastSpark = now;
    const count = 1 + (Math.random() > .55 ? 1 : 0);
    for (let i = 0; i < count; i += 1) {
      const spark = document.createElement('span');
      const isStar = Math.random() > .5;
      spark.className = `fairy-spark${isStar ? ' is-star' : ''}`;
      if (isStar) spark.textContent = Math.random() > .5 ? '✦' : '⋆';
      spark.style.left = `${x + 26 + (Math.random() - .5) * 26}px`;
      spark.style.top = `${y + 30 + (Math.random() - .5) * 22}px`;
      spark.style.setProperty('--fall', `${16 + Math.random() * 26}px`);
      spark.style.setProperty('--sway', `${(Math.random() - .5) * 26}px`);
      spark.style.setProperty('--spin', `${(Math.random() - .5) * 200}deg`);
      spark.style.setProperty('--size', (.5 + Math.random() * .8).toFixed(2));
      spark.style.animationDelay = `${i * 55}ms`;
      document.body.append(spark);
      liveSparks += 1;
      // one removal path, not two: a hidden spark never fires animationend, so
      // the timer is the fallback and clears itself when the event wins.
      let gone = false;
      const drop = () => {
        if (gone) return;
        gone = true;
        liveSparks -= 1;
        window.clearTimeout(timer);
        spark.remove();
      };
      const timer = window.setTimeout(drop, 1700);
      spark.addEventListener('animationend', drop, { once: true });
    }
  };

  const flutter = (now) => {
    let targetX;
    let targetY;
    let lively = true;

    if (now < followUntil) {
      // the visitor is moving, so she comes along
      clearHighlight();
      targetX = pointerX;
      targetY = pointerY;
      stopUntil = 0;
    } else {
      if (now > tourEnds) toured = 3;
      const found = stops.length && toured < 3 ? visibleStop(now) : null;
      if (found) {
        const { el: stop, box } = found;
        // hover just above and left of the target, so she never covers it
        targetX = box.left - 44 + Math.sin(now / 700) * 10;
        targetY = box.top + box.height / 2 - 42 + Math.cos(now / 560) * 9;
        if (!stopUntil) stopUntil = now + 2600;
        if (highlighted !== stop) {
          clearHighlight();
          highlighted = stop;
          stop.classList.add('is-fairy-lit');
        }
        if (now > stopUntil) {
          clearHighlight();
          stopUntil = 0;
          stopIndex = (stopIndex + 1) % stops.length;
          stopCache = null;
          if (stopIndex === 0) toured += 1;
        }
      } else {
        // drifting with nothing to point at — no reason to shed sparks
        clearHighlight();
        lively = false;
        targetX = window.innerWidth * .72 + Math.sin(now / 900) * 40;
        targetY = window.innerHeight * .3 + Math.cos(now / 760) * 30;
      }
    }

    const previousX = x;
    x += (targetX - x) * .062;
    y += (targetY - y) * .062;
    if (Math.abs(x - previousX) > .35) facing = x > previousX ? 1 : -1;

    fairy.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${Math.sin(now / 420) * 6}deg) scaleX(${facing})`;
    trail(now, lively);
    // she costs nothing while the visitor is just reading
    if (toured >= 3 && now > followUntil + 1200) { running = false; return; }
    window.requestAnimationFrame(flutter);
  };

  // She must not fly while the curtain is up OR during the ink dissolve. The
  // gate lives inside wake() because pointermove calls it too, and was starting
  // her on the visitor's first mouse move — long before any click. Her sparks
  // were display:none, so animationend never fired and ~45 accumulated, then
  // all began animating at once the moment has-opening dropped.
  let running = false;
  let allowed = !document.body.classList.contains('has-opening');
  const wake = () => {
    if (running || !allowed) return;
    running = true;
    window.requestAnimationFrame(flutter);
  };
  if (allowed) wake();
  else document.addEventListener('dey:opening-done', () => { allowed = true; wake(); }, { once: true });

  // Once the visitor starts clicking things for themselves she stops pointing —
  // but the click that opens the curtain does not count as finding their way.
  const standDown = (event) => {
    if (event.target.closest('.stage-opening')) return;
    toured = 3;
    clearHighlight();
    document.removeEventListener('click', standDown);
  };
  document.addEventListener('click', standDown);
}

// The ribbon only scrolls while it is on screen. Off screen it is 34s of
// main-thread transform for nobody — including the entire opening dissolve.
const ribbon = document.querySelector('.tale-ribbon');
if (ribbon && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    ribbon.classList.toggle('is-on-screen', entry.isIntersecting);
  }).observe(ribbon);
} else {
  ribbon?.classList.add('is-on-screen');
}

// Videos marked data-autoplay start themselves once they are actually on
// screen, and stop when they leave. Autoplay is only permitted while muted, so
// the controls stay put for anyone who wants the sound. Nothing is fetched
// until the element is in view — this one is 12.7 MB.
const autoplayVideos = [...document.querySelectorAll('video[data-autoplay]')];
if (autoplayVideos.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) {
          // a visitor who pressed pause should stay paused
          if (!target.dataset.userPaused) target.play().catch(() => {});
        } else if (!target.paused) {
          target.pause();
        }
      });
    }, { threshold: 0.35 });
    autoplayVideos.forEach((video) => {
      video.addEventListener('pause', () => {
        if (!video.ended && document.visibilityState === 'visible') video.dataset.userPaused = '1';
      });
      video.addEventListener('play', () => { delete video.dataset.userPaused; });
      watcher.observe(video);
    });
  } else {
    autoplayVideos.forEach((v) => v.play().catch(() => {}));
  }
}

document.querySelectorAll('[data-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});

/* --- The night sky behind the book ---------------------------------------
   Built here rather than written into ten pages. Positions come from a fixed
   sequence, not Math.random, so the sky is the same on every visit and every
   page — it should feel like one place, not a new scatter each load. Every
   star is a single element animating opacity only, which the compositor
   carries without touching layout or paint. */
(() => {
  if (document.querySelector('.night-sky')) return;

  const sky = document.createElement('div');
  sky.className = 'night-sky';
  sky.setAttribute('aria-hidden', 'true');

  // x%, y%, px, star?
  const STARS = [
    [4, 8, 3, 0], [11, 22, 2, 0], [7, 41, 4, 1], [3, 62, 2, 0], [9, 78, 3, 0], [15, 92, 2, 1],
    [21, 6, 2, 0], [27, 33, 3, 0], [19, 54, 2, 1], [24, 70, 4, 0], [31, 88, 2, 0],
    [38, 14, 3, 1], [44, 47, 2, 0], [36, 66, 3, 0], [42, 83, 2, 0], [49, 27, 2, 1],
    [56, 9, 3, 0], [61, 38, 2, 0], [54, 58, 4, 1], [66, 74, 2, 0], [59, 94, 3, 0],
    [72, 18, 2, 1], [78, 44, 3, 0], [69, 63, 2, 0], [83, 81, 4, 0], [76, 96, 2, 1],
    [88, 12, 3, 0], [94, 35, 2, 0], [86, 56, 3, 1], [97, 71, 2, 0], [91, 89, 3, 0],
  ];

  const frag = document.createDocumentFragment();
  STARS.forEach(([x, y, s, star], i) => {
    const el = document.createElement('i');
    if (star) el.className = 'is-star';
    el.style.cssText = `--x:${x}%;--y:${y}%;--s:${s * 2}px;--t:${5 + (i % 5) * 1.6}s;--d:-${(i * 0.83).toFixed(2)}s`;
    frag.appendChild(el);
  });
  sky.appendChild(frag);
  document.body.appendChild(sky);
})();
