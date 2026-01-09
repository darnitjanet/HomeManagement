/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('travel_trips', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('start_date');
      table.text('end_date');
      table.text('description');
      table.text('created_at').defaultTo(knex.fn.now());
      table.text('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('travel_places', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('country');
      table.string('country_code', 10);
      table.string('state'); // For US states
      table.string('state_code', 10); // State abbreviation
      table.float('latitude').notNullable();
      table.float('longitude').notNullable();
      table.text('visit_date');
      table.text('visit_end_date');
      table.integer('trip_id').references('id').inTable('travel_trips').onDelete('SET NULL');
      table.string('trip_name'); // Optional standalone trip name if not linked to trip
      table.text('notes');
      table.text('highlights');
      table.integer('rating'); // 1-5
      table.text('companions'); // JSON array or comma-separated
      table.text('expenses'); // JSON or freeform text
      table.text('photo_urls'); // JSON array
      table.text('created_at').defaultTo(knex.fn.now());
      table.text('updated_at').defaultTo(knex.fn.now());

      // Indexes for common queries
      table.index(['latitude', 'longitude']);
      table.index('country_code');
      table.index('state_code');
      table.index('trip_id');
      table.index('visit_date');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('travel_places')
    .dropTableIfExists('travel_trips');
};
