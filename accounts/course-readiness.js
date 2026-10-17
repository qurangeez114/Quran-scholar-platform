export function courseReadiness(lessons, quizzes=[], assignments=[]) {
  const issues=[];
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
  const {data:lessons,error}=await db.from('qh_lessons').select('*').eq('course_id',courseId);
  if(error)throw error;
  if(!lessons.length)return courseReadiness([]);
  const ids=lessons.map(l=>l.id);
  const [quizzes,assignments]=await Promise.all([
    db.from('qh_quizzes').select('lesson_id,questions,passing_score').in('lesson_id',ids),
    db.from('qh_assignments').select('lesson_id').in('lesson_id',ids)
  ]);
  if(quizzes.error)throw quizzes.error;if(assignments.error)throw assignments.error;
  return courseReadiness(lessons,quizzes.data,assignments.data);
}
