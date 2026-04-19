#!/usr/bin/env node

/**
 * Generate Secure Secrets for StayHaven
 * 
 * This script generates cryptographically secure random secrets
 * for JWT tokens and other security-sensitive configurations.
 * 
 * Usage:
 *   node scripts/generateSecrets.js
 */

import crypto from 'crypto';

console.log('\n🔐 StayHaven - Secure Secret Generator\n');
console.log('═'.repeat(60));
console.log('\n⚠️  IMPORTANT: Keep these secrets secure and never commit them!\n');
console.log('═'.repeat(60));

// Generate JWT secrets
console.log('\n📝 JWT Secrets (copy these to your Backend/.env file):\n');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('JWT_ACCESS_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'));

// Generate session secret
console.log('\n📝 Session Secret:\n');
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));

// Generate API key
console.log('\n📝 Internal API Key (if needed):\n');
console.log('API_KEY=' + crypto.randomBytes(32).toString('hex'));

// Generate encryption key
console.log('\n📝 Encryption Key (for sensitive data):\n');
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));

console.log('\n' + '═'.repeat(60));
console.log('\n✅ Secrets generated successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Copy the secrets above to your Backend/.env file');
console.log('   2. Never commit the .env file to version control');
console.log('   3. Rotate these secrets every 90 days');
console.log('   4. Use different secrets for dev/staging/production\n');
console.log('═'.repeat(60) + '\n');
