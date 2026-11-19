// Syllabus checks apply only when the academic-standards columns exist
// (migrations/20261104_academic_standards.sql). The server applies the same rule
// (supabase/migrations/20261116130000_publish_requires_syllabus.sql).
const nonEmptyList=v=>{if(typeof v==='string'){try{v=JSON.parse(v);}catch{return !!v.trim();}}return Array.isArray(v)&&v.some(x=>typeof x==='string'?x.trim():x&&typeof x==='object'&&String(x.text||x.topic||'').trim());};
export function syllabusIssues(course) {
  if(!course||!('syllabus' in course))return [];
  const issues=[];
  if(!nonEmptyList(course.learning_outcomes))issues.push('Syllabus: add at least one learning outcome.');
  const s=course.syllabus&&typeof course.syllabus==='object'?course.syllabus:{};
  if(!nonEmptyList(s.weekly_schedule))issues.push('Syllabus: add the weekly schedule.');
  return issues;
}

// Grouped checklist for the instructor: what is done and what is still missing.
export function publishChecklist(lessons, quizzes=[], assignments=[], course=null) {
  const lessonIssues=courseReadiness(lessons,quizzes,assignments).filter(x=>x!=='Add at least one lesson.');
  const items=[
    {key:'lessons',label:'At least one lesson',ok:lessons.length>0,issues:lessons.length?[]:['Open Lessons and choose Create New Lesson.']},
    {key:'content',label:'Every lesson is complete (reading text, HTTPS video link, quiz questions with a 90% pass mark, assignment instructions)',ok:lessons.length>0&&!lessonIssues.length,issues:lessonIssues}
  ];
  if(course&&'syllabus' in course){
    const si=syllabusIssues(course);
    items.push({key:'syllabus',label:'Syllabus: learning outcomes and weekly schedule',ok:!si.length,issues:si});
  }
  return items;
}

export function courseReadiness(lessons, quizzes=[], assignments=[], course=null) {
  const issues=[...syllabusIssues(course)];
  if(!lessons.length)issues.push('Add at least one lesson.');
  for(const lesson of lessons){
    const label=lesson.title||'Untitled lesson';
    if(!lesson.title?.trim())issues.push('Give every lesson a title.');
    if(lesson.lesson_type==='text'&&!lesson.content?.trim())issues.push(label+': add reading content.');
    if(lesson.lesson_type==='video'){
      try{const url=new URL(lesson.video_url);if(url.protocol!=='https:')throw Error();}
      catch{issues.push(label+': add a valid HTTPS video link.');}
    }
    if(lesson.lesson_type==='assignment'&&!assignments.some(a=>a.lesson_id===lesson.id))issues.push(label+': add assignment instructions.');
    if(lesson.lesson_type==='quiz'){
      const quiz=quizzes.find(q=>q.lesson_id===lesson.id);
      if(!quiz||!Array.isArray(quiz.questions)||!quiz.questions.length){issues.push(label+': add quiz questions.');continue;}
      if(Number(quiz.passing_score)!==90)issues.push(label+': set the passing score to 90%.');
      quiz.questions.forEach((q,i)=>{
        const prefix=label+', question '+(i+1)+': ';
        if(!(q.question||q.q)?.trim())issues.push(prefix+'add question text.');
        if(!Array.isArray(q.options)||q.options.length<2||q.options.some(o=>!String(o).trim())||!q.options.includes(q.correct_answer))issues.push(prefix+'complete choices and select the correct answer.');
        if(!q.explanation?.trim())issues.push(prefix+'explain the correct answer.');
      });
    }
  }
  return issues;
}

export async function loadCourseReadiness(db,courseId) {
  const [{data:lessons,error},courseRes]=await Promise.all([
    db.from('qh_lessons').select('*').eq('course_id',courseId),
    db.from('qh_courses').select('*').eq('id',courseId).maybeSingle()
  ]);
  if(error)throw error;
  const course=courseRes&&!courseRes.error?courseRes.data:null;
  const finish=(q=[],a=[])=>{const issues=courseReadiness(lessons,q,a,course);issues.checklist=publishChecklist(lessons,q,a,course);return issues;};
  if(!lessons.length)return finish();
  const ids=lessons.map(l=>l.id);
  const [quizzes,assignments]=await Promise.all([
    db.from('qh_quizzes').select('lesson_id,questions,passing_score').in('lesson_id',ids),
    db.from('qh_assignments').select('lesson_id').in('lesson_id',ids)
  ]);
  if(quizzes.error)throw quizzes.error;if(assignments.error)throw assignments.error;
  return finish(quizzes.data,assignments.data);
}
