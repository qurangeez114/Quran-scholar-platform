import {lmsRequest} from './lms-access.js';

export function checkedSupportUrl(value) {
  try {
    const url=new URL(value);
    const hosts=['paypal.me','www.paypal.com','paypal.com','ko-fi.com','buymeacoffee.com','www.buymeacoffee.com','patreon.com','www.patreon.com','buy.stripe.com'];
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&hosts.includes(url.hostname)&&url.pathname!=='/'?url.href:null;
  } catch { return null; }
}

export async function mountInstructorSupport(courseId,container) {
  try {
    const support=await lmsRequest('instructor_support',{course_id:courseId});
    const url=checkedSupportUrl(support?.url);
    if(!url)return;
    const section=document.createElement('section');section.className='section';section.style.marginTop='1rem';
    const title=document.createElement('h2');title.textContent='Support your instructor';
    const description=document.createElement('p');description.textContent='Optional support for '+support.name+'. Supporting an instructor does not affect enrollment, grades or certificates.';
    const destination=document.createElement('p');destination.textContent='Payment provider: '+new URL(url).hostname+'. Check the recipient on the payment page before confirming. The provider handles payments and receipts.';
    const link=document.createElement('a');link.className='btn btn-secondary';link.textContent='Support '+support.name+' ↗';link.href=url;link.target='_blank';link.rel='noopener noreferrer';
    section.append(title,description,destination,link);container.append(section);
  } catch { /* Optional support must never prevent access to learning. */ }
}
