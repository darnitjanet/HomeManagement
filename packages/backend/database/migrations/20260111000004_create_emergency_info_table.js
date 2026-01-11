/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('emergency_contacts', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('relationship').nullable(); // e.g., "Parent", "Doctor", "Neighbor"
      table.string('phone').nullable();
      table.string('phone_secondary').nullable();
      table.string('email').nullable();
      table.text('address').nullable();
      table.text('notes').nullable();
      table.integer('priority').defaultTo(0); // Lower = higher priority
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('emergency_info', (table) => {
      table.increments('id').primary();
      table.string('category').notNullable(); // e.g., "medical", "home", "insurance", "other"
      table.string('label').notNullable(); // e.g., "Home Address", "Doctor", "Insurance Policy"
      table.text('value').notNullable(); // The actual information
      table.text('notes').nullable();
      table.integer('priority').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('family_rules', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description').nullable();
      table.string('category').nullable(); // e.g., "screen_time", "chores", "safety", "behavior"
      table.integer('priority').defaultTo(0);
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
  return knex.schema
    .dropTableIfExists('family_rules')
    .dropTableIfExists('emergency_info')
    .dropTableIfExists('emergency_contacts');
};
