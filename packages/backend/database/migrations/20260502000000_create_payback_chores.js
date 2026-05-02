/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('payback_accounts', (table) => {
      table.increments('id').primary();
      table.string('kid_name').notNullable();
      table.decimal('total_owed', 10, 2).defaultTo(0);
      table.decimal('total_paid', 10, 2).defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('payback_chores', (table) => {
      table.increments('id').primary();
      table.integer('account_id').notNullable()
        .references('id').inTable('payback_accounts').onDelete('CASCADE');
      table.string('description').notNullable();
      table.decimal('amount', 10, 2).notNullable().defaultTo(1.00);
      table.date('completed_date').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .then(() => {
      return knex('payback_accounts').insert({
        kid_name: 'Cameron',
        total_owed: 0,
        total_paid: 0,
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('payback_chores')
    .dropTableIfExists('payback_accounts');
};
