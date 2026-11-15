import { createEyeState, updateEyeState, eyeMood, gazeForPoint, springStep } from './eye-state.js';
import { installerFromRelease } from './release.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const toast = $('#toast');
let toastTimer;
function notify(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3300);
}
$('#year').textContent = new Date().getFullYear();

// Release metadata never blocks the page, and an API/network failure leaves real fallback links.
let syncing = false, lastSync = 0;
async function syncRelease() {
  if (syncing || (lastSync && Date.now() - lastSync < 5 * 60 * 1000)) return;
  syncing = true;
  lastSync = Date.now(); // Also throttle offline/rate-limited checks when switching tabs.
  try {
    const response = await fetch('https://api.github.com/repos/drugalochek/Moku/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(6500)
    });
    if (!response.ok) return;
    const installer = installerFromRelease(await response.json());
    if (!installer) return;
    $$('[data-version]').forEach(node => { node.textContent = installer.version; });
    $$('[data-download]').forEach(node => {
      node.href = installer.url;
      node.setAttribute('aria-label', `Скачать Moku ${installer.version} для Windows x64`);
    });
    if (installer.size > 0) $$('[data-size]').forEach(node => { node.textContent = `${installer.size} МБ`; });
    document.title = `Moku — живой островок для Windows · ${installer.version}`;
    lastSync = Date.now();
  } catch { /* Offline/rate-limited: the previous valid installer remains usable. */ }
  finally { syncing = false; }
}
syncRelease();
setInterval(() => { if (!document.hidden) syncRelease(); }, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncRelease(); });

// Mobile navigation has a real toggle and keyboard dismissal.
const menu = $('#menu-toggle'), nav = $('#navigation');
function closeMenu(returnFocus = false) {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Открыть меню');
  nav.classList.remove('is-open');
  if (returnFocus) menu.focus();
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  nav.classList.toggle('is-open', open);
});
nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('click', event => { if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu(); });
window.addEventListener('resize', () => { if (innerWidth > 580) closeMenu(); }, { passive: true });

// The island is a demo, not a simulation of access to the visitor's computer.
const island = $('#demo-island'), face = $('#island-face'), body = $('#island-body');
face.addEventListener('click', () => {
  const expanded = face.getAttribute('aria-expanded') !== 'true';
  face.setAttribute('aria-expanded', String(expanded));
  face.setAttribute('aria-label', expanded ? 'Свернуть демо островка' : 'Развернуть демо островка');
  body.hidden = !expanded;
  island.classList.toggle('is-collapsed', !expanded);
  $('#eye-caption').textContent = expanded ? 'Вот и всё нужное. Попробуй вкладки.' : 'Компактно, когда не нужен. Нажми ещё раз.';
});
const tabs = $$('[data-tab]');
function selectTab(tab, focus = false) {
  tabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    $(`#panel-${item.dataset.tab}`).hidden = !selected;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== null) { event.preventDefault(); selectTab(tabs[next], true); }
  });
});
const playButton = $('#demo-play');
playButton.addEventListener('click', () => {
  const playing = playButton.getAttribute('aria-pressed') !== 'true';
  playButton.setAttribute('aria-pressed', String(playing));
  playButton.setAttribute('aria-label', playing ? 'Остановить демо-анимацию волны' : 'Включить демо-анимацию волны');
  island.classList.toggle('is-playing', playing);
  $('#eye-caption').textContent = playing ? 'Это демо-анимация. Звук в браузере не включается.' : 'Волну поставили на паузу. Всё спокойно.';
});
$$('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(button.dataset.copy);
    notify('Пример записи скопирован');
  } catch { notify('Копирование недоступно. Это только пример записи в демо.'); }
}));
const folder = $('#demo-folder'), back = $('#folder-back');
function openFolder(open) {
  $('#demo-app-tiles').hidden = open;
  $('#demo-folder-items').hidden = !open;
  back.hidden = !open;
  $('#demo-folder-title').textContent = open ? 'Работа' : 'Твои приложения';
  (open ? back : folder).focus();
}
folder.addEventListener('click', () => openFolder(true));
back.addEventListener('click', () => openFolder(false));
const radius = $('#demo-radius');
radius.addEventListener('input', () => {
  const value = Math.max(12, Math.min(40, Number(radius.value) || 28));
  island.style.setProperty('--demo-radius', `${value}px`);
  $('#radius-value').value = value;
});
const accents = { violet: '#b0a5ff', ice: '#9ed4e0', white: '#f0eff6' };
$$('[data-accent]').forEach(button => button.addEventListener('click', () => {
  island.style.setProperty('--demo-accent', accents[button.dataset.accent]);
  $$('[data-accent]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));

// Native modal: keyboard opening, focus trap, Escape, arrow navigation, restored focus.
const dialog = $('#lightbox'), image = $('#lightbox-image'), caption = $('#lightbox-caption');
const shots = $$('.screenshot-button');
let shotIndex = 0, returnFocus = null;
function showShot(index) {
  shotIndex = (index + shots.length) % shots.length;
  const shot = shots[shotIndex], thumb = $('img', shot);
  image.src = shot.dataset.full;
  image.alt = thumb.alt;
  caption.textContent = $('strong', shot.closest('figure')).textContent + ` · ${shotIndex + 1} / ${shots.length}`;
}
shots.forEach((shot, index) => shot.addEventListener('click', () => {
  returnFocus = shot;
  showShot(index);
  dialog.showModal();
  document.body.classList.add('modal-open');
  $('#lightbox-close').focus();
}));
$('#lightbox-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); showShot(shotIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
});
dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); image.removeAttribute('src'); returnFocus?.focus(); });

