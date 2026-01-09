/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('kids', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('avatar_color').notNullable().defaultTo('#4ECDC4');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('kid_stickers', (table) => {
      table.increments('id').primary();
      table.integer('kid_id').unsigned().notNullable();
      table.string('reason').nullable();
      table.string('awarded_by').nullable();
      table.timestamp('awarded_at').defaultTo(knex.fn.now());
      table.foreign('kid_id').references('id').inTable('kids').onDelete('CASCADE');
    })
    .createTable('kid_rewards', (table) => {
      table.increments('id').primary();
      table.integer('kid_id').unsigned().notNullable();
      table.string('name').notNullable();
      table.integer('stickers_required').notNullable();
      table.boolean('is_claimed').defaultTo(false);
      table.timestamp('claimed_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.foreign('kid_id').references('id').inTable('kids').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('kid_rewards')
    .dropTableIfExists('kid_stickers')
    .dropTableIfExists('kids');
};
