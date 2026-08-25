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
      // the wet edge is drawn as a stroke, so its width stays constant on screen
      // instead of thickening as the blot grows
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      path.setAttribute('class', spec.drop ? 'ink-blot ink-blot-drop' : 'ink-blot');
      path.style.cssText = `--x:${spec.x}px;--y:${spec.y}px;--s:${spec.s};`
        + `--r0:${spec.r0}deg;--r1:${spec.r1}deg;--d:${spec.d}ms`;
      shapes.append(path);
    });

    // filled copies punch the hole; stroked copies trace the wet edge
    veil.querySelectorAll('[data-ink-front]').forEach((g) => g.append(shapes.cloneNode(true)));
    veil.querySelectorAll('[data-ink-edge]').forEach((g) => g.append(shapes.cloneNode(true)));
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

    // The ink lands where the visitor pressed, then spreads from there.
    buildInkVeil(inkVeil);
    const spot = source?.getBoundingClientRect();
    const origin = spot
      ? { x: spot.left + spot.width / 2, y: spot.top + spot.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight * .53 };
    if (inkVeil) {
      inkVeil.style.setProperty('--ink-x', `${(origin.x / window.innerWidth) * 100}%`);
      inkVeil.style.setProperty('--ink-y', `${(origin.y / window.innerHeight) * 100}%`);
    }
    scatterInkSparkles(sparkleLayer, origin);

    opening.classList.add('is-open');
    document.body.classList.remove('has-opening');
    window.setTimeout(() => opening.classList.add('is-gone'), revealDuration);
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
    // Build the geometry while the visitor is still reading, not on the click.
    const warm = () => buildInkVeil(inkVeil);
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 1500 });
    else window.setTimeout(warm, 400);
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
    if (progress) progress.style.width = `${ratio * 100}%`;
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
const fairy = document.querySelector('[data-fairy]');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (fairy && finePointer.matches && !reducedMotion.matches) {
  const stops = [...document.querySelectorAll('[data-fairy-stop]')]
    .sort((p, q) => Number(p.dataset.fairyStop) - Number(q.dataset.fairyStop));

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
  const visibleStop = () => {
    for (let i = 0; i < stops.length; i += 1) {
      const candidate = stops[(stopIndex + i) % stops.length];
      const box = candidate.getBoundingClientRect();
      const onScreen = box.top > 70 && box.bottom < window.innerHeight - 20
        && box.left > 0 && box.right < window.innerWidth;
      if (onScreen) {
        stopIndex = (stopIndex + i) % stops.length;
        return { el: candidate, box };
      }
    }
    return null;
  };

  const trail = (now) => {
    if (now - lastSpark < 55) return;
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
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
      window.setTimeout(() => spark.remove(), 1700);
    }
  };

  const flutter = (now) => {
    let targetX;
    let targetY;

    if (now < followUntil) {
      // the visitor is moving, so she comes along
      clearHighlight();
      targetX = pointerX;
      targetY = pointerY;
      stopUntil = 0;
    } else {
      if (now > tourEnds) toured = 3;
      const found = stops.length && toured < 3 ? visibleStop() : null;
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
          if (stopIndex === 0) toured += 1;
        }
      } else {
        clearHighlight();
        targetX = window.innerWidth * .72 + Math.sin(now / 900) * 40;
        targetY = window.innerHeight * .3 + Math.cos(now / 760) * 30;
      }
    }

    const previousX = x;
    x += (targetX - x) * .062;
    y += (targetY - y) * .062;
    if (Math.abs(x - previousX) > .35) facing = x > previousX ? 1 : -1;

    fairy.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${Math.sin(now / 420) * 6}deg) scaleX(${facing})`;
    trail(now);
    // she costs nothing while the visitor is just reading
    if (toured >= 3 && now > followUntil + 1200) { running = false; return; }
    window.requestAnimationFrame(flutter);
  };

  // 1a — never fly while the curtain is up: she is display:none there, and the
  // sparks she sheds would be invisible and therefore never cleaned up
  let running = false;
  const wake = () => {
    if (running) return;
    running = true;
    window.requestAnimationFrame(flutter);
  };
  if (document.body.classList.contains('has-opening')) {
    document.addEventListener('click', wake, { once: true });
  } else {
    wake();
  }

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

document.querySelectorAll('[data-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});
