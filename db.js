var config = require('./knexfile.js');

var dbEnvVariable = 'WatchWith_DbEnv';

if (process.env[dbEnvVariable] === undefined){
    throw new Error('You must create an environment variable for ' + dbEnvVariable);
} else {
    var dbEnv = process.env[dbEnvVariable];
    console.log("WatchWith_DbEnv: " + dbEnv);
    var knex = require('knex')(config[dbEnv]);

    module.exports = knex;
    knex.migrate.latest([config]);
}
