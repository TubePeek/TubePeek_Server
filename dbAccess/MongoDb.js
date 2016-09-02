var mongoose = require('mongoose');
var FriendsList = require('../models/FriendsList');
var Constants = require('../Constants');

//var dbURI = 'mongodb://localhost:' + Constants.MONGO_SERVER_PORT + '/' + Constants.MONGO_DB_NAME;
var dbURI = 'mongodb://localhost/' + Constants.MONGO_DB_NAME;
var isConnected =  false;
//mongoose.Promise = global.Promise;

//-- Mongoose callbacks
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


// Here, I insert the friends into Mongo I need to make sure that the friends list
// that already exists isn't overwritten. So what I do is to kinda merge the friends
// coming in with the friends already existing while avoiding duplicates
function addBulk (theGoogleUserId, friendsObj, callBackOnInsertDone) {
    var friendsArrayFromOTA = turnFriendsToList(friendsObj);

    this.get(theGoogleUserId, function (friendsArrayFromDb) {
        var friendsFromOTALength = friendsArrayFromOTA.length;
        var mergedFriends = friendsArrayFromDb;

        for (var i = 0; i < friendsFromOTALength; i++) {
            var friendFromOTA = friendsArrayFromOTA[i];
            var didFindFriend = false;

            var friendsFromDbLength = friendsArrayFromDb.length;
            for (var j = 0; j < friendsFromDbLength; j++) {
                var friendFromDb = friendsArrayFromDb[j];
                if(friendFromOTA.googleUserId === friendFromDb.googleUserId) {
                    didFindFriend = true;
                    break;
                }
            }
            if(!didFindFriend)
                mergedFriends.push(friendFromOTA);
        }
        //--
        FriendsList.findOneAndUpdate({googleUserId : theGoogleUserId}, {
            googleUserId : theGoogleUserId,
            friends : mergedFriends
        }, {upsert : true}, function(err, doc) {
            if (err) {
                callBackOnInsertDone(friendsArrayFromDb);
            } else {
                callBackOnInsertDone(mergedFriends);
            }
        });
    });
}

function get (theGoogleUserId, callBackOnQueryDone) {
    FriendsList.find({googleUserId: theGoogleUserId}, function(err, queryResult) {
        if (err) {
            callBackOnQueryDone([]);
        } else {
            if(queryResult.length > 0)
                callBackOnQueryDone(queryResult[0].friends);
            else
                callBackOnQueryDone([]);
        }
    });
}

function doesFriendExist (theGoogleUserId, friendGoogleUserId, callBackOnQueryDone) {
    this.get(theGoogleUserId, function (friendsArray) {
        var friendExists = false;
        for (var i = 0; i < friendsArray.length; i++) {
            var friend = friendsArray[i];
            if(friend.googleUserId == friendGoogleUserId) {
                friendExists = true;
                break;
            }
        }
        callBackOnQueryDone(friendExists);
    });
}

function remove (theGoogleUserId, callBackOnDeleteDone) {
    FriendsList.findOneAndRemove({googleUserId: theGoogleUserId}, function(err) {
        if (err) {
            callBackOnDeleteDone(false);
        } else {
            callBackOnDeleteDone(true);
        };
    });
}

function addOneFriend (theGoogleUserId, friendGoogleUserId, friendFullName, friendImageUrl, callBackOnInsertDone) {
    this.get(theGoogleUserId, function (friendsArray) {
        friendsArray.push({
            googleUserId : friendGoogleUserId,
            fullName : friendFullName,
            imageUrl : friendImageUrl,
            isExcluded : false
        });
        FriendsList.findOneAndUpdate({googleUserId : theGoogleUserId}, {
            googleUserId : theGoogleUserId,
            friends : friendsArray
        }, {upsert:true}, function(err, doc) {
            if (err) {
                callBackOnInsertDone(false);
            } else {
                callBackOnInsertDone(true);
            }
        });
    });
}


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
    return arr;
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
        addBulk : addBulk,
        addOneFriend : addOneFriend,
        get : get,
        doesFriendExist : doesFriendExist,
        remove : remove
    }
};
