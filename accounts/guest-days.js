export const KEY = 'qh-guest-days-v1';
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function recordDay(storage, today = localDay()) {
  let state = {};
  try { state = JSON.parse(storage.getItem(KEY) || '{}') || {}; } catch {}
  const days = Array.isArray(state.days) ? [...new Set(state.days.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(0,5) : [];
  const completedBeforeVisit = days.length >= 5;
  if (!days.includes(today) && days.length < 5) days.push(today);
  const result = {days, dismissedOn: state.dismissedOn || null};
  try { storage.setItem(KEY, JSON.stringify(result)); } catch {}
  return {...result, shouldRemind: completedBeforeVisit && today > days[4] && state.dismissedOn !== today};
}
export function dismissToday(storage, today = localDay()) {
  const state = recordDay(storage, today);
  try { storage.setItem(KEY, JSON.stringify({days: state.days, dismissedOn: today})); } catch {}
}
