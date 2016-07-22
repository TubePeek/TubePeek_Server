
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
        }),
        knex.schema.createTable('videos', function(table){
            table.increments('video_id').primary();
            table.string('video_url');
            table.string('video_title');
            table.string('video_summary');
            table.string('video_type');
        }),
        knex.schema.createTable('watchsessions', function(table){
            table.increments('session_id').primary();
            table.string('unique_sessionid');
            table.integer('creator_user_id').references('id').inTable('usermaster');
            table.integer('video_id').references('video_id').inTable('videos');
            table.string('date_created');
        }),
        knex.schema.createTable('watchsessions_users', function(table){
            table.increments('id').primary();
            table.integer('watch_session_id').references('session_id').inTable('watchsessions');
            table.integer('user_id').references('id').inTable('usermaster');
        })
    ])
};


exports.down = function(knex, Promise) {
    return Promise.all([
          knex.schema.dropTable('watchsessions_users'),
          knex.schema.dropTable('watchsessions'),
          knex.schema.dropTable('videos'),
          knex.schema.dropTable('social_identities'),
          knex.schema.dropTable('usermaster')
      ])
};
