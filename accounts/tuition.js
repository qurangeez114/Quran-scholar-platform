// Shared display and form helpers for instructor-set course tuition.
// Default is Free. A paid course needs a positive amount and a 3-letter currency.

// Currencies an instructor can charge in (ISO 4217 codes). Stored in
// qh_courses.tuition_currency; shown to students with Intl.NumberFormat.
export const TUITION_CURRENCIES=[
  ['USD','US dollar'],['EUR','Euro'],['GBP','British pound'],['CAD','Canadian dollar'],
  ['AUD','Australian dollar'],['NZD','New Zealand dollar'],['CHF','Swiss franc'],
  ['SEK','Swedish krona'],['NOK','Norwegian krone'],['DKK','Danish krone'],
  ['SAR','Saudi riyal'],['AED','UAE dirham'],['QAR','Qatari riyal'],['KWD','Kuwaiti dinar'],
  ['BHD','Bahraini dinar'],['OMR','Omani rial'],['JOD','Jordanian dinar'],
  ['EGP','Egyptian pound'],['MAD','Moroccan dirham'],['TND','Tunisian dinar'],['DZD','Algerian dinar'],
  ['TRY','Turkish lira'],['MYR','Malaysian ringgit'],['IDR','Indonesian rupiah'],['SGD','Singapore dollar'],
  ['BND','Brunei dollar'],['PKR','Pakistani rupee'],['INR','Indian rupee'],['BDT','Bangladeshi taka'],
  ['NGN','Nigerian naira'],['GHS','Ghanaian cedi'],['KES','Kenyan shilling'],['TZS','Tanzanian shilling'],
  ['UGX','Ugandan shilling'],['ETB','Ethiopian birr'],['ERN','Eritrean nakfa'],['SOS','Somali shilling'],
  ['SDG','Sudanese pound'],['ZAR','South African rand'],['XOF','West African CFA franc']
];

export function currencyOptionsHTML(selected){
  const cur=String(selected||'USD').trim().toUpperCase();
  const list=TUITION_CURRENCIES.some(([c])=>c===cur)?TUITION_CURRENCIES:[[cur,cur],...TUITION_CURRENCIES];
  return list.map(([c,n])=>'<option value="'+c+'"'+(c===cur?' selected':'')+'>'+c+' — '+n+'</option>').join('');
}

export function fillCurrencySelect(select,selected){
  if(!select)return;
  select.innerHTML=currencyOptionsHTML(selected);
}

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
