
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('invites', function(table) {
            table.increments('id').primary();
            table.integer('requester_user_id').references('id').inTable('usermaster');
            table.string('requester_google_uid');

            table.integer('recipient_user_id').references('id').inTable('usermaster');
            table.string('recipient_google_uid');

            table.string('is_accepted');
            table.string('is_rejected');

            table.datetime('date_accepted');
            table.datetime('date_rejected');

            table.datetime('created_at');
        })
    ])
};

exports.down = function(knex, Promise) {

};
