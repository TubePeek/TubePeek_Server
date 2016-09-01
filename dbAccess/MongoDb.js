var mongoose = require('mongoose');
var FriendsList = require('../models/FriendsList');
var Constants = require('../Constants');

//var dbURI = 'mongodb://localhost:' + Constants.MONGO_SERVER_PORT + '/' + Constants.MONGO_DB_NAME;
var dbURI = 'mongodb://localhost/' + Constants.MONGO_DB_NAME;
var isConnected =  false;
//mongoose.Promise = global.Promise;

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

function turnFriendsToList(friendsObj) {
    var arr = [];
    for (var prop in friendsObj) {
        if (friendsObj.hasOwnProperty(prop)) {
            var friendObj = friendsObj[prop];
            friendObj.googleUserId = prop;
            if(friendObj.isExcluded === undefined) {
                friendObj.isExcluded = false;
            }
            arr.push(friendObj);
        }
    }
    return arr; // returns array
}


module.exports = {
    initialize : function () {
        console.log("\nInside MongoDb.js initialize function.\n");
        mongoose.connect(dbURI, {server: {auto_reconnect: true}});
    },
    isConnected : function () {
        return isConnected;
    },
    FriendsList : {
        add : function (theGoogleUserId, friendsObj, callBackOnInsertDone) {
            console.log("Inside MongoDb.js ... add function!");
            var friendsArray = turnFriendsToList(friendsObj);
            var newFriendsList = new FriendsList ({
                googleUserId : theGoogleUserId,
                friends : friendsArray
            });

            newFriendsList.save(function (err) {
                if (err) {
                    // Error may be thrown here because of attempt to insert duplicate document.
                    // That's ok because the googleUserId has been defined to be unique.
                    callBackOnInsertDone(false);
                } else {
                    callBackOnInsertDone(true);
                }
            });
        },
        get : function (theGoogleUserId, callBackOnQueryDone) {
            FriendsList.find({googleUserId: theGoogleUserId}, function(err, queryResult) {
                if (err) {
                    callBackOnQueryDone([]);
                } else {
                    //console.log("query results: " + JSON.stringify(queryResult));
                    callBackOnQueryDone(queryResult[0].friends);
                }
            });
        },
        remove : function (theGoogleUserId, callBackOnDeleteDone) {
            FriendsList.findOneAndRemove({googleUserId: theGoogleUserId}, function(err) {
                if (err) {
                    callBackOnDeleteDone(false);
                } else {
                    callBackOnDeleteDone(true);
                };
            });
        }
    }
};