// Helper stays docked. It only opens when requested and can be hidden for this session.
const assistant = $('#assistant'), assistantFace = $('#assistant-face'), assistantPanel = $('#assistant-panel');
const restoreAssistant = $('#show-assistant');
function closeAssistant(focus = false) {
  assistantPanel.hidden = true;
  assistantFace.setAttribute('aria-expanded', 'false');
  assistantFace.setAttribute('aria-label', 'Открыть помощника Moku');
  if (focus) assistantFace.focus();
}
assistantFace.addEventListener('click', () => {
  const open = assistantPanel.hidden;
  assistantPanel.hidden = !open;
  assistantFace.setAttribute('aria-expanded', String(open));
  assistantFace.setAttribute('aria-label', open ? 'Закрыть помощника Moku' : 'Открыть помощника Moku');
});
$('#assistant-close').addEventListener('click', () => closeAssistant(true));
$('#assistant-action').addEventListener('click', () => closeAssistant());
$('#hide-assistant').addEventListener('click', () => {
  closeAssistant();
  assistant.hidden = true;
  restoreAssistant.hidden = false;
  try { sessionStorage.setItem('moku-assistant-hidden', '1'); } catch { }
  notify('Глазки скрыты. Вернуть их можно внизу сайта.');
});
restoreAssistant.addEventListener('click', () => {
  assistant.hidden = false;
  restoreAssistant.hidden = true;
  try { sessionStorage.removeItem('moku-assistant-hidden'); } catch { }
  assistantFace.focus({ preventScroll: true });
  requestAnimationFrame(measureEyes);
});
try { if (sessionStorage.getItem('moku-assistant-hidden') === '1') { assistant.hidden = true; restoreAssistant.hidden = false; } } catch { }
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
    if (!assistantPanel.hidden) closeAssistant(true);
  }
});
document.addEventListener('pointerdown', event => { if (!assistant.contains(event.target)) closeAssistant(); });

