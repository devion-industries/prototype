#!/usr/bin/env node

/**
 * Configuration Validator for Maintainer Brief Backend
 * Checks if all required environment variables are set
 */

require('dotenv').config();

const checks = [];
let hasErrors = false;

function check(name, required = true) {
  const value = process.env[name];
  const exists = value && value.trim() !== '';
  
  checks.push({
    name,
    required,
    exists,
    valid: exists || !required
  });
  
  if (required && !exists) {
    hasErrors = true;
  }
  
  return exists;
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  CONFIGURATION VALIDATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Critical configuration
console.log('🔐 CRITICAL (Required):');
check('SUPABASE_URL');
check('SUPABASE_ANON_KEY');
check('SUPABASE_SERVICE_ROLE_KEY');
check('DATABASE_URL');
check('REDIS_URL');
check('OPENAI_API_KEY');
check('GITHUB_CLIENT_ID');
check('GITHUB_CLIENT_SECRET');
check('ENCRYPTION_KEY');

// Optional configuration
console.log('\n📧 OPTIONAL (For notifications):');
check('SMTP_HOST', false);
check('SMTP_USER', false);
check('FROM_EMAIL', false);

// Display results
console.log('\n─────────────────────────────────────────────────────────────────');
console.log('RESULTS:\n');

checks.forEach(({ name, required, exists, valid }) => {
  const status = exists ? '✅' : (required ? '❌' : '⚠️ ');
  const label = required ? 'REQUIRED' : 'optional';
  console.log(`${status} ${name.padEnd(30)} [${label}] ${exists ? 'SET' : 'MISSING'}`);
});

console.log('─────────────────────────────────────────────────────────────────\n');

// Check specific values
if (process.env.ENCRYPTION_KEY) {
  const keyLength = process.env.ENCRYPTION_KEY.length;
  if (keyLength !== 64) {
    console.log(`⚠️  ENCRYPTION_KEY should be 64 characters (currently ${keyLength})`);
    console.log('   Generate with: openssl rand -hex 32\n');
    hasErrors = true;
  }
}

if (process.env.SUPABASE_URL) {
  if (!process.env.SUPABASE_URL.startsWith('https://')) {
    console.log('⚠️  SUPABASE_URL should start with https://\n');
    hasErrors = true;
  }
}

if (process.env.OPENAI_API_KEY) {
  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.log('⚠️  OPENAI_API_KEY should start with sk-\n');
    hasErrors = true;
  }
}

if (process.env.DATABASE_URL) {
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.log('⚠️  DATABASE_URL should start with postgresql://\n');
    hasErrors = true;
  }
}

// Summary
if (hasErrors) {
  console.log('❌ CONFIGURATION INCOMPLETE\n');
  console.log('Missing required variables. See CREDENTIALS_NEEDED.md for details.\n');
  console.log('Quick links:');
  console.log('  - Service Role Key: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/api');
  console.log('  - Database Password: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database');
  console.log('  - OpenAI API Key: https://platform.openai.com/api-keys');
  console.log('  - GitHub OAuth App: https://github.com/settings/developers\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
} else {
  console.log('✅ CONFIGURATION COMPLETE!\n');
  console.log('All required variables are set. You can now:');
  console.log('  1. npm run dev      (start API server)');
  console.log('  2. npm run worker   (start job worker in another terminal)');
  console.log('  3. curl http://localhost:3000/health\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

