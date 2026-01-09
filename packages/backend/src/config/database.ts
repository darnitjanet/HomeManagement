import path from 'path';
import knex, { Knex } from 'knex';

const knexConfig = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DATABASE_PATH || path.join(__dirname, '../../database/homemanagement.db'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, '../../database/migrations'),
  },
};

// Initialize Knex instance
export const db: Knex = knex(knexConfig);

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  try {
    // Run migrations to latest
    await db.migrate.latest();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  await db.destroy();
  console.log('✅ Database connection closed');
}

// Helper function to check if database is connected
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await db.raw('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}
