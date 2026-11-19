import {db} from './client.js';
export async function lmsRequest(action,values={}){
 const {data,error}=await db.functions.invoke('lms-admin',{body:{action,...values}});
 if(error){let detail;try{detail=await error.context.json();}catch{}throw Error(detail?.error||error.message);}
 return data;
}
// Login URL for protected teaching pages: account.html explains why and returns here after login.
export function instructorLoginUrl(){
 return '/account.html?reason=instructor&returnTo='+encodeURIComponent(location.pathname+location.search);
}
export async function requireTeachingAccess(){
 const {data}=await db.auth.getSession();if(!data.session){location.replace(instructorLoginUrl());throw Error('Sign in required');}
 const state=await lmsRequest('session');
 if(state.account?.must_change_password){location.replace('/instructor-dashboard.html');throw Error('Change your temporary password first');}
 if(!['owner','instructor'].includes(state.role))throw Error('Instructor access required');
 return state;
}
