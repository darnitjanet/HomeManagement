/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('game_loans', (table) => {
    table.increments('id').primary();
    table.integer('game_id').unsigned().notNullable();
    table.string('borrower_name').notNullable();
    table.string('borrower_contact').nullable(); // email or phone
    table.date('loaned_date').notNullable();
    table.date('expected_return_date').nullable();
    table.date('returned_date').nullable(); // null means still on loan
    table.boolean('reminder_sent').defaultTo(false);
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('game_id').references('id').inTable('games').onDelete('CASCADE');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('game_loans');
};
