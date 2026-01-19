/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('packages', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable(); // Description of what's in the package
    table.string('tracking_number');
    table.string('carrier'); // ups, fedex, usps, amazon, dhl, other
    table.string('carrier_url'); // Custom tracking URL if needed

    // Status: ordered, shipped, in_transit, out_for_delivery, delivered, exception
    table.string('status').defaultTo('ordered');

    // Dates
    table.date('order_date');
    table.date('expected_delivery');
    table.date('actual_delivery');

    // Optional details
    table.string('order_number'); // Store/vendor order number
    table.string('vendor'); // Where ordered from (Amazon, Target, etc.)
    table.decimal('cost', 10, 2); // Package cost
    table.text('notes');

    // For notification tracking
    table.boolean('notify_on_delivery').defaultTo(true);
    table.timestamp('last_notified_at');

    // Archive delivered packages instead of deleting
    table.boolean('is_archived').defaultTo(false);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('packages');
};
