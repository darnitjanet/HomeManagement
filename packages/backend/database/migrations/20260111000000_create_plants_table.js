/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('plants', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('species'); // e.g., "Pothos", "Snake Plant", "Monstera"
      table.string('location'); // e.g., "Living Room", "Kitchen", "Bedroom"
      table.integer('watering_frequency_days').defaultTo(7); // How often to water
      table.date('last_watered');
      table.date('next_water_date');
      table.string('sunlight_needs'); // "Low", "Medium", "Bright Indirect", "Direct"
      table.string('image_url');
      table.text('notes');
      table.text('care_instructions');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('plant_watering_log', (table) => {
      table.increments('id').primary();
      table.integer('plant_id').unsigned().references('id').inTable('plants').onDelete('CASCADE');
      table.date('watered_date').notNullable();
      table.text('notes');
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('plant_watering_log')
    .dropTableIfExists('plants');
};
