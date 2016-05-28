var dbConfig = {client: 'pg'};

if (process.env.HEROKU_POSTGRESQL_BRONZE_URL) {
  var parseDbUrl = require("parse-database-url");
  var parsedDbConfig = parseDbUrl(process.env.HEROKU_POSTGRESQL_BRONZE_URL);

  dbConfig.connection = {
    host : parsedDbConfig.host,
    user : parsedDbConfig.user,
    password : parsedDbConfig.password,
    database : parsedDbConfig.database,
    charset : 'utf8'
  };
} else {
  dbConfig.connection = {
    host     : '127.0.0.1',
    user     : 'postgres',
    password : 'asdffdsa',
    database : 'letswatchdb',
    charset  : 'utf8'
  };
}
//console.log(JSON.stringify(dbConfig));

var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);

//--Setup Database schema
var User = bookshelf.Model.extend({
  tableName: 'users'
});






module.exports = bookshelf;
