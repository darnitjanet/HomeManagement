/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Contacts table - stores Google Contacts
  await knex.schema.createTable('contacts', (table) => {
    table.increments('id').primary();
    table.string('google_contact_id').unique().notNullable();
    table.string('display_name').notNullable();
    table.string('given_name');
    table.string('family_name');
    table.text('emails'); // JSON array of email objects
    table.text('phones'); // JSON array of phone objects
    table.string('photo_url');
    table.text('notes');
    table.text('raw_data'); // Full Google contact JSON
    table.boolean('is_favorite').defaultTo(false);
    table.timestamp('last_synced_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('display_name');
    table.index('is_favorite');
  });

  // Contact Tags table - custom tags like "kids friends", "family", etc.
  await knex.schema.createTable('contact_tags', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.string('color').defaultTo('#4285f4'); // Default blue
    table.integer('priority').defaultTo(0); // Higher = more important
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index
    table.index('priority');
  });

  // Contact Tag Assignments - many-to-many relationship
  await knex.schema.createTable('contact_tag_assignments', (table) => {
    table.increments('id').primary();
    table.integer('contact_id').unsigned().notNullable();
    table.integer('tag_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('contact_id').references('contacts.id').onDelete('CASCADE');
    table.foreign('tag_id').references('contact_tags.id').onDelete('CASCADE');

    // Unique constraint - can't assign same tag twice to same contact
    table.unique(['contact_id', 'tag_id']);

    // Indexes
    table.index('contact_id');
    table.index('tag_id');
  });

  // Sync logs for contacts
  await knex.schema.createTable('contact_sync_logs', (table) => {
    table.increments('id').primary();
    table.enum('sync_type', ['full', 'incremental']).notNullable();
    table.enum('status', ['success', 'failed', 'partial']).notNullable();
    table.integer('contacts_added').defaultTo(0);
    table.integer('contacts_updated').defaultTo(0);
    table.integer('contacts_deleted').defaultTo(0);
    table.text('error_message');
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');

    // Index
    table.index('started_at');
  });

  // Insert default tags
  await knex('contact_tags').insert([
    { name: 'kids friends', color: '#34a853', priority: 10 },
    { name: 'family', color: '#ea4335', priority: 9 },
    { name: 'work', color: '#fbbc04', priority: 5 },
    { name: 'school', color: '#4285f4', priority: 7 },
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('contact_sync_logs');
  await knex.schema.dropTableIfExists('contact_tag_assignments');
  await knex.schema.dropTableIfExists('contact_tags');
  await knex.schema.dropTableIfExists('contacts');
};
