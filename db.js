var knexDbConfigs = require('./knexfile.js');

var dbEnvVariable = 'WatchWith_DbEnv';

if (process.env[dbEnvVariable] === undefined) {
    throw new Error('Environment variable for: ' + dbEnvVariable + ' must exist!');
} else {
    var dbEnv = process.env[dbEnvVariable];
    console.log("WatchWith_DbEnv: " + dbEnv);

    var currentDbConfig = knexDbConfigs[dbEnv];
    var watchWithDb = require('knex')(currentDbConfig);

    module.exports = watchWithDb;
    watchWithDb.migrate.latest([currentDbConfig]);
}
