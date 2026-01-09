/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('todos', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');

    // Priority: urgent, high, medium, low
    table.string('priority').defaultTo('medium');

    // Energy level required: low, medium, high
    // Helps match tasks to current energy/time of day
    table.string('energy_level').defaultTo('medium');

    // Estimated time in minutes (for time-blindness support)
    table.integer('estimated_minutes');

    // Due date and optional time
    table.date('due_date');
    table.string('due_time'); // HH:mm format

    // Context/location for task grouping
    // e.g., "home", "errands", "computer", "phone", "anywhere"
    table.string('context').defaultTo('anywhere');

    // For AI task breakdown - links subtasks to parent
    table.integer('parent_id').references('id').inTable('todos').onDelete('CASCADE');
    table.integer('sort_order').defaultTo(0);

    // Completion tracking
    table.timestamp('completed_at');

    // Recurring task support
    table.boolean('is_recurring').defaultTo(false);
    table.text('recurrence_pattern'); // JSON: { frequency: 'daily'|'weekly'|'monthly', days: [], interval: 1 }

    // AI nudge tracking - when was this task last suggested
    table.timestamp('last_nudged_at');

    // Snooze support - temporarily hide from suggestions
    table.timestamp('snoozed_until');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('todos');
};
