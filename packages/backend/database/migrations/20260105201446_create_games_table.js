/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('games', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('type').notNullable(); // 'Board Game', 'Puzzle', 'Card Game', 'Party Game', 'Video Game'
    table.integer('player_count_min').nullable();
    table.integer('player_count_max').nullable();
    table.string('condition').nullable(); // 'Excellent', 'Good', 'Fair', 'Poor'
    table.string('platform').nullable(); // For video games: PS5, Xbox, Switch, PC, etc.
    table.text('notes').nullable();
    table.string('image_url').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('games');
};
