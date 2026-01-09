/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('recipes', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('instructions').nullable();
      table.integer('prep_time_minutes').nullable();
      table.integer('cook_time_minutes').nullable();
      table.integer('servings').nullable();
      table.string('cuisine').nullable(); // American, Italian, Mexican, Asian, etc.
      table.string('meal_type').nullable(); // Breakfast, Lunch, Dinner, Snack, Dessert
      table.string('difficulty').nullable(); // Easy, Medium, Hard
      table.string('dietary').nullable(); // Vegetarian, Vegan, Gluten-Free, etc.
      table.text('notes').nullable();
      table.string('image_url').nullable();
      table.string('source_url').nullable();
      table.boolean('is_favorite').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('recipe_ingredients', (table) => {
      table.increments('id').primary();
      table.integer('recipe_id').unsigned().notNullable();
      table.string('name').notNullable();
      table.decimal('quantity', 10, 2).nullable();
      table.string('unit').nullable(); // cups, tbsp, oz, lbs, etc.
      table.string('preparation').nullable(); // diced, minced, sliced, etc.
      table.boolean('optional').defaultTo(false);
      table.integer('sort_order').defaultTo(0);
      table.foreign('recipe_id').references('id').inTable('recipes').onDelete('CASCADE');
    })
    .createTable('recipe_tags', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('color').notNullable().defaultTo('#6b7280');
      table.integer('priority').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('recipe_tag_assignments', (table) => {
      table.integer('recipe_id').unsigned().notNullable();
      table.integer('tag_id').unsigned().notNullable();
      table.primary(['recipe_id', 'tag_id']);
      table.foreign('recipe_id').references('id').inTable('recipes').onDelete('CASCADE');
      table.foreign('tag_id').references('id').inTable('recipe_tags').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('recipe_tag_assignments')
    .dropTableIfExists('recipe_tags')
    .dropTableIfExists('recipe_ingredients')
    .dropTableIfExists('recipes');
};
