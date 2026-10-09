// STAGING CONFIG - For testing only
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
export const db=createClient('https://weegzqzxbqeeokkiifpt.supabase.co',"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlZWd6cXp4YnFlZW9ra2lpZnB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTI1MDksImV4cCI6MjA4MTE2ODUwOX0.glav1HW9MEEjuae-2Ndq-V0uyyYKrLaJdGwbdxYFArA");
export async function user(){const {data,error}=await db.auth.getUser();if(error||!data.user)throw Error('Please log in to continue.');return data.user;}
export function message(text){document.getElementById('status').textContent=text;}
export async function exportResearch(){await user();const {data,error}=await db.from('qh_research').select('*');if(error)throw error;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='quranhikma-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
