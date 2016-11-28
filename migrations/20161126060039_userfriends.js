
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('userfriends', function(table) {
            table.increments('id').primary();

            table.string('user_google_uid');
            table.string('friend_google_uid');
            table.boolean('is_friend_excluded');

            table.timestamps();
        })
    ])
};

exports.down = function(knex, Promise) {

};
