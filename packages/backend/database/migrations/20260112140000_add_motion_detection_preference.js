/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('notification_preferences', (table) => {
    // Default to false for privacy - opt-in feature
    table.boolean('motion_detection_enabled').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('notification_preferences', (table) => {
    table.dropColumn('motion_detection_enabled');
  });
};
