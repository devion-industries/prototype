import { Pool, PoolClient, QueryResult } from 'pg';
import config from '../config';

class Database {
  private pool: Pool;

  constructor() {
    // Determine if we need SSL based on the connection string
    const isRemote = config.DATABASE_URL.includes('supabase.co') || 
                     config.DATABASE_URL.includes('supabase.com');
    
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // SSL configuration for remote databases (Supabase)
      ssl: isRemote ? { rejectUnauthorized: false } : false,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    // Test connection on startup
    this.healthCheck()
      .then(isHealthy => {
        if (isHealthy) {
          console.log('✅ Database connected');
        } else {
          console.error('❌ Database connection failed');
        }
      })
      .catch(err => {
        console.error('❌ Database connection error:', err.message);
      });
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      if (config.NODE_ENV === 'development') {
        console.log('Executed query:', { text, duration, rows: result.rowCount });
      }
      return result;
    } catch (error) {
      console.error('Database query error:', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = new Database();
export default db;

