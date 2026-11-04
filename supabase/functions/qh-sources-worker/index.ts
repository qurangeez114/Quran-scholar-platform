// QuranHikma unpublished source-screening worker.
// Invoked only with Supabase service-role JWT. Requires OPENAI_API_KEY secret.
// Never inserts into ancient_sources or changes Stories/public visibility.
import { createClient } from "npm:@supabase/supabase-js@2.110.0";

const encoder = new TextEncoder();
function sameSecret(a: string, b: string): boolean {
  const x=encoder.encode(a), y=encoder.encode(b);
  let diff=x.length^y.length;
  for(let i=0;i<Math.max(x.length,y.length);i++) diff |= (x[i]??0)^(y[i]??0);
  return diff===0;
}
function respond(status:number, body:unknown) {
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}
const responseFormat={
  type:"json_schema",name:"quran_sources_screen",strict:true,
  schema:{
    type:"object",additionalProperties:false,
    properties:{
      verse_summary:{type:"string"},
      assessment:{type:"string",enum:["candidate_identified","no_specific_candidate_found","further_research_needed"]},
      candidates:{type:"array",items:{
        type:"object",additionalProperties:false,
        properties:{
          work:{type:"string"},locator:{type:"string"},historical_era:{type:"string"},
          relationship:{type:"string",enum:["narrative","legal","thematic","linguistic","historical"]},
          similarities:{type:"string"},differences:{type:"string"},
          evidence_limits:{type:"string"},suggested_primary_url:{type:"string"}
        },
        required:["work","locator","historical_era","relationship","similarities","differences","evidence_limits","suggested_primary_url"]
      }},
      next_questions:{type:"array",items:{type:"string"}}
    },
    required:["verse_summary","assessment","candidates","next_questions"]
  }
} as const;

Deno.serve(async (req:Request) => {
  if(req.method!=="POST")return respond(405,{error:"POST required"});
  const url=Deno.env.get("SUPABASE_URL")||"";
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const aiKey=Deno.env.get("OPENAI_API_KEY")||"";
  if(!service||!url)return respond(503,{error:"Supabase service credentials unavailable"});
  const supplied=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!sameSecret(supplied,service))return respond(403,{error:"Service role authorization required"});
  if(!aiKey)return respond(503,{error:"OPENAI_API_KEY not configured; no verse claimed"});
  const model=Deno.env.get("QH_RESEARCH_MODEL")||"gpt-4.1-mini";
  const maxDaily=Math.min(120,Math.max(1,Number(Deno.env.get("QH_MAX_DAILY_SCREENS")||"60")||60));
  const sb=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  // Budget on successful preliminary drafts only. Other calls can fail and incur partial tokens;
  // monitor provider spend separately.
  const since=new Date(); since.setUTCHours(0,0,0,0);
  const {count,error:countError}=await sb.from("qh_source_screening_drafts")
    .select("sura",{head:true,count:"exact"}).gte("created_at",since.toISOString());
  if(countError)return respond(500,{error:"Cannot read daily safety budget"});
  if((count||0)>=maxDaily)return respond(200,{status:"daily_cap_reached",completed_today:count,cap:maxDaily});

  const {data:work,error:claimError}=await sb.rpc("qh_source_claim",{p_max:1});
  if(claimError)return respond(500,{error:"Queue claim failed",hint:claimError.message.slice(0,200)});
  if(!work?.length)return respond(200,{status:"queue_empty_or_waiting"});
  const row=work[0], key={p_sura:row.sura,p_aya:row.aya,p_lease_token:row.lease_token};
  try {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),100000);
    let response:Response;
    try{
      response=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",signal:controller.signal,
        headers:{"Authorization":'Bearer '+aiKey,"Content-Type":"application/json"},
        body:JSON.stringify({
          model,store:false,max_output_tokens:1100,
          text:{format:responseFormat},
          instructions:"You are a cautious comparative historian screening Qur'anic verses for earlier, demonstrably pre-Islamic primary literature. This is only a triage pass: you have NO live source retrieval tool, and MUST NOT claim that you checked a manuscript, edition, website, or original passage. Candidates are hypotheses only. Prefer zero candidates to generic religious resemblance. Mention exact likely historical work+section ONLY when confident. No dependence/copying assertions. Dates must be qualified. Never treat model suggestions as verified citations. Limit candidates to 2. Answer only the specified JSON schema.",
          input:[{role:"user",content:'Screen Qur’an '+row.sura+':'+row.aya+
            '\nArabic: '+String(row.arabic||"").slice(0,1200)+
            '\nEnglish: '+String(row.english||"").slice(0,1400)}]
        })
      });
    }finally{clearTimeout(timeout)}
    if(!response.ok)throw Error('Provider HTTP '+response.status);
    const body=await response.json();
    if(body.status!=="completed")throw Error('Provider response incomplete');
    const raw=(body.output||[]).flatMap((v:{content?:{type?:string;text?:string}[]})=>v.content||[])
      .find((v:{type?:string})=>v.type==="output_text")?.text;
    if(!raw)throw Error("No structured research output");
    const parsed=JSON.parse(raw);
    if(!["candidate_identified","no_specific_candidate_found","further_research_needed"].includes(parsed.assessment)
      || !Array.isArray(parsed.candidates) || parsed.candidates.length>2) throw Error("Invalid source screening schema");
    const result={
      ...parsed,candidates:parsed.candidates,
      provenance:{stage:"unverified_ai_triage_only",primary_text_checked:false,
        citation_verified:false,provider_model:model,provider_response_id:body.id,
        verse_key:row.sura+":"+row.aya,reviewed_by_human:false}
    };
    const {data:ok,error:finishError}=await sb.rpc("qh_source_finish",{
      ...key,p_model:model,p_result:result
    });
    if(finishError||ok!==true)throw Error('Draft write failed or lease expired');
    return respond(200,{status:"drafted_unverified",verse:row.sura+":"+row.aya,
      candidate_count:parsed.candidates.length});
  }catch(e){
    const reason=e instanceof Error?e.message:"unknown";
    await sb.rpc("qh_source_fail",{...key,p_reason:reason.slice(0,200)});
    return respond(502,{status:"retry_scheduled",verse:row.sura+":"+row.aya,error:reason.slice(0,100)});
  }
});
