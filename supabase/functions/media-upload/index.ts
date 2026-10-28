import {createDeadlineFetch} from '../_shared/deadline-fetch.ts';
import {createClient} from '@supabase/supabase-js';
import {createMediaHandler} from '../_shared/media-handler.ts';
import {validateImageBytes} from '../_shared/decode-image.ts';
import {createSupabaseMediaBackend,verifyMediaActor} from '../_shared/supabase-media-backend.ts';
function configuredKey(jsonName:string,fallback:string):string{
 const raw=Deno.env.get(jsonName);if(raw){const keys=JSON.parse(raw);if(typeof keys.default==='string' && keys.default)return keys.default;}
 const value=Deno.env.get(fallback);if(!value)throw new Error('Required server configuration is missing.');return value;
}
Deno.serve(createMediaHandler({
 decode:validateImageBytes,
 backend:async authorization=>{
  try{
   const url=Deno.env.get('SUPABASE_URL');if(!url)throw new Error('Missing server URL.');
   const upstream=createDeadlineFetch();
   const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};
   const user=createClient(url,configuredKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY'),{auth,global:{fetch:upstream,headers:{Authorization:authorization}}});
   const verified=await verifyMediaActor(user,authorization);if(!verified.ok)return verified;
   const admin=createClient(url,configuredKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'),{auth,global:{fetch:upstream}});
   return {ok:true,value:createSupabaseMediaBackend(user,admin)};
  }catch{return {ok:false,error:{code:'NETWORK',message:'The upload service could not be initialized. Keep the original and try again later.'}};}
 },
}));
