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

// Curtain opening. Browsers require a click before sound can begin.
const opening = document.querySelector('[data-opening]');
if (opening) {
  const openButton = opening.querySelector('[data-curtain-open]');
  const skipButton = opening.querySelector('[data-curtain-skip]');
  const openingAudio = opening.querySelector('[data-opening-audio]');
  const stopButton = document.querySelector('[data-opening-stop]');
  const hasSeenOpening = sessionStorage.getItem('dey-opening-seen') === 'yes';
  const revealDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 800;

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

  const openCurtain = (withSound) => {
    if (opening.classList.contains('is-open')) return;
    sessionStorage.setItem('dey-opening-seen', 'yes');
    if (withSound) playOpeningAudio();
    else stopOpeningAudio();
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
    openButton?.addEventListener('click', () => { openCurtain(true); releaseScroll(); });
    skipButton?.addEventListener('click', () => { openCurtain(false); releaseScroll(); });
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

  const update = () => {
    const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
    if (progress) progress.style.width = `${ratio * 100}%`;
    if (time) time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
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

// A tiny guide fairy: it rests near the demos, follows a pointer briefly,
// then returns to the next useful place. Motion is disabled for accessibility.
const fairy = document.querySelector('[data-fairy]');
const fairyDestination = document.querySelector('#featured-demos');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (fairy && fairyDestination && finePointer.matches && !reducedMotion.matches) {
  let x = window.innerWidth * .68;
  let y = window.innerHeight * .34;
  let pointerX = x;
  let pointerY = y;
  let followUntil = 0;
  let lastSpark = 0;

  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX + 20;
    pointerY = event.clientY - 22;
    followUntil = performance.now() + 1500;
  }, { passive: true });

  const leaveSpark = () => {
    const spark = document.createElement('span');
    spark.className = 'fairy-spark';
    spark.style.left = `${x + 11 + (Math.random() - .5) * 10}px`;
    spark.style.top = `${y + 14 + (Math.random() - .5) * 8}px`;
    document.body.append(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  };

  const flutter = (time) => {
    let targetX = pointerX;
    let targetY = pointerY;
    if (time > followUntil) {
      const destination = fairyDestination.getBoundingClientRect();
      targetX = destination.left - 22 + Math.sin(time / 760) * 16;
      targetY = destination.top + 30 + Math.cos(time / 620) * 20;
    }
    x += (targetX - x) * .075;
    y += (targetY - y) * .075;
    fairy.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${Math.sin(time / 260) * 7}deg)`;
    if (time - lastSpark > 105) {
      leaveSpark();
      lastSpark = time;
    }
    window.requestAnimationFrame(flutter);
  };
  window.requestAnimationFrame(flutter);
}

document.querySelectorAll('[data-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});
