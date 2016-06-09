
exports.up = function(knex, Promise) {

};

exports.down = function(knex, Promise) {
    return Promise.all([
        knex.schema.table('usermaster', function(table){
            table.dropColumn('dummy_field');
        })
    ])
};
