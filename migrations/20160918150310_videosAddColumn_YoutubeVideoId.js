
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.alterTable('videos', function(table) {
            table.string('youtube_video_id')
        })
    ])
};

exports.down = function(knex, Promise) {

};
