const UPSTREAM = 'https://claimlens-tw.gun3133.chatgpt.site';
const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const destination = new URL(incoming.pathname + incoming.search, UPSTREAM);
    const headers = new Headers(request.headers);
    headers.delete('x-claimlens-client-ip');
    headers.delete('x-claimlens-client-time');
    headers.delete('x-claimlens-client-signature');
    const ip = request.headers.get('cf-connecting-ip');
    if (env.PROXY_SHARED_SECRET && ip) {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PROXY_SHARED_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}\n${ip}`));
      headers.set('x-claimlens-client-ip', ip);
      headers.set('x-claimlens-client-time', timestamp);
      headers.set('x-claimlens-client-signature', encode(new Uint8Array(signature)));
    }
    try {
      const upstream = await fetch(new Request(destination, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body, redirect: 'manual' }));
      const location = upstream.headers.get('location');
      if (!location) return upstream;
      const responseHeaders = new Headers(upstream.headers);
      const redirect = new URL(location, UPSTREAM);
      if (redirect.origin === UPSTREAM) {
        redirect.host = incoming.host;
        redirect.protocol = incoming.protocol;
        responseHeaders.set('location', redirect.toString());
      }
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch (error) {
      console.error(JSON.stringify({ event: 'proxy_error', message: error?.message }));
      return new Response('網站暫時無法連線，請稍後再試。', { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
    }
  }
};
