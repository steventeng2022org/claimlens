import { adminPage } from './admin-page.js';

const REPORT_TTL_SECONDS = 30 * 86400;
const securityHeaders = {'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY'};
const respond = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{...securityHeaders,'content-type':'application/json; charset=utf-8'}});
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64url = text => Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),char=>char.charCodeAt(0));

function isAdmin(request,env) {
  return Boolean(env.ADMIN_OWNER_ID && request.headers.get('oai-authenticated-user-id')===env.ADMIN_OWNER_ID);
}

async function encryptionKey(env) {
  if(!env.ADMIN_ENCRYPTION_KEY)throw Error('Admin encryption secret is missing');
  const raw=unb64url(env.ADMIN_ENCRYPTION_KEY);
  if(raw.length!==32)throw Error('Admin encryption secret has an invalid length');
  return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
}

async function encrypt(value,env) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await encryptionKey(env),new TextEncoder().encode(value));
  return {encryptedKey:b64url(new Uint8Array(cipher)),iv:b64url(iv)};
}

async function decrypt(row,env) {
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64url(row.iv)},await encryptionKey(env),unb64url(row.encrypted_key));
  return new TextDecoder().decode(plain);
}

export async function activeApiKey(env) {
  if(!env.DB)return env.OPENAI_API_KEY;
  const row=await env.DB.prepare('SELECT encrypted_key, iv FROM api_keys WHERE active = 1 LIMIT 1').first();
  return row?decrypt(row,env):env.OPENAI_API_KEY;
}

export async function saveReport(env,payload,{sourceType,cached}) {
  const now=Math.floor(Date.now()/1000);
  const id=crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM reports WHERE created_at < ?').bind(now-REPORT_TTL_SECONDS),
    env.DB.prepare('INSERT INTO reports (id,title,report_json,analyzed_at,source_type,cached,created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(id,String(payload.report?.title||'未命名報告').slice(0,200),JSON.stringify(payload.report),Math.floor(new Date(payload.analyzedAt).getTime()/1000),sourceType,cached?1:0,now)
  ]);
}

async function parseBody(request) {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw Error('請使用 JSON 格式。');
  return request.json();
}

export async function adminFetch(request,env,url) {
  const pathname=url.pathname;
  if(pathname==='/admin') {
    if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:securityHeaders});
    if(!env.ADMIN_OWNER_ID)return new Response('Admin is not configured',{status:503,headers:securityHeaders});
    if(!request.headers.get('oai-authenticated-user-id'))return Response.redirect(new URL('/signin-with-chatgpt?return_to=%2Fadmin',url),302);
    if(!isAdmin(request,env))return new Response('Not authorized',{status:403,headers:securityHeaders});
    return new Response(adminPage,{headers:{...securityHeaders,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
  }
  if(!isAdmin(request,env))return respond({error:'沒有管理權限。'},403);
  if(!env.DB)return respond({error:'資料庫暫時無法使用。'},503);
  if(!['GET','POST','DELETE'].includes(request.method))return respond({error:'不支援的要求。'},405);
  if(request.method!=='GET' && request.headers.get('origin')!==url.origin)return respond({error:'來源驗證失敗。'},403);

  try {
    if(pathname==='/api/admin/reports' && request.method==='GET') {
      const limit=Math.floor(Math.max(1,Math.min(50,Number(url.searchParams.get('limit'))||20)));
      const offset=Math.floor(Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0)));
      const cutoff=Math.floor(Date.now()/1000)-REPORT_TTL_SECONDS;
      const total=await env.DB.prepare('SELECT COUNT(*) AS total FROM reports WHERE created_at >= ?').bind(cutoff).first();
      const results=await env.DB.prepare('SELECT id,title,analyzed_at AS analyzedAt,source_type AS sourceType,cached,created_at AS createdAt FROM reports WHERE created_at >= ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(cutoff,limit,offset).all();
      return respond({total:Number(total?.total||0),reports:results.results||[]});
    }
    const reportMatch=pathname.match(/^\/api\/admin\/reports\/([0-9a-f-]{36})$/);
    if(reportMatch && request.method==='GET') {
      const row=await env.DB.prepare('SELECT id,title,report_json,analyzed_at,source_type,cached,created_at FROM reports WHERE id = ? AND created_at >= ?').bind(reportMatch[1],Math.floor(Date.now()/1000)-REPORT_TTL_SECONDS).first();
      if(!row)return respond({error:'找不到報告。'},404);
      return respond({report:{id:row.id,title:row.title,data:JSON.parse(row.report_json),analyzedAt:row.analyzed_at,sourceType:row.source_type,cached:Boolean(row.cached),createdAt:row.created_at}});
    }
    if(reportMatch && request.method==='DELETE') {
      await env.DB.prepare('DELETE FROM reports WHERE id = ?').bind(reportMatch[1]).run();
      return respond({ok:true});
    }
    if(pathname==='/api/admin/keys' && request.method==='GET') {
      const results=await env.DB.prepare('SELECT id,label,active,created_at AS createdAt FROM api_keys ORDER BY created_at DESC').all();
      const rows=results.results||[];
      return respond({keys:[{id:'default',label:'原有 OpenAI API 金鑰',default:true,active:!rows.some(row=>row.active),createdAt:0},...rows.map(row=>({...row,active:Boolean(row.active),default:false}))]});
    }
    if(pathname==='/api/admin/keys' && request.method==='POST') {
      const body=await parseBody(request);
      const label=String(body.label||'').trim();
      const key=String(body.key||'').trim();
      if(label.length<1||label.length>80||!/^sk-[\w-]{16,1000}$/.test(key))return respond({error:'請輸入有效的名稱與 OpenAI API key。'},400);
      const encrypted=await encrypt(key,env);
      await env.DB.prepare('INSERT INTO api_keys (id,label,encrypted_key,iv,active,created_at) VALUES (?,?,?,?,0,?)').bind(crypto.randomUUID(),label,encrypted.encryptedKey,encrypted.iv,Math.floor(Date.now()/1000)).run();
      return respond({ok:true},201);
    }
    const activateMatch=pathname.match(/^\/api\/admin\/keys\/([\w-]+)\/activate$/);
    if(activateMatch && request.method==='POST') {
      if(activateMatch[1]!=='default') {
        const found=await env.DB.prepare('SELECT id FROM api_keys WHERE id = ?').bind(activateMatch[1]).first();
        if(!found)return respond({error:'找不到金鑰。'},404);
      }
      await env.DB.batch([
        env.DB.prepare('UPDATE api_keys SET active = 0 WHERE active = 1'),
        ...(activateMatch[1]==='default'?[]:[env.DB.prepare('UPDATE api_keys SET active = 1 WHERE id = ?').bind(activateMatch[1])])
      ]);
      return respond({ok:true});
    }
    const keyMatch=pathname.match(/^\/api\/admin\/keys\/([0-9a-f-]{36})$/);
    if(keyMatch && request.method==='DELETE') {
      await env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(keyMatch[1]).run();
      return respond({ok:true});
    }
    return respond({error:'找不到此管理功能。'},404);
  } catch(error) {
    console.error(JSON.stringify({event:'admin_error',message:error?.message}));
    return respond({error:'管理功能暫時無法完成要求。'},503);
  }
}
