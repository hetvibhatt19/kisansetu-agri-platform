import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected DB pool error:', err.message);
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]): Promise<any> {
  try {
    const client = getPool();
    const result = await client.query(text, params);
    return result;
  } catch (err: any) {
    // In demo mode, DB errors are non-fatal
    if (process.env.DEMO_MODE === 'true') {
      console.warn('DB query failed (demo mode active):', err.message);
      throw err;
    }
    throw err;
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
