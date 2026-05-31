/**
 * Single shared mysql2 connection pool. Use parameterised queries everywhere
 * (`pool.query('... WHERE id = ?', [id])`) so user input is never spliced
 * into raw SQL — that is our SQL injection defense.
 */
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skin_clinic_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: '+05:30', // Asia/Kolkata — keep DATE/TIME values consistent
  dateStrings: true,  // return DATE/DATETIME as 'YYYY-MM-DD' strings, not JS Date objects
});

export async function connectDB() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}
