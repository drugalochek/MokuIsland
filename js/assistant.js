import {createEyeState,updateEyeState,eyeMood,gazeForPoint,springStep} from './eye-state.js?v=eyes-2';
import {bounds,keepInside,chooseDestination,flightStep,balloonOffset,easeInOut} from './flight.js?v=eyes-2';

export function initAssistant() {
  const $=s=>document.querySelector(s),root=$('#assistant'),face=$('#assistant-face'),panel=$('#assistant-panel'),eyes=face.querySelector('[data-eyes]');
  const message=$('#assistant-message'),top=$('#assistant-top'),action=$('#assistant-action'),restore=$('#show-assistant'),stateLabel=$('#assistant-state');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey='moku-flying-assistant-v2-hidden',summon=$('#summon-assistant');
  const tips={
    hello:{text:'Я здесь, выше курсора 😌 Листай — подскажу по дороге. Внизу заберу обратно наверх.',label:'Посмотреть интерфейс',href:'#screenshots'},
    features:{text:'Всё нужное в одном островке. Рабочий стол может выдохнуть.',label:'Что умеет Moku',href:'#features'},
    screenshots:{text:'Тут без фокусов — настоящие скриншоты. Нажмёшь — покажу поближе.',label:'К скриншотам',href:'#screenshots'},
    questions:{text:'Если вопрос «а что это за глаза?» — это я. Остальные ответы рядом.',label:'Частые вопросы',href:'#questions'},
    download:{text:'Нажмёшь «Скачать» — получишь установщик, без квеста по вкладкам. Я почти дома.',label:'Перейти к скачиванию',href:'#download'},
    bottom:{text:'Мы на дне. Но это только про сайт 😌 Не хочешь наверх?',top:true}
  };
  let eye=createEyeState(performance.now()),pointer=null,hovered=false,focus=false,raf=0,last=0,nextFlight=performance.now()+650,nextBlink=performance.now()+4900,blinkUntil=0;
  let position={x:innerWidth>820?innerWidth*.79:innerWidth-95,y:innerWidth>820?165:105},target={...position},velocity={x:0,y:0},gaze={x:0,y:0,vx:0,vy:0};
  let mode='hello',context='hello',closeTimer,lastTip=performance.now(),bottomSeen=false,returnTrip=null,scrollFrame=0,returnFocusAfterTrip=false;
  const seen=new Set();
  const viewport=()=>({width:innerWidth,height:innerHeight});
  const size=()=>({width:face.offsetWidth||96,height:face.offsetHeight||64});
  const fire=event=>{eye=updateEyeState(eye,event,performance.now());};
  function placePanel(){if(panel.hidden)return;const r=panel.getBoundingClientRect(),offset=balloonOffset(position,size(),{width:r.width,height:r.height},viewport());root.style.setProperty('--balloon-x',`${offset.x}px`);root.style.setProperty('--balloon-y',`${offset.y}px`);}
  function paint(){root.style.setProperty('--flight-x',`${position.x.toFixed(2)}px`);root.style.setProperty('--flight-y',`${position.y.toFixed(2)}px`);placePanel();}
  function close(returnFocus=false){clearTimeout(closeTimer);panel.hidden=true;face.setAttribute('aria-expanded','false');nextFlight=performance.now()+2000;if(returnFocus)face.focus();}
  function show(key='hello',automatic=false){
    if(root.hidden || $('#lightbox').open)return;
    clearTimeout(closeTimer);mode=key;const tip=tips[key]||tips.hello;
    message.textContent=tip.text;top.hidden=!tip.top;action.hidden=!!tip.top;
    if(!tip.top){action.textContent=tip.label+' ↗';action.href=tip.href;}
    stateLabel.textContent=tip.top?'Маршрут построен':'Летаю рядом';panel.hidden=false;face.setAttribute('aria-expanded','true');placePanel();lastTip=performance.now();
    if(automatic&&!tip.top) closeTimer=setTimeout(()=>{if(!hovered&&!focus)close();},6500);
  }
  function destination(){
    const obstacles=[...document.querySelectorAll('header,a,button,h1,h2,h3,p,.hero-screen,.screenshot-button,.feature-card,summary')].filter(el=>!root.contains(el)).map(el=>el.getBoundingClientRect()).filter(r=>r.bottom>0&&r.top<innerHeight);
    target=chooseDestination(position,viewport(),size(),obstacles,pointer);nextFlight=performance.now()+6500+Math.random()*2500;
  }
  function cancelTrip(){if(!returnTrip)return;returnTrip=null;root.classList.remove('is-returning');close();}
  function startTrip(){
    returnFocusAfterTrip=document.activeElement===top;fire('click');clearTimeout(closeTimer);top.hidden=true;action.hidden=true;message.textContent='Держись за пиксели. Взлетаем! 🚀';stateLabel.textContent='Следующая остановка — начало';root.classList.add('is-returning');
    if(motion.matches){window.scrollTo({top:0,behavior:'instant'});finishTrip();return;}
    returnTrip={time:performance.now(),scroll:window.scrollY,start:{...position},end:keepInside({x:innerWidth*.67,y:125},bounds(viewport(),size()))};
    requestFrame();
  }
  function finishTrip(){
    returnTrip=null;root.classList.remove('is-returning');mode='hello';message.textContent='На месте. Высота — первый экран.';stateLabel.textContent='Посадка мягкая';action.hidden=false;action.textContent='Посмотреть интерфейс ↗';action.href='#screenshots';top.hidden=true;fire('click');target={...position};velocity={x:0,y:0};nextFlight=performance.now()+4500;
    if(returnFocusAfterTrip)$('#assistant-close').focus({preventScroll:true});returnFocusAfterTrip=false;
    closeTimer=setTimeout(()=>{if(!hovered&&!focus)close();},4000);
  }
  function tick(now){
    raf=0;if(root.hidden||document.hidden)return;const dt=Math.min((now-(last||now))/1000,.05);last=now;
    if(returnTrip){
      const t=Math.min(1,(now-returnTrip.time)/1550),e=easeInOut(t),trip=returnTrip;
      window.scrollTo({top:trip.scroll*(1-e),behavior:'instant'});
      position=keepInside({x:trip.start.x+(trip.end.x-trip.start.x)*e-Math.sin(Math.PI*t)*Math.min(110,innerWidth*.12),y:trip.start.y+(trip.end.y-trip.start.y)*e-Math.sin(Math.PI*t)*45},bounds(viewport(),size()));
      if(t===1){window.scrollTo({top:0,behavior:'instant'});finishTrip();}
    } else if(!motion.matches&&!hovered&&!focus&&panel.hidden&&!$('#lightbox').open){
      if(now>=nextFlight)destination();
      const x=flightStep(position.x,velocity.x,target.x,dt),y=flightStep(position.y,velocity.y,target.y,dt);position=keepInside({x:x.value,y:y.value},bounds(viewport(),size()));velocity={x:x.velocity,y:y.velocity};
    }
    paint();
    const mood=eyeMood(eye,now);eyes.dataset.mood=mood;
    const look=motion.matches||mood==='sleepy'?{x:0,y:0}:gazeForPoint(pointer,face.getBoundingClientRect());
    const x=springStep(gaze.x,gaze.vx,look.x,dt),y=springStep(gaze.y,gaze.vy,look.y,dt);gaze={x:x.value,vx:x.velocity,y:y.value,vy:y.velocity};
    eyes.style.setProperty('--look-x',`${gaze.x}px`);eyes.style.setProperty('--look-y',`${gaze.y}px`);
    if(!motion.matches&&now>=nextBlink){blinkUntil=now+120;nextBlink=now+4900+Math.random()*1700;}
    eyes.classList.toggle('is-blinking',!motion.matches&&now<blinkUntil);
    requestFrame();
  }
  function requestFrame(){if(!raf&&!root.hidden&&!document.hidden)raf=requestAnimationFrame(tick);}
  face.addEventListener('click',()=>{fire('click');panel.hidden?show(window.scrollY+innerHeight>=document.documentElement.scrollHeight-150?'bottom':context):close();});
  $('#assistant-close').addEventListener('click',()=>close(true));top.addEventListener('click',startTrip);action.addEventListener('click',()=>close());
  root.addEventListener('pointerenter',()=>{hovered=true;fire('enter');});root.addEventListener('pointerleave',()=>{hovered=false;fire('exit');nextFlight=Math.max(nextFlight,performance.now()+1200);});
  root.addEventListener('focusin',()=>{focus=true;fire('focus');});root.addEventListener('focusout',()=>queueMicrotask(()=>{focus=root.contains(document.activeElement);if(!focus){fire('blur');nextFlight=performance.now()+1800;}}));
  document.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};fire('pointer');},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointer=null;hovered=false;fire('leave');});
  document.addEventListener('keydown',e=>{fire('wake');if(e.key==='Escape'&&!panel.hidden){close(root.contains(document.activeElement));}if(['PageUp','PageDown','Home','End','ArrowUp','ArrowDown',' '].includes(e.key))cancelTrip();});
  for(const event of ['wheel','touchstart'])document.addEventListener(event,cancelTrip,{passive:true});
  document.addEventListener('click',e=>{if(!root.contains(e.target)&&!panel.hidden&&!returnTrip)close();});
  $('#hide-assistant').addEventListener('click',()=>{cancelTrip();close();root.hidden=true;restore.hidden=false;cancelAnimationFrame(raf);raf=0;try{sessionStorage.setItem(storageKey,'1');}catch{}restore.focus();});
  function summonBuddy(){
    root.hidden=false;restore.hidden=true;try{sessionStorage.removeItem(storageKey);}catch{}
    cancelTrip();position=keepInside({x:Math.min(innerWidth-115,innerWidth*.77),y:innerWidth>820?155:105},bounds(viewport(),size()));target={...position};velocity={x:0,y:0};
    paint();requestFrame();face.focus({preventScroll:true});show(context);
  }
  restore.addEventListener('click',summonBuddy);summon.addEventListener('click',summonBuddy);summon.hidden=false;
  document.addEventListener('moku:gallery-close',()=>close());
  function onScroll(){
    scrollFrame=0;if(returnTrip||root.hidden)return;
    const max=document.documentElement.scrollHeight-innerHeight,atBottom=max>150&&scrollY>=max-110;
    if(atBottom&&!bottomSeen&&!$('#lightbox').open){bottomSeen=true;show('bottom',true);}
    if(!atBottom&&scrollY<max-320){bottomSeen=false;if(mode==='bottom')close();}
  }
  window.addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(onScroll);},{passive:true});
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){context=entry.target.id;if(!seen.has(context)&&panel.hidden&&!focus&&!hovered&&performance.now()-lastTip>18000){seen.add(context);show(context,true);}}
  },{rootMargin:'-20% 0px -35% 0px',threshold:0});
  ['features','screenshots','questions','download'].forEach(id=>observer.observe($('#'+id)));
  window.addEventListener('resize',()=>{cancelTrip();position=keepInside(position,bounds(viewport(),size()));target=keepInside(target,bounds(viewport(),size()));paint();},{passive:true});
  motion.addEventListener('change',()=>{cancelTrip();target={...position};velocity={x:0,y:0};});
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{fire('wake');requestFrame();}});
  let hidden=false;try{hidden=sessionStorage.getItem(storageKey)==='1';}catch{}
  root.hidden=hidden;restore.hidden=!hidden;position=keepInside(position,bounds(viewport(),size()));paint();root.dataset.ready='true';requestFrame();
  setTimeout(()=>{if(!root.hidden&&panel.hidden&&!focus&&!hovered&&scrollY<200)show('hello',true);},5500);
  let intentTimer;
  for(const el of document.querySelectorAll('[data-download],.navigation a,.screenshot-button')){
    const hint=()=>{clearTimeout(intentTimer);intentTimer=setTimeout(()=>{if(performance.now()-lastTip<8000||!panel.hidden||returnTrip)return;const key=el.hasAttribute('data-download')?'download':el.classList.contains('screenshot-button')?'screenshots':el.getAttribute('href').slice(1);show(key,true);},550);};
    el.addEventListener('pointerenter',hint);el.addEventListener('focus',hint);el.addEventListener('pointerleave',()=>clearTimeout(intentTimer));el.addEventListener('blur',()=>clearTimeout(intentTimer));
  }
  return {close};
}
