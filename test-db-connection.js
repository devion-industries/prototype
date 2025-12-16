#!/usr/bin/env node

/**
 * Database Connection Tester
 * Tests if DATABASE_URL can connect to the database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  DATABASE CONNECTION TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.log('❌ DATABASE_URL not found in environment!\n');
    console.log('Make sure your .env file has:');
    console.log('DATABASE_URL=postgresql://...\n');
    process.exit(1);
  }

  // Parse URL to show what we're connecting to (without password)
  try {
    const url = new URL(dbUrl);
    console.log('🔍 Connection Details:');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port}`);
    console.log(`   Database: ${url.pathname.replace('/', '')}`);
    console.log(`   Username: ${url.username}`);
    console.log(`   Password: ${'*'.repeat(10)}\n`);
  } catch (e) {
    console.log('❌ Invalid DATABASE_URL format!\n');
    process.exit(1);
  }

  console.log('🔌 Attempting to connect...\n');

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test basic connection
    console.log('   Step 1: Testing connection...');
    const client = await pool.connect();
    console.log('   ✅ Connection established!\n');

    // Test query
    console.log('   Step 2: Running test query...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('   ✅ Query successful!\n');

    console.log('📊 Database Info:');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}\n`);

    // Test tables
    console.log('   Step 3: Checking tables...');
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(`   ✅ Found ${tables.rows.length} tables:\n`);
    
    tables.rows.forEach(row => {
      console.log(`      - ${row.tablename}`);
    });

    client.release();
    await pool.end();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ SUCCESS! Database connection is working perfectly!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(0);

  } catch (error) {
    console.log('   ❌ Connection failed!\n');
    console.log('📋 Error Details:');
    console.log(`   Type: ${error.code || 'UNKNOWN'}`);
    console.log(`   Message: ${error.message}\n`);

    if (error.message.includes('Tenant or user not found')) {
      console.log('🔧 SOLUTION:\n');
      console.log('This error means authentication failed. Check:\n');
      console.log('1. **Password is correct**');
      console.log('   Go to: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database');
      console.log('   Click "Reset Database Password" if you don\'t remember it\n');
      
      console.log('2. **Username format matches connection type**');
      console.log('   For Connection Pooler: postgres.ygudmijcffyuarwoywmq');
      console.log('   For Direct Connection: postgres\n');
      
      console.log('3. **URL format is correct**');
      console.log('   Pooler: postgresql://postgres.ygudmijcffyuarwoywmq:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres');
      console.log('   Direct: postgresql://postgres:[PASSWORD]@db.ygudmijcffyuarwoywmq.supabase.co:5432/postgres\n');
      
      console.log('4. **Special characters in password are URL-encoded**');
      console.log('   @ → %40, : → %3A, / → %2F, # → %23\n');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('🔧 SOLUTION:\n');
      console.log('DNS lookup failed. Try:\n');
      console.log('1. Check your internet connection');
      console.log('2. Try a different network (disable VPN)');
      console.log('3. Use connection pooler instead of direct connection\n');
    } else if (error.message.includes('timeout')) {
      console.log('🔧 SOLUTION:\n');
      console.log('Connection timed out. Try:\n');
      console.log('1. Check firewall settings');
      console.log('2. Try connection pooler');
      console.log('3. Check if Supabase project is paused\n');
    }

    console.log('📖 More help: See CONNECTION_STRING_GUIDE.md\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();

