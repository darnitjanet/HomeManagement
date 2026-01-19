/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('packages', (table) => {
    table.string('email_id').nullable().unique(); // Gmail message ID to prevent duplicates
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('packages', (table) => {
    table.dropColumn('email_id');
  });
};
