/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Movies table - stores movie catalog entries
  await knex.schema.createTable('movies', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.enum('type', ['Movie', 'Series', 'Episode', 'All']).defaultTo('Movie');
    table.enum('watched_status', ['Not Watched', 'Watched']).defaultTo('Not Watched');
    table.string('imdb_id').unique();
    table.decimal('star_rating', 2, 1); // 0.0 to 5.0 from API
    table.integer('my_rating'); // 1-5 hearts from user
    table.string('mpaa_rating');
    table.string('format');
    table.text('genre'); // Comma-separated from API
    table.text('plot');
    table.string('release_year');
    table.string('runtime');
    table.text('languages'); // Comma-separated
    table.text('country'); // Comma-separated
    table.text('awards');
    table.string('imdb_score');
    table.string('metacritic_score');
    table.string('rotten_tomatoes_score');
    table.text('director');
    table.text('actors'); // Comma-separated
    table.text('writers'); // Comma-separated
    table.string('poster_url');
    table.text('personal_notes');
    table.text('raw_omdb_data'); // Full OMDb API response JSON
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('title');
    table.index('watched_status');
    table.index('type');
  });

  // Movie Tags table - custom tags for organization
  await knex.schema.createTable('movie_tags', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.string('color').defaultTo('#5b768a'); // Default slate blue
    table.integer('priority').defaultTo(0); // Higher = more important
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index
    table.index('priority');
  });

  // Movie Tag Assignments - many-to-many relationship
  await knex.schema.createTable('movie_tag_assignments', (table) => {
    table.increments('id').primary();
    table.integer('movie_id').unsigned().notNullable();
    table.integer('tag_id').unsigned().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('movie_id').references('movies.id').onDelete('CASCADE');
    table.foreign('tag_id').references('movie_tags.id').onDelete('CASCADE');

    // Unique constraint - can't assign same tag twice to same movie
    table.unique(['movie_id', 'tag_id']);

    // Indexes
    table.index('movie_id');
    table.index('tag_id');
  });

  // Insert default tags
  await knex('movie_tags').insert([
    { name: 'Action', color: '#da6b34', priority: 10 },
    { name: 'Comedy', color: '#dc9e33', priority: 9 },
    { name: 'Drama', color: '#5b768a', priority: 8 },
    { name: 'Family Favorite', color: '#da6b34', priority: 7 },
    { name: 'Kids', color: '#dc9e33', priority: 6 },
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('movie_tag_assignments');
  await knex.schema.dropTableIfExists('movie_tags');
  await knex.schema.dropTableIfExists('movies');
};
