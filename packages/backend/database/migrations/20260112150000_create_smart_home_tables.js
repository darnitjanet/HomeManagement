/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('smart_home_devices', (table) => {
      table.increments('id').primary();
      table.string('service').notNullable(); // govee, ecobee, eufy
      table.string('device_id').notNullable();
      table.string('name').notNullable();
      table.string('type'); // light, thermostat, camera
      table.string('room');
      table.json('state'); // Current state (on/off, brightness, temp, etc.)
      table.timestamp('last_seen');
      table.timestamps(true, true);
      table.unique(['service', 'device_id']);
    })
    .createTable('smart_home_config', (table) => {
      table.increments('id').primary();
      table.string('service').notNullable().unique(); // govee, ecobee, eufy
      table.text('config_json'); // Encrypted or plain config (API keys, tokens)
      table.boolean('enabled').defaultTo(true);
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('smart_home_devices')
    .dropTableIfExists('smart_home_config');
};
