// Lesson reflection: shows the instructor's optional written prompt under a lesson.
// Students write/save their own answer; the course owner and staff see every student's answer.
import { supabase } from './accounts/client.js';

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'style') n.style.cssText = v; else if (k in n) n[k] = v; else n.setAttribute(k, v);
  }
  for (const k of kids) n.append(k);
  return n;
}

export async function renderLessonReflection({ lesson, course, user, isManager = false, preview = false, anchor }) {
  if (!lesson || !anchor) return;
  const { data: prompt, error } = await supabase.from('qh_lesson_reflection_prompts')
    .select('prompt').eq('lesson_id', lesson.id).maybeSingle();
  if (error || !prompt?.prompt) return;

  const section = el('section', { className: 'lesson-reflection', id: 'lessonReflection',
    style: 'margin:1.5rem 0;padding:1rem 1.25rem;border:1px solid #d9e3e3;border-left:4px solid #175e61;border-radius:8px;background:#fbfdfd' });
  section.setAttribute('aria-labelledby', 'lessonReflectionHeading');
  section.append(el('h3', { id: 'lessonReflectionHeading', textContent: 'Reflection', style: 'margin:0 0 .5rem' }));
  section.append(el('p', { textContent: prompt.prompt, style: 'white-space:pre-wrap;line-height:1.55;margin:0 0 .75rem' }));
  anchor.after(section);

  if (isManager && !preview) {
    section.append(el('h4', { textContent: 'Student answers', style: 'margin:.75rem 0 .25rem' }));
    const list = el('div', { id: 'reflectionAnswers', textContent: 'Loading answers…' });
    section.append(list);
    const { data, error: e2 } = await supabase.rpc('qh_lesson_reflection_answers', { p_lesson: lesson.id });
    list.textContent = '';
    if (e2) { list.textContent = 'Unable to load answers.'; return; }
    if (!data?.length) { list.textContent = 'No student has answered yet.'; return; }
    for (const r of data) {
      const card = el('article', { style: 'padding:.6rem 0;border-top:1px solid #e2e9e9' });
      card.append(el('strong', { textContent: r.student_name }),
        el('span', { textContent: ' · ' + new Date(r.updated_at).toLocaleString(), style: 'color:#61757a;font-size:13px' }),
        el('p', { textContent: r.answer, style: 'white-space:pre-wrap;margin:.3rem 0 0' }));
      list.append(card);
    }
    return;
  }

  const box = el('textarea', { id: 'reflectionAnswer', rows: 6, maxLength: 8000,
    placeholder: 'Write your reflection here…', style: 'width:100%;padding:.6rem;border:1px solid #b9c9cc;border-radius:6px;font:inherit' });
  box.setAttribute('aria-label', 'Your reflection');
  const save = el('button', { type: 'button', id: 'reflectionSave', className: 'btn btn-primary', textContent: 'Save reflection', style: 'margin-top:.5rem' });
  const status = el('p', { role: 'status', id: 'reflectionStatus', style: 'color:#41594b;font-size:14px;margin:.4rem 0 0' });
  status.setAttribute('aria-live', 'polite');
  section.append(box, save, status);
  if (preview) { save.disabled = true; status.textContent = 'Instructor preview: reflections are not saved.'; return; }

  const { data: mine } = await supabase.from('qh_lesson_reflections')
    .select('answer,updated_at').eq('lesson_id', lesson.id).eq('user_id', user.id).maybeSingle();
  if (mine) { box.value = mine.answer; status.textContent = 'Saved ' + new Date(mine.updated_at).toLocaleString() + '. Only you and your instructor can see it.'; }
  else status.textContent = 'Only you and your instructor can see your answer.';

  save.addEventListener('click', async () => {
    const answer = box.value.trim();
    if (!answer) { status.textContent = 'Write something before saving.'; return; }
    save.disabled = true; status.textContent = 'Saving…';
    const { error: e3 } = await supabase.from('qh_lesson_reflections').upsert(
      { lesson_id: lesson.id, course_id: course.id, user_id: user.id, answer, updated_at: new Date().toISOString() },
      { onConflict: 'lesson_id,user_id' });
    save.disabled = false;
    status.textContent = e3 ? 'Could not save: ' + e3.message : 'Reflection saved. Only you and your instructor can see it.';
  });
}
