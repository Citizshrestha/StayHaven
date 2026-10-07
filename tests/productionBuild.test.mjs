import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionBuild } from '../config/productionBuild.mjs';
const valid = { VITE_API_BASE_URL: 'https://api.example.com' };
test('allows HTTPS deployment without optional card payments', () => assert.doesNotThrow(() => validateProductionBuild(valid)));
test('rejects test payments except explicit sandbox builds', () => {
 const env = { ...valid, VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_fixture' };
 assert.throws(() => validateProductionBuild(env), /test key/);
 assert.doesNotThrow(() => validateProductionBuild(env, { allowTestKeys: true }));
});
test('rejects public server secrets even with sandbox overrides', () => {
 assert.throws(() => validateProductionBuild({ ...valid, VITE_PAYMENT_SECRET: 'fixture' }, { allowTestKeys: true }), /server secret/);
 assert.throws(() => validateProductionBuild({ ...valid, VITE_STRIPE_PUBLISHABLE_KEY: 'sk_live_fixture' }), /publishable/);
});
test('rejects missing, insecure, local and malformed API origins', () => {
 assert.throws(() => validateProductionBuild({}), /VITE_API_BASE_URL/);
 for (const value of ['http://api.example.com','https://localhost','https://api.example.com/api/v1','https://user:password@api.example.com','https://api.example.com?q=x','nonsense']) {
   assert.throws(() => validateProductionBuild({ VITE_API_BASE_URL: value }), /VITE_API_BASE_URL/);
 }
 assert.doesNotThrow(() => validateProductionBuild({ VITE_API_BASE_URL: 'http://localhost:3000' }, { allowLocalApi: true }));
});
