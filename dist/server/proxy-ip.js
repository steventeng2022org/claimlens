const decode = value => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), character => character.charCodeAt(0));

export async function clientIp(request, env) {
  const fallback = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!env.PROXY_SHARED_SECRET) return fallback;
  const ip = request.headers.get('x-claimlens-client-ip');
  const timestamp = request.headers.get('x-claimlens-client-time');
  const signature = request.headers.get('x-claimlens-client-signature');
  if (!ip || ip.length > 80 || !/^\d{10}$/.test(timestamp || '') || !signature) return fallback;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 60) return fallback;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PROXY_SHARED_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const data = new TextEncoder().encode(`${timestamp}\n${ip}`);
    return await crypto.subtle.verify('HMAC', key, decode(signature), data) ? ip : fallback;
  } catch {
    return fallback;
  }
}
