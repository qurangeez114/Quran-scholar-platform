// How a course is taught (instructor's choice), stored in qh_courses.class_format.
// Null means the instructor has not chosen yet; no badge is shown then.
export const CLASS_FORMATS=[
  ['video_text','Video + text'],
  ['video','Video lessons'],
  ['text','Text / reading'],
  ['live','Live online classes'],
  ['audio','Audio lessons'],
  ['blended','Mixed / blended']
];
export const DEFAULT_CLASS_FORMAT='video_text';

export function classFormatLabel(value){
  const hit=CLASS_FORMATS.find(([v])=>v===value);
  return hit?hit[1]:'';
}

export function normalizeClassFormat(value){
  const v=String(value||'').trim();
  if(!v)return null;
  if(!CLASS_FORMATS.some(([k])=>k===v))throw new Error('Choose a class format from the list.');
  return v;
}

export function fillClassFormatSelect(select,selected){
  if(!select)return;
  const cur=selected||DEFAULT_CLASS_FORMAT;
  select.innerHTML=CLASS_FORMATS.map(([v,l])=>'<option value="'+v+'"'+(v===cur?' selected':'')+'>'+l+'</option>').join('');
}

// Missing column (migration not yet applied) — lets saves fall back safely.
export function isMissingClassFormatColumn(error){
  const m=String(error&&(error.message||error.details||error.hint)||'');
  return /class_format/.test(m)&&(error.code==='PGRST204'||error.code==='42703'||/column|schema cache/i.test(m));
}
