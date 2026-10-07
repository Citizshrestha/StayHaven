export function validateProductionBuild(env, options = {}) {
  for (const [key, value] of Object.entries(env)) {
    if (value && key.startsWith('VITE_') && /SECRET|PASSWORD|PRIVATE_KEY/i.test(key)) {
      throw new Error(key + ' is a server secret and must not be exposed in a browser build');
    }
  }
  const stripe = env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (stripe && !/^pk_(test|live)_/.test(stripe)) throw new Error('VITE_STRIPE_PUBLISHABLE_KEY must be a publishable Stripe key');
  if (stripe?.startsWith('pk_test_') && !options.allowTestKeys) {
    throw new Error('Refusing production build with a Stripe test key. Configure a live key, or explicitly set ALLOW_TEST_PAYMENT_KEYS_IN_PROD_BUILD=true for sandbox validation only.');
  }
  const base = env.VITE_API_BASE_URL;
  if (!base) throw new Error('VITE_API_BASE_URL must explicitly identify the deployed API');
  for (const key of ['VITE_API_BASE_URL', 'VITE_API_URL', 'VITE_SOCKET_URL']) {
    if (!env[key]) continue;
    let url;
    try { url = new URL(env[key]); } catch { throw new Error(key + ' must be an absolute URL'); }
    if (url.username || url.password || url.search || url.hash) throw new Error(key + ' must not contain credentials, query parameters or fragments');
    const local = ['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(url.hostname);
    if (!options.allowLocalApi && (url.protocol !== 'https:' || local)) throw new Error(key + ' must use a non-local HTTPS URL for deployment');
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(key + ' must use HTTP(S)');
    if (key !== 'VITE_API_URL' && url.pathname !== '/') throw new Error(key + ' must be an origin without an API path');
  }
}
