
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.alterTable('social_identities', function(table) {
            table.string('full_name');
        })
    ])
};

exports.down = function(knex, Promise) {

};
