/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('assets', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.string('category').nullable(); // Electronics, Furniture, Appliances, etc.
      table.string('location').nullable(); // Living Room, Bedroom, Garage, etc.
      table.string('brand').nullable();
      table.string('model').nullable();
      table.string('serial_number').nullable();
      table.decimal('purchase_price', 10, 2).nullable();
      table.date('purchase_date').nullable();
      table.decimal('current_value', 10, 2).nullable();
      table.string('condition').nullable(); // Excellent, Good, Fair, Poor
      table.string('image_url').nullable();
      table.string('receipt_url').nullable();
      table.text('notes').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('asset_tags', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.string('color').defaultTo('#6b7280');
      table.integer('priority').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('asset_tag_assignments', (table) => {
      table.increments('id').primary();
      table.integer('asset_id').unsigned().references('id').inTable('assets').onDelete('CASCADE');
      table.integer('tag_id').unsigned().references('id').inTable('asset_tags').onDelete('CASCADE');
      table.unique(['asset_id', 'tag_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('asset_tag_assignments')
    .dropTableIfExists('asset_tags')
    .dropTableIfExists('assets');
};
