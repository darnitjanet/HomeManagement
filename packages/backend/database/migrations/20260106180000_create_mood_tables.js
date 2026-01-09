/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('family_members', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('avatar_color').notNullable().defaultTo('#4ECDC4');
      table.date('date_of_birth').nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('mood_entries', (table) => {
      table.increments('id').primary();
      table.integer('family_member_id').unsigned().notNullable();
      table.string('mood').notNullable(); // anxious, sad, stressed, tired, calm, content, happy, excited, grateful, energized
      table.integer('energy_level').notNullable(); // 1-5
      table.integer('sleep_quality').nullable(); // 1-5
      table.decimal('sleep_hours', 4, 1).nullable();
      table.text('notes').nullable();
      table.timestamp('logged_at').defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.foreign('family_member_id').references('id').inTable('family_members').onDelete('CASCADE');
      table.index(['family_member_id', 'logged_at']);
      table.index('logged_at');
    })
    .createTable('mood_activities', (table) => {
      table.increments('id').primary();
      table.integer('mood_entry_id').unsigned().notNullable();
      table.string('activity').notNullable(); // work, exercise, social, family, hobby, rest, outdoors, screen_time, reading, chores

      table.foreign('mood_entry_id').references('id').inTable('mood_entries').onDelete('CASCADE');
      table.index('mood_entry_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('mood_activities')
    .dropTableIfExists('mood_entries')
    .dropTableIfExists('family_members');
};
