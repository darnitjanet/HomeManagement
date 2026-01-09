/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('pantry_items', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.decimal('quantity', 10, 2).defaultTo(1);
    table.string('unit').nullable(); // cups, oz, lbs, count, etc.
    table.string('category').nullable(); // Produce, Dairy, Meat, Pantry, etc.
    table.string('location').nullable(); // refrigerator, freezer, pantry, counter, spice_rack
    table.date('expiration_date').nullable();
    table.date('purchase_date').nullable();
    table.decimal('low_stock_threshold', 10, 2).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for common queries
    table.index('category');
    table.index('location');
    table.index('expiration_date');
    table.index('name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('pantry_items');
};
