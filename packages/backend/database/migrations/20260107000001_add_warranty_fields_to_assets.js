/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('assets', (table) => {
    table.date('warranty_expiration_date').nullable();
    table.string('warranty_provider').nullable(); // e.g., Samsung, Best Buy, SquareTrade
    table.string('warranty_type').nullable(); // Manufacturer, Extended, Store Protection, Other
    table.string('warranty_document_url').nullable(); // Link to warranty document/receipt
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('assets', (table) => {
    table.dropColumn('warranty_expiration_date');
    table.dropColumn('warranty_provider');
    table.dropColumn('warranty_type');
    table.dropColumn('warranty_document_url');
  });
};
