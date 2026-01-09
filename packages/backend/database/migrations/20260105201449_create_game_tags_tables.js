/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('game_tags', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('color').notNullable().defaultTo('#6b7280');
      table.integer('priority').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('game_tag_assignments', (table) => {
      table.integer('game_id').unsigned().notNullable();
      table.integer('tag_id').unsigned().notNullable();
      table.primary(['game_id', 'tag_id']);
      table.foreign('game_id').references('id').inTable('games').onDelete('CASCADE');
      table.foreign('tag_id').references('id').inTable('game_tags').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('game_tag_assignments')
    .dropTableIfExists('game_tags');
};
