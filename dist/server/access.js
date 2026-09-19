const decode = value => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), character => character.charCodeAt(0));
const jsonPart = value => JSON.parse(new TextDecoder().decode(decode(value)));

export async function verifiedAccessEmail(request, env) {
  const issuer = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  if (!issuer || !audience) return null;
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 8192) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = jsonPart(parts[0]);
    const payload = jsonPart(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) return null;
    if (payload.iss !== issuer || !(Array.isArray(payload.aud) ? payload.aud.includes(audience) : payload.aud === audience)) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= now || (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf > now))) return null;
    if (typeof payload.email !== 'string' || !payload.email) return null;
    const certificateUrl = new URL('/cdn-cgi/access/certs', issuer);
    if (certificateUrl.origin !== issuer) return null;
    const response = await fetch(certificateUrl, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    const keys = await response.json();
    const jwk = keys.keys?.find(key => key.kid === header.kid && key.kty === 'RSA' && key.use === 'sig');
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const bytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), bytes))) return null;
    return payload.email.toLowerCase();
  } catch {
    return null;
  }
}