// Eye rig: smooth gaze, cause-driven expressions, natural blinks; no moving the helper.
const labels = { neutral: 'Рядом', tracking: 'Смотрю на курсор', curious: 'Мне интересно', happy: 'Рад тебе', sleepy: 'Отдыхаю' };
const rigs = $$('[data-eyes]').map(eyes => ({ eyes, host: eyes.closest('.eye-host'), state: createEyeState(performance.now()), x: 0, y: 0, vx: 0, vy: 0, rect: null, mood: null }));
let pointer = null, animation = 0, lastFrame = performance.now(), blinkTimer = 0, blinkEndTimer = 0;
function measureEyes() { rigs.forEach(rig => { rig.rect = rig.host.getBoundingClientRect(); }); ensureFrame(); }
function eyeEvent(rig, event) { rig.state = updateEyeState(rig.state, event, performance.now()); paintMood(rig, performance.now()); ensureFrame(); }
function paintMood(rig, now) {
  const mood = eyeMood(rig.state, now);
  if (mood === rig.mood) return false;
  rig.mood = mood;
  rig.eyes.dataset.mood = mood;
  if (rig.host === assistantFace) $('#assistant-state').textContent = labels[mood];
  return true;
}
rigs.forEach(rig => {
  rig.host.addEventListener('pointerenter', () => eyeEvent(rig, 'enter'));
  rig.host.addEventListener('pointerleave', () => eyeEvent(rig, 'exit'));
  rig.host.addEventListener('focus', () => { if (rig.host.matches(':focus-visible')) eyeEvent(rig, 'focus'); });
  rig.host.addEventListener('blur', () => eyeEvent(rig, 'blur'));
  rig.host.addEventListener('click', () => eyeEvent(rig, 'click'));
});
document.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  pointer = { x: event.clientX, y: event.clientY };
  rigs.forEach(rig => eyeEvent(rig, 'pointer'));
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => { pointer = null; rigs.forEach(rig => eyeEvent(rig, 'leave')); });
document.addEventListener('keydown', () => rigs.forEach(rig => eyeEvent(rig, 'wake')));
function ensureFrame() {
  if (animation || document.hidden || reducedMotion.matches) return;
  lastFrame = performance.now();
  animation = requestAnimationFrame(frame);
}
function frame(now) {
  animation = 0;
  if (document.hidden || reducedMotion.matches) return;
  const dt = Math.min((now - lastFrame) / 1000, .034); lastFrame = now;
  let moving = false;
  rigs.forEach(rig => {
    if (rig.host.closest('[hidden]')) return;
    paintMood(rig, now);
    const desired = rig.mood === 'sleepy' ? { x: 0, y: 0 } : gazeForPoint(pointer, rig.rect);
    const x = springStep(rig.x, rig.vx, desired.x, dt), y = springStep(rig.y, rig.vy, desired.y, dt);
    rig.x = x.value; rig.vx = x.velocity; rig.y = y.value; rig.vy = y.velocity;
    if (Math.abs(rig.vx) > .01 || Math.abs(rig.vy) > .01 || Math.abs(desired.x - rig.x) > .003 || Math.abs(desired.y - rig.y) > .003) moving = true;
    rig.eyes.style.setProperty('--look-x', rig.x.toFixed(2) + 'px');
    rig.eyes.style.setProperty('--look-y', rig.y.toFixed(2) + 'px');
  });
  if (moving) animation = requestAnimationFrame(frame);
}
function scheduleBlink() {
  clearTimeout(blinkTimer);
  if (document.hidden || reducedMotion.matches) return;
  blinkTimer = setTimeout(() => {
    rigs.forEach(rig => { if (rig.mood !== 'happy' && !rig.host.closest('[hidden]')) rig.eyes.classList.add('is-blinking'); });
    blinkEndTimer = setTimeout(() => rigs.forEach(rig => rig.eyes.classList.remove('is-blinking')), 135);
    scheduleBlink();
  }, 4900);
}
function runEyes() {
  cancelAnimationFrame(animation); animation = 0;
  clearTimeout(blinkTimer); clearTimeout(blinkEndTimer);
  rigs.forEach(rig => rig.eyes.classList.remove('is-blinking'));
  if (document.hidden) return;
  measureEyes();
  lastFrame = performance.now();
  rigs.forEach(rig => paintMood(rig, lastFrame));
  if (!reducedMotion.matches) { ensureFrame(); scheduleBlink(); }
}
window.addEventListener('resize', measureEyes, { passive: true });
window.addEventListener('scroll', () => { measureEyes(); rigs.forEach(rig => eyeEvent(rig, 'wake')); }, { passive: true });
document.addEventListener('visibilitychange', runEyes);
reducedMotion.addEventListener('change', runEyes);
new ResizeObserver(measureEyes).observe(island);
setInterval(() => { if (!document.hidden) rigs.forEach(rig => { if (paintMood(rig, performance.now())) ensureFrame(); }); }, 1000);
runEyes();

// Navigation and assistant context follow sections without opening unsolicited bubbles.
const contexts = {
  playground: ['Посмотри на островок — его можно свернуть, поменять цвет и скругление. Я пока побуду рядом.', 'Попробовать островок', '#playground'],
  features: ['В Moku есть музыка, история буфера, приложения и быстрые инструменты. Цвет и форму островка можно настроить под себя.', 'Посмотреть интерфейс', '#screenshots'],
  screenshots: ['Это реальные скриншоты. Нажми на любой, затем листай стрелками на клавиатуре. Escape закроет просмотр.', 'К возможностям', '#features'],
  questions: ['Открыть Moku можно сочетанием Alt + Пробел. Если хочешь другое — назначь его в настройках приложения.', 'Перейти к скачиванию', '#download'],
  download: ['Готов познакомиться? Кнопка скачает установщик из официального релиза Moku на GitHub.', 'Наверх к островку', '#playground']
};
const sectionObserver = new IntersectionObserver(entries => {
  const entry = entries.filter(item => item.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!entry) return;
  const key = entry.target.id;
  $$('.navigation a').forEach(link => { if (link.hash === '#' + key) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  const context = contexts[key];
  if (context) {
    $('#assistant-message').textContent = context[0];
    $('#assistant-action').textContent = context[1] + ' ↗';
    $('#assistant-action').href = context[2];
  }
}, { rootMargin: '-10% 0px -35% 0px', threshold: [0, .1, .3] });
$$('#playground, #features, #screenshots, #questions, #download').forEach(section => sectionObserver.observe(section));
$$('[data-download]').forEach(link => link.addEventListener('click', () => notify('Открываем скачивание установщика из GitHub Releases')));
