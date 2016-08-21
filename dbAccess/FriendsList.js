var dbObject = require('./DbObject');

function FriendsList(tableName) {
    this.tableName = tableName;

    this.COLUMNS = {
        SOCIAL_IDENTITY_ID : 'social_identity_id',  // This is from our database('social_identities' table, 'id' column)
        FRIEND_UID : 'uid',                         // This value is from Google
        FULL_NAME : 'full_name',
        IMAGE_URL : 'image_url',
        IS_ENABLED : 'is_enabled'
    };
}

FriendsList.prototype = dbObject;

var friendsListTable = new FriendsList('friends_list');






module.exports = friendsListTable;
