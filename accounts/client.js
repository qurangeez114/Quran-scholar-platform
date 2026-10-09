import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
export const db=createClient('https://ylosytbxpzxzwfzjpaej.supabase.co',"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs");
export async function user(){const {data,error}=await db.auth.getUser();if(error||!data.user)throw Error('Please log in to continue.');return data.user;}
export function message(text){document.getElementById('status').textContent=text;}
export async function exportResearch(){await user();const {data,error}=await db.from('qh_research').select('*');if(error)throw error;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='quranhikma-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
