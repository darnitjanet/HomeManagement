/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('meal_plans', (table) => {
      table.increments('id').primary();
      table.date('week_start_date').notNullable(); // Monday of the week
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.unique(['week_start_date']);
    })
    .createTable('meal_plan_entries', (table) => {
      table.increments('id').primary();
      table.integer('meal_plan_id').unsigned().notNullable()
        .references('id').inTable('meal_plans').onDelete('CASCADE');
      table.integer('day_of_week').notNullable(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      table.string('meal_type').notNullable(); // breakfast, lunch, dinner, snack
      table.integer('recipe_id').unsigned().nullable()
        .references('id').inTable('recipes').onDelete('SET NULL');
      table.string('custom_meal').nullable(); // For non-recipe meals like "Leftovers" or "Eating out"
      table.text('notes').nullable();
      table.integer('servings').defaultTo(4);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.index(['meal_plan_id', 'day_of_week', 'meal_type']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('meal_plan_entries')
    .dropTableIfExists('meal_plans');
};
