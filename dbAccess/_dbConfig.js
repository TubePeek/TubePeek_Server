var knex = require('knex');

var knexDbConfigs = {};

knexDbConfigs['development'] = {
    client: 'pg',
    connection: {
        host : '127.0.0.1',
        user : 'postgres',
        password : 'asdffdsa',
        database : 'tubepeekdb'
    }
};

knexDbConfigs['AmazonEc2'] = knexDbConfigs['development'];

//--

var dbEnvVariable = 'WatchWith_DbEnv';

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
