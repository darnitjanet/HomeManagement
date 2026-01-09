/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('contact_tags', (table) => {
    table.string('google_group_resource_name').nullable();
    table.index('google_group_resource_name');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('contact_tags', (table) => {
    table.dropColumn('google_group_resource_name');
  });
};
