/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('notification_preferences', (table) => {
    table.boolean('vacation_mode').defaultTo(false);
    table.date('vacation_start_date').nullable();
    table.date('vacation_end_date').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('notification_preferences', (table) => {
    table.dropColumn('vacation_mode');
    table.dropColumn('vacation_start_date');
    table.dropColumn('vacation_end_date');
  });
};
