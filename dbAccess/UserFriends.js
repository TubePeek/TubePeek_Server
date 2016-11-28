var dbObject = require('./DbObject');

function UserFriends(tableName) {
    this.tableName = tableName;
}

UserFriends.prototype = dbObject;

var userFriendsTable = new UserFriends('userfriends');

// This will return a promise
userFriendsTable.getFriends = function(userGoogleUserId) {
    return this.knex(this.tableName).where({
        'user_google_uid' : userGoogleUserId
    }).select('*');
};

userFriendsTable.findFriend = function(userGoogleUserId, friendGoogleUserId, callbackOnResult) {
    this.knex(this.tableName).where({
        'user_google_uid': userGoogleUserId,
        'friend_google_uid': friendGoogleUserId
    })
    .innerJoin('social_identities', 'userfriends.friend_google_uid', 'social_identities.uid')
    .select('*').then(function (results) {
        callbackOnResult(results);
    });
}

userFriendsTable.getFriends = function (userGoogleUserId, callbackOnResult) {
    this.knex(this.tableName).where({
        'user_google_uid': userGoogleUserId
    })
    .innerJoin('social_identities', 'userfriends.friend_google_uid', 'social_identities.uid')
    .select('*').then(function (results) {
        callbackOnResult(results);
    });
};

userFriendsTable.doesExclusionExist = function (myGoogleUserId, friendGoogleUserId, callbackOnResult) {
    this.knex(this.tableName).where({
        'user_google_uid': myGoogleUserId,
        'friend_google_uid': friendGoogleUserId,
        'is_friend_excluded': true
    }).select('*').then(function (results) {
        console.log("Inside doesExclusionExist! results: " + JSON.stringify(results));
        if (results && results.length == 0) {
            callbackOnResult(false);
        } else {
            callbackOnResult(true);
        }
    });
};

userFriendsTable.setFriendExclusion = function(userGoogleUserId, friendGoogleUserId, shouldExclude, currentDateTime, onSetDone) {
    this.knex(this.tableName).where({
        'user_google_uid' : userGoogleUserId,
        'friend_google_uid' : friendGoogleUserId
    })
    .update({
        'updated_at' : currentDateTime,
        'is_friend_excluded' : shouldExclude
    })
    .then(function (count) {
        onSetDone();
    });
};

userFriendsTable.addOneFriend = function(userGoogleUserId, friendGoogleUserId, currentDateTime, onAdditionDone) {
    var that = this;
    this.knex(this.tableName).where({
        'user_google_uid': userGoogleUserId,
        'friend_google_uid': friendGoogleUserId
    })
    .select('*').then(function (results) {
        if(results && results.length > 0) {
            onAdditionDone(null);
        } else {
            that.knex(that.tableName).insert({
                'user_google_uid': userGoogleUserId,
                'friend_google_uid': friendGoogleUserId,
                'is_friend_excluded': false,
                'created_at': currentDateTime
            })
            .returning('id').into(that.tableName)
            .then(function (id) {
                onAdditionDone(id);
            });
        }
    });
}

module.exports = userFriendsTable;
