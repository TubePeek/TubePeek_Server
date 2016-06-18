var dbObject = require('./DbObject');

function SocialIdentities(tableName) {
    this.tableName = tableName;
}

SocialIdentities.prototype = dbObject;

var socialIdentitiesTable = new SocialIdentities('social_identities');
socialIdentitiesTable.findByUserIdAndProvider = function(theUserId, socialProvider) {
    var queryObj = {};
    queryObj['uid'] = theUserId;
    queryObj.provider = socialProvider;

    //returning the promise to the caller
    return dbObject.knex(this.tableName).where(queryObj).select('*');
}

module.exports = socialIdentitiesTable;
