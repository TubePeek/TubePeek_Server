var dbObject = require('./DbObject');

function FriendExclusions(tableName) {
    this.tableName = tableName;

    this.COLUMNS = {
        my_uid : 'my_uid',
        social_provider : 'social_provider',
        friend_uid : 'friend_uid',
        friend_full_name : 'friend_full_name',
        friend_image_url : 'friend_image_url'
    };
}

FriendExclusions.prototype = dbObject;

var friendExclusionsTable = new FriendExclusions('friend_exclusions');

friendExclusionsTable.getExclusionsForUser = function (myGoogleUserId, callbackOnResult) {
    this.knex(this.tableName).where({
        'my_uid': myGoogleUserId
    }).select('*').then(function (results) {
        callbackOnResult(results);
    });
}

friendExclusionsTable.doesExclusionExist = function (myGoogleUserId, friendGoogleUserId, callbackOnResult) {
    return this.knex(this.tableName).where({
        'my_uid': myGoogleUserId,
        'friend_uid': friendGoogleUserId,
    }).select('*').then(function (results) {
        console.log("Inside doesExclusionExist! results: " + JSON.stringify(results));
        if (results && results.length == 0) {
            callbackOnResult(false);
        } else {
            callbackOnResult(true);
        }
    });
}

friendExclusionsTable.add = function(myGoogleUserId, socialProvider, friendGoogleUserId,
    friendFullName, friendImageUrl, callbackOnInsertDone) {
    dbObject.knex.insert({
        'my_uid': myGoogleUserId,
        'social_provider': socialProvider,
        'friend_uid': friendGoogleUserId,
        'friend_full_name': friendFullName,
        'friend_image_url': friendImageUrl
    })
    .returning('id').into(this.tableName)
    .then(function (id) {
        callbackOnInsertDone(parseInt(id));
    });
}

friendExclusionsTable.delete = function(myGoogleUserId, friendGoogleUserId, callbackOnDeleteDone) {
    this.knex(this.tableName).where({
        my_uid : myGoogleUserId,
        friend_uid : friendGoogleUserId
    }).del().then(function(theReturn) {
        callbackOnDeleteDone(theReturn);
    });
}

module.exports = friendExclusionsTable;
