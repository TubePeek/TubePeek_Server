
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.hasColumn('social_identities', 'full_name').then(function(result) {
            if(!result) {
                knex.schema.alterTable('social_identities', function(table) {
                    table.string('full_name')
                })
            } else {
                console.log("full_name column already exists in social_identities table")
            }
        })
    ])
};

exports.down = function(knex, Promise) {

};
