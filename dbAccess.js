"use strict";


function getDbConfig () {
  var theDbConfig = {client: 'pg'};

  if (process.env.HEROKU_POSTGRESQL_BRONZE_URL) {
    var parseDbUrl = require("parse-database-url");
    var parsedDbConfig = parseDbUrl(process.env.HEROKU_POSTGRESQL_BRONZE_URL);
    theDbConfig.connection = {
      host : parsedDbConfig.host,
      user : parsedDbConfig.user,
      password : parsedDbConfig.password,
      database  : parsedDbConfig.database
    };
  } else {
    theDbConfig.connection = {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'asdffdsa',
      database : 'watchwithdb'
    };
  }
  theDbConfig.connection.charset = 'utf8';
  return theDbConfig;
}

var dbConfig = getDbConfig();
var knex = require('knex')(dbConfig);

// Exports knex in case we need direct access to knex outside this file
module.exports.knex = knex;
