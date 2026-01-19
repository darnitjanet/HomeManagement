/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('seasonal_tasks', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');

    // Category for grouping
    table.string('category').defaultTo('home'); // home, garden, car, hvac, plumbing, etc.

    // Season-based triggering: spring, summer, fall, winter
    // Can select multiple seasons as JSON array
    table.text('seasons'); // JSON array: ["spring", "fall"]

    // Alternatively, specific months (1-12)
    // Can select multiple months as JSON array
    table.text('months'); // JSON array: [3, 9] for March and September

    // Day of month to trigger reminder (1-28 to be safe)
    table.integer('reminder_day').defaultTo(1);

    // How many days before to start reminding
    table.integer('reminder_days_before').defaultTo(7);

    // Priority for sorting
    table.string('priority').defaultTo('medium'); // low, medium, high

    // Estimated time in minutes
    table.integer('estimated_minutes');

    // Track completion for current season/period
    table.string('last_completed_period'); // e.g., "2026-spring" or "2026-03"
    table.timestamp('last_completed_at');

    // Is task active?
    table.boolean('is_active').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('seasonal_tasks');
};
