// Applies pending migrations/*.sql against DATABASE_URL. Idempotent.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const dsn = process.env.DATABASE_URL;
  if (!dsn) throw new Error('DATABASE_URL is not set');
  const client = new Client({ connectionString: dsn });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map(r => r.name));
    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) { console.log(`skip ${f}`); continue; }
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        console.log(`applied ${f}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`${f}: ${e.message}`);
      }
    }
    console.log('migrations up to date');
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
