/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('movies', (table) => {
    table.integer('tmdb_id').unique();
    table.string('tmdb_score');
    table.text('production_company'); // Comma-separated (e.g., "A24, Plan B")
    table.string('backdrop_url');
    table.bigInteger('budget');
    table.bigInteger('revenue');
    table.text('raw_tmdb_data'); // Full TMDB API response JSON
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('movies', (table) => {
    table.dropColumn('tmdb_id');
    table.dropColumn('tmdb_score');
    table.dropColumn('production_company');
    table.dropColumn('backdrop_url');
    table.dropColumn('budget');
    table.dropColumn('revenue');
    table.dropColumn('raw_tmdb_data');
  });
};
