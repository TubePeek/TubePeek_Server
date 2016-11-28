var dbObject = require('./DbObject');

function SocialIdentities(tableName) {
    this.tableName = tableName;

    this.COLUMNS = {};
    this.COLUMNS.USER_ID = 'user_id';           // This is from our database(usermaster 'id' column)
    this.COLUMNS.UID = 'uid';                   // This value is from Google
    this.COLUMNS.PROVIDER = 'provider';
    this.COLUMNS.EMAIL_ADDRESS = 'email_address';
    this.COLUMNS.FULL_NAME = 'full_name';
    this.COLUMNS.IMAGE_URL = 'image_url';

    this.COLUMNS.ACCESS_TOKEN = 'access_token';
    this.COLUMNS.EXPIRES_AT = 'expires_at';
    this.COLUMNS.CREATED_AT = 'created_at';
    this.COLUMNS.UPDATED_AT = 'updated_at';
}


SocialIdentities.prototype = dbObject;

var socialIdentitiesTable = new SocialIdentities('social_identities');
socialIdentitiesTable.findByUIdAndProvider = function(theUId, socialProvider) {
    var queryObj = {};
    queryObj['uid'] = theUId;
    queryObj.provider = socialProvider;

    //returning the promise to the caller
    return dbObject.knex(this.tableName).where(queryObj).select('*');
}

socialIdentitiesTable.insertSocialIdentify = function(socialProvider, authData, idOfUser, createdAt, callbackWhenDone) {
    var socialIdentityInsertObj = {};
    socialIdentityInsertObj[this.COLUMNS.PROVIDER] = socialProvider;
    socialIdentityInsertObj[this.COLUMNS.USER_ID] = idOfUser;
    socialIdentityInsertObj[this.COLUMNS.UID] = authData.uid;
    socialIdentityInsertObj[this.COLUMNS.EMAIL_ADDRESS] = authData.emailAddress;
    socialIdentityInsertObj[this.COLUMNS.FULL_NAME] = authData.fullName;
    socialIdentityInsertObj[this.COLUMNS.IMAGE_URL] = authData.imageUrl;
    socialIdentityInsertObj[this.COLUMNS.ACCESS_TOKEN] = authData.accessToken;
    socialIdentityInsertObj[this.COLUMNS.EXPIRES_AT] = authData.accessTokenExpiry;
    socialIdentityInsertObj[this.COLUMNS.CREATED_AT] = createdAt;

    this.insert(socialIdentityInsertObj, callbackWhenDone);
}

socialIdentitiesTable.updateSocialIdentify = function(socialProvider, authData, updatedAt, callbackWhenDone) {
    var socialIdentityUpdateObj = {};
    socialIdentityUpdateObj[this.COLUMNS.EMAIL_ADDRESS] = authData.emailAddress;
    socialIdentityUpdateObj[this.COLUMNS.FULL_NAME] = authData.fullName;
    socialIdentityUpdateObj[this.COLUMNS.IMAGE_URL] = authData.imageUrl;
    socialIdentityUpdateObj[this.COLUMNS.ACCESS_TOKEN] = authData.accessToken;
    socialIdentityUpdateObj[this.COLUMNS.EXPIRES_AT] = authData.accessTokenExpiry;
    socialIdentityUpdateObj[this.COLUMNS.UPDATED_AT] = updatedAt;

    var selectQueryObj = {};
    selectQueryObj[this.COLUMNS.PROVIDER] = socialProvider;
    selectQueryObj[this.COLUMNS.UID] = authData.uid;

    this.knex(this.tableName).where(selectQueryObj)
    .update(socialIdentityUpdateObj)
    .then(function (count) {
        console.log("Updated social identity: Num rows affected: " + count);
        callbackWhenDone();
    });
}


module.exports = socialIdentitiesTable;
