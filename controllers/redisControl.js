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
}

redisControl.isConnectedToRedis = function () {
    return isConnected;
}

module.exports = redisControl;
