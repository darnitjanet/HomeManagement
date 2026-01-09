/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Core notifications table
    .createTable('notifications', (table) => {
      table.increments('id').primary();

      // Notification content
      table.string('type').notNullable(); // 'calendar_reminder', 'task_due', 'chore_due', 'game_overdue', 'bill_due', etc.
      table.string('title').notNullable();
      table.text('message').notNullable();
      table.string('icon').nullable(); // lucide icon name
      table.string('priority').defaultTo('normal'); // 'low', 'normal', 'high', 'urgent'

      // Related entity (polymorphic)
      table.string('entity_type').nullable(); // 'todo', 'chore', 'calendar_event', 'game_loan', etc.
      table.integer('entity_id').nullable();

      // Status
      table.boolean('is_read').defaultTo(false);
      table.boolean('is_dismissed').defaultTo(false);

      // Scheduling
      table.timestamp('scheduled_for').nullable(); // When to show the notification
      table.timestamp('expires_at').nullable(); // Auto-dismiss after this time

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('read_at').nullable();

      // Indexes
      table.index(['is_read', 'is_dismissed']);
      table.index('scheduled_for');
      table.index(['entity_type', 'entity_id']);
    })

    // User notification preferences
    .createTable('notification_preferences', (table) => {
      table.increments('id').primary();

      // Email settings
      table.string('digest_email').nullable(); // Email for daily digest
      table.boolean('digest_enabled').defaultTo(false);
      table.string('digest_time').defaultTo('07:00'); // HH:mm format

      // Notification type toggles
      table.boolean('calendar_reminders').defaultTo(true);
      table.boolean('task_due_alerts').defaultTo(true);
      table.boolean('chore_due_alerts').defaultTo(true);
      table.boolean('game_overdue_alerts').defaultTo(true);
      table.boolean('bill_reminders').defaultTo(true);

      // Reminder timing (minutes before event)
      table.integer('calendar_reminder_minutes').defaultTo(30);
      table.integer('task_reminder_minutes').defaultTo(60);

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })

    // Daily digest log (to track sent digests)
    .createTable('digest_logs', (table) => {
      table.increments('id').primary();
      table.date('digest_date').notNullable();
      table.string('email_to').notNullable();
      table.integer('events_count').defaultTo(0);
      table.integer('tasks_count').defaultTo(0);
      table.integer('chores_count').defaultTo(0);
      table.text('content_summary').nullable(); // JSON summary of what was sent
      table.boolean('success').defaultTo(false);
      table.text('error_message').nullable();
      table.timestamp('sent_at').defaultTo(knex.fn.now());

      table.unique(['digest_date', 'email_to']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('digest_logs')
    .dropTableIfExists('notification_preferences')
    .dropTableIfExists('notifications');
};
