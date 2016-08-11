var redis = require('redis');

var watchWithRedisConn = {};

var client = null;

watchWithRedisConn.initiateConnection = function () {
    client = redis.createClient(); //creates a new client


    client.on('connect', function() {
        console.log('[WatchWith_Server] Connected to redis');


    });
}

module.exports = watchWithRedisConn;
