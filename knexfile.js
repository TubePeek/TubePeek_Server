// Update with your config settings.

module.exports = {

  development: {
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : 'asdffdsa',
        database : 'tubepeekdb'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      database: 'my_db',
      user:     'username',
      password: 'password'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'pg',
    connection: {
      host: 'tubepeekamazonrdsdb.cutj5lmx1hzt.eu-central-1.rds.amazonaws.com'
      database: 'tubepeekdb',
      user:     'postgres',
      password: 'asdffdsa'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
