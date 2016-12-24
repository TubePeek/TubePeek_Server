
var knex = require('knex');
var KnexFile = require('../knexfile');

var knexDbConfigs = {};
knexDbConfigs['development'] = KnexFile['development'];
knexDbConfigs['AmazonEc2'] = KnexFile['development'];
knexDbConfigs['production'] = KnexFile['production'];

//--

var dbEnvVariable = 'WatchWith_DbEnv';
process.env[dbEnvVariable] = "production";

if (process.env[dbEnvVariable] !== undefined) {
    var dbEnv = process.env[dbEnvVariable];
    console.log("WatchWith_DbEnv: " + dbEnv);

    var currentDbConfig = knexDbConfigs[dbEnv];
    var tubepeekDb = knex(currentDbConfig);

    module.exports = tubepeekDb;
    tubepeekDb.migrate.latest([currentDbConfig]);
} else {
    throw new Error('Environment variable for: ' + dbEnvVariable + ' must exist!');
}
