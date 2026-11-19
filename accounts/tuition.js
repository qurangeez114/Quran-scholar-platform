// Shared display and form helpers for instructor-set course tuition.
// Default is Free. A paid course needs a positive amount and a 3-letter currency.

export function isPaidTuition(course){
  return !!(course && course.tuition_type==='paid'
    && course.tuition_amount!=null && Number(course.tuition_amount)>0);
}

export function formatTuition(course){
  if(!isPaidTuition(course))return 'Free';
  const amount=Number(course.tuition_amount);
  const currency=String(course.tuition_currency||'USD').trim().toUpperCase()||'USD';
  try{
    return new Intl.NumberFormat('en-US',{style:'currency',currency,currencyDisplay:'symbol'}).format(amount);
  }catch{
    return currency+' '+amount.toFixed(2);
  }
}

export function tuitionFieldsFromInput(type,amount,currency){
  if(String(type||'free')!=='paid'){
    return {tuition_type:'free',tuition_amount:null,tuition_currency:'USD',tuition:'Free'};
  }
  const n=Number(amount);
  if(!Number.isFinite(n)||n<=0){
    throw new Error('Enter a tuition amount greater than 0, or choose Free.');
  }
  const curr=String(currency||'USD').trim().toUpperCase();
  if(!/^[A-Z]{3}$/.test(curr)){
    throw new Error('Tuition currency must be a 3-letter code, such as USD.');
  }
  const fields={tuition_type:'paid',tuition_amount:n,tuition_currency:curr};
  fields.tuition=formatTuition(fields);
  return fields;
}
