import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnvironment, getSanitizedEnvInfo } from '../utils/envValidator.js';
const base = {
 NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1/test',
 JWT_SECRET: 'a'.repeat(64), JWT_ACCESS_SECRET: 'b'.repeat(64), JWT_REFRESH_SECRET: 'c'.repeat(64),
 CLIENT_URL: 'https://app.example.com', PORT: '3000', EMAIL_USER: 'test@example.com', EMAIL_PASS: 'private-password',
};
function withEnv(overrides, fn) {
 const previous = { ...process.env };
 try {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, base, overrides);
  return fn();
 } finally {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, previous);
 }
}
test('valid production environment and redacted email credentials', () => withEnv({}, () => {
 assert.equal(validateEnvironment().valid, true);
 assert.equal(getSanitizedEnvInfo().EMAIL_PASS, '[REDACTED]');
}));
test('rejects weak access keys, shared refresh keys, malformed ports/proxies and CORS origins', () => {
 for (const overrides of [
  { JWT_ACCESS_SECRET: 'short' }, { JWT_REFRESH_SECRET: base.JWT_ACCESS_SECRET },
  { PORT: '3000garbage' }, { PORT: '3.5' }, { TRUST_PROXY_HOPS: 'true' }, { TRUST_PROXY_HOPS: '-1' },
  { CLIENT_URL: 'http://app.example.com' }, { CLIENT_URL: 'https://app.example.com/path' },
  { CLIENT_URL: 'https://user:pass@app.example.com' }, { CLIENT_URL: '' },
 ]) withEnv(overrides, () => assert.equal(validateEnvironment().valid, false, JSON.stringify(overrides)));
});
test('permits explicit bounded proxy topology and multiple HTTPS origins', () => withEnv({ TRUST_PROXY_HOPS: '1', CLIENT_URL: 'https://a.example.com, https://b.example.com' }, () => assert.equal(validateEnvironment().valid,true)));
