
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('friend_exclusions', function(table){
            table.increments('id').primary();
            table.string('my_uid');
            table.string('social_provider');
            table.string('friend_uid');
            table.string('friend_full_name');
            table.string('friend_image_url');
        })
    ]);
};

exports.down = function(knex, Promise) {
};
