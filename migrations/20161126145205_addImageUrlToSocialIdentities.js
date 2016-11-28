
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.alterTable('social_identities', function(table) {
            table.string('image_url')
        })
    ])
};

exports.down = function(knex, Promise) {

};
