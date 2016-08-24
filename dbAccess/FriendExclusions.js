var dbObject = require('./DbObject');

function FriendExclusions(tableName) {
    this.tableName = tableName;

    this.COLUMNS = {
        user_email : 'email_address',
        social_provider : 'social_provider',
        friend_uid : 'friend_uid',
        friend_full_name : 'friend_full_name',
        friend_image_url : 'friend_image_url'
    };
}

FriendExclusions.prototype = dbObject;

var friendExclusionsTable = new FriendExclusions('friend_exclusions');

friendExclusionsTable.add = function(userEmail, socialProvider, friendGoogleUserId,
    friendFullName, friendImageUrl, callbackOnInsertDone) {

    dbObject.knex.insert({
        'email_address': userEmail,
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

friendExclusionsTable.delete = function(userEmail, friendGoogleUserId, callbackOnDeleteDone) {
    this.knex(this.tableName).where({
        email_address : userEmail,
        friend_uid : friendGoogleUserId
    }).del().then(function(theReturn) {
        callbackOnDeleteDone(theReturn);
    });
}

module.exports = friendExclusionsTable;
