/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('shopping_items', (table) => {
      table.increments('id').primary();
      table.string('list_type').notNullable(); // 'grocery' or 'other'
      table.string('name').notNullable();
      table.integer('quantity').defaultTo(1);
      table.string('category').nullable(); // for grocery items
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('favorite_items', (table) => {
      table.increments('id').primary();
      table.string('list_type').notNullable(); // 'grocery' or 'other'
      table.string('name').notNullable();
      table.string('category').nullable();
      table.integer('default_quantity').defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('favorite_items')
    .dropTableIfExists('shopping_items');
};
