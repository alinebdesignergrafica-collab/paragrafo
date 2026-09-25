(() => {
  const root = document.documentElement;
  const controls = document.querySelector('#controls');
  const wheel = document.querySelector('#wheel');
  const dot = document.querySelector('#wheelDot');
  const swatch = document.querySelector('#swatch');
  const saturation = document.querySelector('#saturation');
  const brightness = document.querySelector('#brightness');
  const satValue = document.querySelector('#saturationValue');
  const briValue = document.querySelector('#brightnessValue');
  const hueValue = document.querySelector('#hueValue');
  const hexValue = document.querySelector('#hexValue');
  const start = document.querySelector('#start');
  const reveal = document.querySelector('#reveal');
  const status = document.querySelector('#status');
  const install = document.querySelector('#install');
  const stored = JSON.parse(localStorage.getItem('chamegoLight') || '{}');
  const state = { h: clamp(Number(stored.h ?? 345), 0, 359), s: clamp(Number(stored.s ?? 82), 0, 100), v: clamp(Number(stored.v ?? 100), 5, 100) };
  let wakeLock = null;
  let installPrompt = null;
  function clamp(n, min, max) { return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; }
  function hsvToRgb(h, s, v) {
    s /= 100; v /= 100;
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r,g,b] = [c,x,0]; else if (h < 120) [r,g,b] = [x,c,0]; else if (h < 180) [r,g,b] = [0,c,x];
    else if (h < 240) [r,g,b] = [0,x,c]; else if (h < 300) [r,g,b] = [x,0,c]; else [r,g,b] = [c,0,x];
    return [r,g,b].map(n => Math.round((n + m) * 255));
  }
  function rgbToHex([r,g,b]) { return '#' + [r,g,b].map(n => n.toString(16).padStart(2,'0')).join('').toUpperCase(); }
  function update() {
    const rgb = hsvToRgb(state.h, state.s, state.v), color = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
    root.style.setProperty('--light', color);
    root.style.setProperty('--accent', rgbToHex(hsvToRgb(state.h, Math.min(86, state.s), 100)));
    saturation.value = String(Math.round(state.s)); brightness.value = String(Math.round(state.v));
    satValue.textContent = `${Math.round(state.s)}%`; briValue.textContent = `${Math.round(state.v)}%`;
    hueValue.textContent = `${Math.round(state.h)}°`; hexValue.textContent = rgbToHex(rgb); swatch.style.background = color;
    wheel.setAttribute('aria-valuenow', String(Math.round(state.h)));
    const angle = (state.h - 90) * Math.PI / 180, radius = wheel.clientWidth * 0.425, center = wheel.clientWidth / 2;
    dot.style.left = `${center + Math.cos(angle) * radius}px`; dot.style.top = `${center + Math.sin(angle) * radius}px`;
    localStorage.setItem('chamegoLight', JSON.stringify(state));
  }
  function hueFromPointer(ev) {
    const rect = wheel.getBoundingClientRect(), x = ev.clientX - (rect.left + rect.width / 2), y = ev.clientY - (rect.top + rect.height / 2);
    state.h = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360; update();
  }
  wheel.addEventListener('pointerdown', ev => { wheel.setPointerCapture(ev.pointerId); hueFromPointer(ev); });
  wheel.addEventListener('pointermove', ev => { if (wheel.hasPointerCapture(ev.pointerId)) hueFromPointer(ev); });
  wheel.addEventListener('keydown', ev => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)) return;
    ev.preventDefault(); const dir = (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') ? 1 : -1; state.h = (state.h + dir + 360) % 360; update();
  });
  saturation.addEventListener('input', () => { state.s = Number(saturation.value); update(); });
  brightness.addEventListener('input', () => { state.v = Number(brightness.value); update(); });
  document.querySelectorAll('.presets button').forEach(btn => btn.addEventListener('click', () => { state.h=Number(btn.dataset.h); state.s=Number(btn.dataset.s); state.v=Number(btn.dataset.v); update(); }));
  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) { status.textContent = 'Seu navegador não oferece bloqueio de tela ativa.'; return; }
    try {
      if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
      status.textContent = 'Tela mantida ativa enquanto a luz estiver aberta.';
    } catch { status.textContent = 'Não consegui impedir o bloqueio automático da tela.'; }
  }
  async function enterLightMode() {
    await requestWakeLock();
    try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch {}
    controls.classList.add('hidden'); reveal.hidden = false;
  }
  function showControls() { controls.classList.remove('hidden'); reveal.hidden = true; }
  start.addEventListener('click', enterLightMode); reveal.addEventListener('click', showControls);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && controls.classList.contains('hidden')) requestWakeLock(); });
  window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); installPrompt = ev; install.hidden = false; });
  install.addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; install.hidden = true; });
  window.addEventListener('appinstalled', () => { install.hidden = true; status.textContent = 'Instalado. Agora abre como aplicativo e continua offline.'; });
  if ('serviceWorker' in navigator) window.addEventListener('load', async () => {
    try { await navigator.serviceWorker.register('./sw.js'); status.textContent = 'Offline pronto. Você pode apagar o Wi‑Fi sem medo.'; }
    catch { status.textContent = 'A luz funciona, mas o modo offline não foi ativado.'; }
  });
  update(); window.addEventListener('resize', update, {passive:true});
})();
