require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');

module.exports = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DATABASE_PATH || path.join(__dirname, './database/homemanagement.db'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, './database/migrations'),
  },
};
