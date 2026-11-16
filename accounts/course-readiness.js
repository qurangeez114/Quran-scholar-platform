// Browser-side publish checks. The database is the authority (see supabase/migrations/20261116090000_* and 20261116120000_*);
// these checks give instructors the same answers before they press Publish. Keep the rules here in step with the SQL.
const HTTPS_URL=/^https:\/\/[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+(:[0-9]{1,5})?([/?#][^\s]*)?$/;

export function isValidHttpsVideoUrl(url){
  return typeof url==='string'&&url.length<=2048&&HTTPS_URL.test(url);
}

export function courseReadiness(lessons, quizzes=[], assignments=[]) {
  const issues=[];
  if(!lessons.length)issues.push('Add at least one lesson.');
  for(const lesson of lessons){
    const label=lesson.title||'Untitled lesson';
    if(!lesson.title?.trim())issues.push('Give every lesson a title.');
    if(lesson.lesson_type==='text'&&!lesson.content?.trim())issues.push(label+': add reading content.');
    if(lesson.lesson_type==='video'&&!isValidHttpsVideoUrl(lesson.video_url))issues.push(label+': add a valid HTTPS video link.');
    if(lesson.lesson_type==='assignment'&&!assignments.some(a=>a.lesson_id===lesson.id&&String(a.instructions??'').trim()))issues.push(label+': add assignment instructions.');
    if(lesson.lesson_type==='quiz'){
      const quiz=quizzes.find(q=>q.lesson_id===lesson.id);
      if(!quiz||!Array.isArray(quiz.questions)||!quiz.questions.length){issues.push(label+': add quiz questions.');continue;}
      if(Number(quiz.passing_score)!==90)issues.push(label+': set the passing score to 90%.');
      quiz.questions.forEach((q,i)=>{
        const prefix=label+', question '+(i+1)+': ';
        if(!q||typeof q!=='object'){issues.push(prefix+'the question is malformed.');return;}
        if(!String(q.question||q.q||'').trim())issues.push(prefix+'add question text.');
        const options=Array.isArray(q.options)?q.options:null;
        const choicesOk=options&&options.length>=2&&options.every(o=>typeof o==='string'&&o.trim());
        if(!choicesOk||typeof q.correct_answer!=='string'||!options.includes(q.correct_answer))issues.push(prefix+'complete choices and select the correct answer.');
        if(!String(q.explanation??'').trim())issues.push(prefix+'explain the correct answer.');
      });
    }
  }
  return issues;
}

export async function loadCourseReadiness(db,courseId) {
  const {data:lessons,error}=await db.from('qh_lessons').select('*').eq('course_id',courseId);
  if(error)throw error;
  if(!lessons.length)return courseReadiness([]);
  const ids=lessons.map(l=>l.id);
  const [quizzes,assignments]=await Promise.all([
    db.from('qh_quizzes').select('lesson_id,questions,passing_score').in('lesson_id',ids),
    db.from('qh_assignments').select('lesson_id,instructions').in('lesson_id',ids)
  ]);
  if(quizzes.error)throw quizzes.error;if(assignments.error)throw assignments.error;
  return courseReadiness(lessons,quizzes.data,assignments.data);
}
