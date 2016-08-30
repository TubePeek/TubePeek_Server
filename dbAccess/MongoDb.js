var mongoose = require('mongoose');
var FriendsList = require('../models/FriendsList');
var Constants = require('../Constants');

//var dbURI = 'mongodb://localhost:' + Constants.MONGO_SERVER_PORT + '/' + Constants.MONGO_DB_NAME;
var dbURI = 'mongodb://localhost/' + Constants.MONGO_DB_NAME;
var isConnected =  false;

mongoose.connection.on('connected', function () {
    console.log('Mongoose default connection open to ' + dbURI);
    isConnected = true;
});

mongoose.connection.on('error',function (err) {
    console.log('Mongoose default connection error: ' + err);
    isConnected = false;
});

mongoose.connection.on('disconnected', function () {
    console.log('Mongoose default connection disconnected');
    isConnected = false;
});

process.on('SIGINT', function() {
    mongoose.connection.close(function () {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});


module.exports = {
    initialize : function () {
        console.log("\nInside MongoDb.js initialize function.\n");
        mongoose.connect(dbURI);
    },
    isConnected : function () {
        return isConnected;
    },
    FriendsList : {
        add : function (googleUserId, friendsListObj) {

        },
        get : function (googleUserId) {

        },
        remove : function (googleUserId) {

        }
    }
};
