import {releaseFromGitHub, validSnapshot, releaseDate, dateLabel, compareVersions, RELEASE_API} from './release.js?v=mobile-1';
const $=(selector,parent=document)=>parent.querySelector(selector);
const $$=(selector,parent=document)=>[...parent.querySelectorAll(selector)];
$('#year').textContent=new Date().getFullYear();

let current=null,syncing=false,lastSync=0;
function applyRelease(value,source){
  const release=validSnapshot(value);if(!release)return false;
  // An old browser cache or packaged fallback must not overwrite a newer published installer.
  if(current&&(compareVersions(release.version,current.version)<0||(release.version===current.version&&Date.parse(releaseDate(release)||0)<Date.parse(releaseDate(current)||0))))return false;
  current=release;
  $$('[data-version]').forEach(el=>{el.textContent=release.version;});
  $$('[data-size]').forEach(el=>{el.textContent=`${release.size} МБ`;});
  $$('[data-download]').forEach(el=>{el.href=release.url;el.setAttribute('aria-label',`Скачать Moku ${release.version} для Windows x64`);});
  $$('[data-release-link]').forEach(el=>{el.href=release.releaseUrl;});
  const mobile=release.mobile;
  $$('[data-apk]').forEach(el=>{el.hidden=!mobile;});
  if(mobile){
    $$('[data-apk-version]').forEach(el=>{el.textContent=mobile.version;});
    $$('[data-apk-size]').forEach(el=>{el.textContent=`${String(mobile.size).replace('.',',')} МБ`;});
    $$('[data-apk-download]').forEach(el=>{el.href=mobile.url;el.setAttribute('aria-label',`Скачать Moku Mobile ${mobile.version} для Android`);});
  }
  $('[data-release-name]').textContent=release.name;
  $('[data-release-summary]').textContent=release.summary;
  const date=releaseDate(release),time=$('[data-release-date]');time.hidden=!date;time.textContent=dateLabel(date);if(date)time.dateTime=date;
  const list=$('#release-features');list.replaceChildren();
  for(const feature of release.features){const li=document.createElement('li'),strong=document.createElement('strong');strong.textContent=feature.title;li.append(strong);if(feature.text)li.append(document.createTextNode(' — '+feature.text));list.append(li);}
  $('#release-details').hidden=!release.features.length;
  $('#release-status').textContent=source==='live'?'Сверено с опубликованным релизом Moku.':'Данные опубликованного релиза Moku. Обновляются автоматически.';
  document.title=`Moku — живой островок для Windows · ${release.version}`;
  const meta=$('meta[property="og:title"]');if(meta)meta.content=`Moku ${release.version} — живой островок для Windows`;
  try{localStorage.setItem('moku-release-v1',JSON.stringify(release));}catch{}
  return true;
}
async function syncRelease(){
  if(syncing||(lastSync&&Date.now()-lastSync<300000))return;
  syncing=true;lastSync=Date.now();
  try{const response=await fetch(RELEASE_API,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(6500)});if(response.ok)applyRelease(releaseFromGitHub(await response.json()),'live');}catch{}finally{syncing=false;}
}
async function initRelease(){
  try{applyRelease(JSON.parse(localStorage.getItem('moku-release-v1')),'cache');}catch{}
  try{const response=await fetch('./release.json',{cache:'no-cache',signal:AbortSignal.timeout(4500)});if(response.ok)applyRelease(await response.json(),'snapshot');}catch{}
  syncRelease();
}
initRelease();setInterval(()=>{if(!document.hidden)syncRelease();},300000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncRelease();});
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

document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true')closeMenu(true);});
