/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('movie_watchlist', (table) => {
    table.increments('id').primary();
    table.integer('tmdb_id').unique();
    table.string('title').notNullable();
    table.string('poster_url');
    table.string('release_year');
    table.string('genre');
    table.text('plot');
    table.string('status').defaultTo('want_to_watch'); // 'want_to_watch' or 'watched'
    table.integer('my_rating'); // 1-5 for watched items
    table.date('watched_date');
    table.integer('priority').defaultTo(3); // 1-5 priority
    table.text('notes');
    table.timestamp('added_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('status');
    table.index('priority');
    table.index('tmdb_id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('movie_watchlist');
};
