#!/usr/bin/env node

/**
 * Environment Variable Debugger
 * Shows what's actually being loaded from .env
 */

require('dotenv').config();

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  ENVIRONMENT VARIABLE DEBUG');
console.log('═══════════════════════════════════════════════════════════════\n');

const vars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'REDIS_URL',
  'OPENAI_API_KEY',
];

vars.forEach(varName => {
  const value = process.env[varName];
  const exists = !!value;
  const length = value ? value.length : 0;
  
  console.log(`${varName}:`);
  console.log(`  Exists: ${exists ? '✅ YES' : '❌ NO'}`);
  console.log(`  Length: ${length} characters`);
  
  if (value) {
    // Show first/last 10 chars to help debug without exposing full value
    const start = value.substring(0, 15);
    const end = value.substring(value.length - 10);
    console.log(`  Preview: ${start}...${end}`);
    
    // Check for common issues
    if (value.startsWith(' ') || value.endsWith(' ')) {
      console.log(`  ⚠️  WARNING: Has leading/trailing spaces!`);
    }
    if (value.includes('\n')) {
      console.log(`  ⚠️  WARNING: Contains newline characters!`);
    }
    if (value.startsWith('"') || value.startsWith("'")) {
      console.log(`  ⚠️  WARNING: Wrapped in quotes (might be the issue!)`);
    }
  }
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════\n');

// Try to parse DATABASE_URL specifically
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL Analysis:');
  const url = process.env.DATABASE_URL;
  
  try {
    const urlObj = new URL(url);
    console.log(`  Protocol: ${urlObj.protocol}`);
    console.log(`  Host: ${urlObj.hostname}`);
    console.log(`  Port: ${urlObj.port}`);
    console.log(`  Database: ${urlObj.pathname}`);
    console.log(`  ✅ URL is valid!\n`);
  } catch (e) {
    console.log(`  ❌ ERROR: Invalid URL format`);
    console.log(`  ${e.message}\n`);
  }
} else {
  console.log('❌ DATABASE_URL not found in environment!\n');
  console.log('Common issues:');
  console.log('  1. Variable name typo (check for spaces, case)');
  console.log('  2. .env file not in project root');
  console.log('  3. Value wrapped in quotes when it shouldn\'t be');
  console.log('  4. Extra spaces before/after the variable name or value');
  console.log('  5. Missing = sign\n');
  console.log('Correct format:');
  console.log('  DATABASE_URL=postgresql://...\n');
  console.log('NOT:');
  console.log('  DATABASE_URL = postgresql://...  (spaces around =)');
  console.log('  DATABASE_URL="postgresql://..."  (quoted)');
  console.log('  DATABASE_URL =postgresql://...   (space before =)\n');
}

console.log('═══════════════════════════════════════════════════════════════\n');


