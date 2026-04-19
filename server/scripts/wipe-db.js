/**
 * Database wipe script.
 *
 * Usage:
 *   node scripts/wipe-db.js <DATABASE_URL>
 *
 * Example:
 *   node scripts/wipe-db.js "postgresql://postgres:xxx@host:5432/railway"
 */

const { Client } = require('pg');

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scripts/wipe-db.js <DATABASE_URL>');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected to database.');

  // Get all table names except _prisma_migrations
  const res = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`
  );

  const tables = res.rows.map(r => `"${r.tablename}"`).join(', ');
  console.log(`Found ${res.rows.length} tables: ${tables}`);

  if (res.rows.length === 0) {
    console.log('No tables to truncate.');
    await client.end();
    return;
  }

  await client.query(`TRUNCATE TABLE ${tables} CASCADE`);
  console.log('All tables truncated.');

  // Verify
  const check = await client.query(`SELECT COUNT(*) FROM users`);
  console.log(`Users remaining: ${check.rows[0].count}`);

  await client.end();
  console.log('Done.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
