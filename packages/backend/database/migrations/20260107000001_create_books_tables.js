/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Books table
  await knex.schema.createTable('books', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.string('author');
    table.string('isbn');
    table.string('isbn13');
    table.string('olid'); // Open Library Work ID
    table.string('publisher');
    table.string('publish_year');
    table.integer('pages');
    table.string('genre');
    table.string('subject');
    table.text('description');
    table.string('cover_url');
    table.string('language');
    table.string('read_status').defaultTo('Wishlist'); // Wishlist, Reading, Completed
    table.integer('my_rating'); // 1-5
    table.text('personal_notes');
    table.string('location'); // shelf/room
    table.text('raw_openlibrary_data');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Book tags table
  await knex.schema.createTable('book_tags', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('color').defaultTo('#3498db');
    table.integer('priority').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Book tag assignments (many-to-many)
  await knex.schema.createTable('book_tag_assignments', (table) => {
    table.integer('book_id').unsigned().references('id').inTable('books').onDelete('CASCADE');
    table.integer('tag_id').unsigned().references('id').inTable('book_tags').onDelete('CASCADE');
    table.primary(['book_id', 'tag_id']);
  });

  // Book loans table
  await knex.schema.createTable('book_loans', (table) => {
    table.increments('id').primary();
    table.integer('book_id').unsigned().references('id').inTable('books').onDelete('CASCADE');
    table.string('borrower_name').notNullable();
    table.string('borrower_contact');
    table.timestamp('loaned_at').defaultTo(knex.fn.now());
    table.timestamp('due_date');
    table.timestamp('returned_at');
    table.text('notes');
  });

  // Insert default tags
  await knex('book_tags').insert([
    { name: 'Fiction', color: '#9b59b6', priority: 10 },
    { name: 'Non-Fiction', color: '#3498db', priority: 9 },
    { name: 'Fantasy', color: '#8e44ad', priority: 8 },
    { name: 'Sci-Fi', color: '#2980b9', priority: 7 },
    { name: 'Mystery', color: '#34495e', priority: 6 },
    { name: 'Romance', color: '#e91e63', priority: 5 },
    { name: 'Biography', color: '#16a085', priority: 4 },
    { name: 'History', color: '#d35400', priority: 3 },
    { name: 'Self-Help', color: '#27ae60', priority: 2 },
    { name: "Children's", color: '#f39c12', priority: 1 },
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('book_loans');
  await knex.schema.dropTableIfExists('book_tag_assignments');
  await knex.schema.dropTableIfExists('book_tags');
  await knex.schema.dropTableIfExists('books');
};
