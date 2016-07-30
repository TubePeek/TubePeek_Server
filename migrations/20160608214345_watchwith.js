
exports.up = function(knex, Promise) {
    return Promise.all([
        knex.schema.createTable('usermaster', function(table) {
            table.increments('id').primary();
            table.string('email_address');
            table.timestamps();
        }),
        knex.schema.createTable('social_identities', function(table){
            table.increments('id').primary();
            table.integer('user_id').references('id').inTable('usermaster');
            table.string('provider');
            table.string('email_address');
            table.string('full_name');
            table.string('access_token');
            table.string('uid');
            table.string('expires_at');
            table.timestamps();
        }),
        knex.schema.createTable('videos', function(table){
            table.increments('id').primary();
            table.string('video_url');
            table.string('video_title');
            table.timestamps();
        })
    ])
};


exports.down = function(knex, Promise) {
    return Promise.all([
          knex.schema.dropTable('videos'),
          knex.schema.dropTable('social_identities'),
          knex.schema.dropTable('usermaster')
      ])
};
