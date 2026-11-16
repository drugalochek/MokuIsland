const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
export function bounds(viewport, size) {
  return {left:12, top:Math.min(90, Math.max(12, viewport.height * .15)), right:Math.max(12, viewport.width-size.width-12), bottom:Math.max(12, viewport.height-size.height-16)};
}
export function keepInside(point, area) { return {x:clamp(point.x, area.left, area.right), y:clamp(point.y, area.top, area.bottom)}; }
export function chooseDestination(current, viewport, size, obstacles = [], pointer = null, random = Math.random) {
  const area=bounds(viewport,size), options=[];
  for(let row=0;row<5;row++) for(let col=0;col<7;col++) {
    const p=keepInside({x:area.left+(area.right-area.left)*(col+.3+random()*.4)/7,y:area.top+(area.bottom-area.top)*(row+.25+random()*.5)/5},area);
    const distance=Math.hypot(p.x-current.x,p.y-current.y);
    let score=Math.min(distance, viewport.width*.6)*.16 + random()*25;
    if(distance<Math.min(160,viewport.width*.35))score-=180;
    for(const r of obstacles) {
      const overlap=Math.max(0,Math.min(p.x+size.width+8,r.right)-Math.max(p.x-8,r.left))*Math.max(0,Math.min(p.y+size.height+8,r.bottom)-Math.max(p.y-8,r.top));
      score-=overlap*.2;
    }
    if(pointer && Math.hypot(p.x+size.width/2-pointer.x,p.y+size.height/2-pointer.y)<160)score-=300;
    options.push({...p,score});
  }
  options.sort((a,b)=>b.score-a.score);return {x:options[0].x,y:options[0].y};
}
export function flightStep(position, velocity, target, elapsed) {
  let p=position,v=velocity; const dt=clamp(elapsed,0,.05),steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
  for(let i=0;i<steps;i++){v+=((target-p)*8-v*5.7)*h;p+=v*h;}
  return Math.abs(target-p)<.08&&Math.abs(v)<.15 ? {value:target,velocity:0}:{value:p,velocity:v};
}
export function balloonOffset(position,size,panel,viewport) {
  const x=clamp(position.x+size.width/2-panel.width/2,12,Math.max(12,viewport.width-panel.width-12));
  const above=position.y-panel.height-13;
  const y=above>=12?above:clamp(position.y+size.height+13,12,Math.max(12,viewport.height-panel.height-12));
  return {x:x-position.x,y:y-position.y};
}
export const easeInOut = t => t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
