const audioMessage = document.querySelector('.audio-message');
const players = document.querySelectorAll('[data-audio]');

function setPlaying(button, playing) {
  button.classList.toggle('is-playing', playing);
  button.setAttribute('aria-label', playing ? 'Pause audio' : 'Play audio');
}

players.forEach((button) => {
  const audio = document.getElementById(button.dataset.audio);
  if (!audio) return;

  button.addEventListener('click', async () => {
    if (!audio.currentSrc) {
      if (audioMessage) audioMessage.textContent = 'Add your MP3 to assets/audio to bring this opening to life.';
      return;
    }
    document.querySelectorAll('audio').forEach((other) => {
      if (other !== audio) other.pause();
    });
    players.forEach((otherButton) => {
      if (otherButton !== button) setPlaying(otherButton, false);
    });
    try {
      if (audio.paused) {
        await audio.play();
        setPlaying(button, true);
      } else {
        audio.pause();
        setPlaying(button, false);
      }
    } catch {
      if (audioMessage) audioMessage.textContent = 'Add your MP3 to assets/audio to bring this opening to life.';
    }
  });
  audio.addEventListener('ended', () => setPlaying(button, false));
});

document.getElementById('year').textContent = new Date().getFullYear();
