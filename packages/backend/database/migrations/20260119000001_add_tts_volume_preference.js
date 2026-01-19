/**
 * Add TTS volume preference
 */
exports.up = function(knex) {
  return knex.schema.alterTable('notification_preferences', (table) => {
    table.float('tts_volume').defaultTo(0.8);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('notification_preferences', (table) => {
    table.dropColumn('tts_volume');
  });
};
