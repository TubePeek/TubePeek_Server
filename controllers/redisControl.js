var redis = require('redis');
var Constants = require('../Constants');

var redisClient = null;
var isConnected = false;

var redisControl = {};

redisControl.initiateConnection = function () {
    redisClient = redis.createClient(); //creates a new client

    redisClient.on('connect', function() {
        console.log('[' + Constants.AppName + '] connected to redis');
        isConnected = true;
    });

    redisClient.on("error", function (err) {
        console.log('[' + Constants.AppName + '] DISConnected from redis. \n' + err);
        isConnected = false;
    });
}

redisControl.isConnectedToRedis = function () {
    return isConnected;
}

module.exports = redisControl;
