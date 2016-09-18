
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('uservideos', function(table) {
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('usermaster');
            table.integer('video_id').references('id').inTable('videos');
            table.timestamps();
        })
    ])
};

exports.down = function(knex, Promise) {

};
