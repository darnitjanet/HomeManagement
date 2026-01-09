/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('chore_definitions', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.string('icon').nullable();
      table.string('category').nullable();
      table.integer('estimated_minutes').nullable();

      // Recurrence settings
      table.boolean('is_recurring').defaultTo(true);
      table.text('recurrence_pattern').nullable(); // JSON: { frequency, days, interval }

      // Rotation settings
      table.boolean('is_rotating').defaultTo(false);
      table.text('rotation_kid_ids').nullable(); // JSON array of kid IDs
      table.integer('current_rotation_index').defaultTo(0);

      // Single assignee (if not rotating)
      table.integer('default_kid_id').unsigned().nullable();
      table.foreign('default_kid_id').references('id').inTable('kids').onDelete('SET NULL');

      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('chore_instances', (table) => {
      table.increments('id').primary();
      table.integer('chore_definition_id').unsigned().notNullable();
      table.foreign('chore_definition_id').references('id').inTable('chore_definitions').onDelete('CASCADE');

      // Assignment
      table.integer('assigned_kid_id').unsigned().notNullable();
      table.foreign('assigned_kid_id').references('id').inTable('kids').onDelete('CASCADE');

      // Scheduling
      table.date('due_date').notNullable();
      table.string('due_time').nullable(); // HH:mm format

      // Completion tracking
      table.timestamp('completed_at').nullable();

      // Link to awarded sticker
      table.integer('sticker_id').unsigned().nullable();
      table.foreign('sticker_id').references('id').inTable('kid_stickers').onDelete('SET NULL');

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Indexes for common queries
      table.index(['due_date', 'completed_at']);
      table.index(['assigned_kid_id', 'due_date']);
      table.index('chore_definition_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('chore_instances')
    .dropTableIfExists('chore_definitions');
};
