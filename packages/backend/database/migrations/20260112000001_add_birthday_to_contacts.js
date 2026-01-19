/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('emergency_contacts', (table) => {
    table.string('birthday').nullable(); // Format: MM-DD (month-day only, no year needed for reminders)
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('emergency_contacts', (table) => {
    table.dropColumn('birthday');
  });
};
