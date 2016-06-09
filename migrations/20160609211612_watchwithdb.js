
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.alterTable('usermaster', function(table) {
            table.string('dummy_field');
        })
    ])
};

exports.down = function(knex, Promise) {

};
