/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('contacts', (table) => {
    table.string('birthday').nullable(); // Format: MM-DD (month-day only, no year needed for reminders)
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('contacts', (table) => {
    table.dropColumn('birthday');
  });
};
