exports.up = async function(knex) {
  // Household Items table
  await knex.schema.createTable('items', (table) => {
    table.increments('id').primary();
    table.enum('type', ['book', 'movie', 'game', 'tool', 'other']).notNullable();
    table.string('title').notNullable();
    table.string('author');
    table.string('isbn');
    table.string('location');
    table.string('condition');
    table.string('purchase_date');
    table.text('notes');
    table.text('tags'); // JSON array stored as text
    table.string('image_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('type');
    table.index('title');
  });

  // Google Calendar Configuration table
  await knex.schema.createTable('calendar_configs', (table) => {
    table.increments('id').primary();
    table.string('calendar_id').unique().notNullable();
    table.string('calendar_name').notNullable();
    table.enum('calendar_type', ['primary', 'subscribed', 'external']).notNullable();
    table.boolean('is_enabled').defaultTo(true);
    table.string('color');
    table.boolean('sync_enabled').defaultTo(true);
    table.timestamp('last_sync_at');
    table.text('sync_token'); // For incremental sync
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // External Calendar Subscriptions (iCal URLs)
  await knex.schema.createTable('external_calendars', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.text('ical_url').notNullable();
    table.string('color');
    table.boolean('is_enabled').defaultTo(true);
    table.integer('sync_interval').defaultTo(3600); // seconds
    table.timestamp('last_sync_at');
    table.text('sync_error');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Cached Calendar Events (for offline access and performance)
  await knex.schema.createTable('calendar_events_cache', (table) => {
    table.string('id').primary(); // Google event ID
    table.string('calendar_id').notNullable();
    table.string('summary');
    table.text('description');
    table.string('location');
    table.timestamp('start_datetime').notNullable();
    table.timestamp('end_datetime').notNullable();
    table.boolean('all_day').defaultTo(false);
    table.text('recurrence'); // JSON stored as text
    table.text('attendees'); // JSON stored as text
    table.string('status');
    table.text('raw_data'); // Full Google Calendar event JSON
    table.timestamp('last_synced_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('start_datetime');
    table.index('calendar_id');
    table.foreign('calendar_id').references('calendar_configs.calendar_id').onDelete('CASCADE');
  });

  // Sync Jobs Log
  await knex.schema.createTable('sync_logs', (table) => {
    table.increments('id').primary();
    table.string('calendar_id');
    table.enum('sync_type', ['full', 'incremental', 'external']);
    table.enum('status', ['success', 'failed', 'partial']);
    table.integer('events_added').defaultTo(0);
    table.integer('events_updated').defaultTo(0);
    table.integer('events_deleted').defaultTo(0);
    table.text('error_message');
    table.timestamp('started_at');
    table.timestamp('completed_at');

    // Indexes
    table.index('calendar_id');
  });

  // User Sessions table (for OAuth tokens)
  await knex.schema.createTable('user_sessions', (table) => {
    table.string('id').primary();
    table.text('session_data').notNullable(); // JSON containing OAuth tokens
    table.bigInteger('expires_at').notNullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('sync_logs');
  await knex.schema.dropTableIfExists('calendar_events_cache');
  await knex.schema.dropTableIfExists('external_calendars');
  await knex.schema.dropTableIfExists('calendar_configs');
  await knex.schema.dropTableIfExists('items');
};
