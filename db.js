var config = require('./knexfile.js');

var dbEnvVariable = 'WatchWith_DbEnv';

if (process.env[dbEnvVariable] === undefined){
    throw new Error('Environment variable for: ' + dbEnvVariable + ' must exist!');
} else {
    var dbEnv = process.env[dbEnvVariable];
    console.log("WatchWith_DbEnv: " + dbEnv);
    var knex = require('knex')(config[dbEnv]);

    module.exports = knex;
    knex.migrate.latest([config]);
}
