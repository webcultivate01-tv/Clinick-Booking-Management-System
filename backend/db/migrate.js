/**
 * Runs schema.sql against the configured MySQL database.
 *
 *   node db/migrate.js
 *
 * Creates the database if it does not exist, then applies schema.sql.
 * Safe to re-run — all statements use CREATE TABLE IF NOT EXISTS.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '3306',
    DB_USER = 'root',
    DB_PASSWORD = '',
    DB_NAME = 'skin_clinic_db',
  } = process.env;

  // Connect WITHOUT a database first so we can create it.
  const rootConn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  console.log(`[migrate] ensuring database \`${DB_NAME}\` exists`);
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  // Now run schema.sql against the target database.
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('[migrate] applying schema.sql');
  await conn.query(sql);
  await conn.end();

  console.log('[migrate] done');
}

run().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
