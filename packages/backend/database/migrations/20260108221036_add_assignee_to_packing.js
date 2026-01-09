/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('packing_items', (table) => {
    table.string('assignee'); // Person responsible for packing this item (e.g., "Mom", "Dad", "Kids", "Everyone")
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('packing_items', (table) => {
    table.dropColumn('assignee');
  });
};
