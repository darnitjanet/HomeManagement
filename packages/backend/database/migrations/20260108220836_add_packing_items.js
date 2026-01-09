/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('packing_items', (table) => {
    table.increments('id').primary();
    table.integer('trip_id').references('id').inTable('travel_trips').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('category'); // e.g., "Clothing", "Toiletries", "Electronics", "Documents"
    table.integer('quantity').defaultTo(1);
    table.boolean('packed').defaultTo(false);
    table.integer('sort_order').defaultTo(0);
    table.text('created_at').defaultTo(knex.fn.now());
    table.text('updated_at').defaultTo(knex.fn.now());

    table.index('trip_id');
    table.index('category');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('packing_items');
};
