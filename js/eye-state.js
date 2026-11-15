/** Small explicit state machine: every expression has a reason, no random flight. */
export const IDLE_AFTER = 22000;
export const HAPPY_FOR = 1300;
export function createEyeState(now = 0) {
  return { lastActivity: now, happyUntil: 0, pointerActive: false, hovered: false, focused: false };
}
export function updateEyeState(state, event, now) {
  switch (event) {
    case 'pointer': return { ...state, pointerActive: true, lastActivity: now };
    case 'leave': return { ...state, pointerActive: false, hovered: false };
    case 'enter': return { ...state, hovered: true, lastActivity: now };
    case 'exit': return { ...state, hovered: false };
    case 'focus': return { ...state, focused: true, lastActivity: now };
    case 'blur': return { ...state, focused: false };
    case 'click': return { ...state, lastActivity: now, happyUntil: now + HAPPY_FOR };
    case 'wake': return { ...state, lastActivity: now };
    default: return state;
  }
}
export function eyeMood(state, now) {
  if (now < state.happyUntil) return 'happy';
  if (now - state.lastActivity >= IDLE_AFTER && !state.focused) return 'sleepy';
  if (state.hovered || state.focused) return 'curious';
  return state.pointerActive ? 'tracking' : 'neutral';
}
export function gazeForPoint(pointer, rect, maxX = 4.5, maxY = 3) {
  if (!pointer || !rect || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return { x: 0, y: 0 };
  const dx = pointer.x - (rect.left + rect.width / 2);
  const dy = pointer.y - (rect.top + rect.height / 2);
  return { x: Math.tanh(dx / 200) * maxX, y: Math.tanh(dy / 170) * maxY };
}
export function springStep(value, velocity, target, elapsed) {
  if (![value, velocity, target, elapsed].every(Number.isFinite)) return { value: Number.isFinite(target) ? target : 0, velocity: 0 };
  const dt = Math.min(0.034, Math.max(0, elapsed));
  // Near-critical damping: soft, bounded movement without jelly oscillation.
  const count = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / count;
  for (let i = 0; i < count; i++) {
    velocity += ((target - value) * 155 - velocity * 24) * h;
    value += velocity * h;
  }
  if (Math.abs(target - value) < 0.003 && Math.abs(velocity) < 0.01) return { value: target, velocity: 0 };
  return { value, velocity };
}
