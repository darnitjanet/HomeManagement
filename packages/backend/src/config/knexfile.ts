import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const config = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DATABASE_PATH || path.join(__dirname, '../../database/homemanagement.db'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, '../../database/migrations'),
    extension: 'ts',
  },
};

export default config;
