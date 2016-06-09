var dbObject = require('./DbObject');

function SocialIdentities(tableName) {
  this.tableName = tableName;
}

SocialIdentities.prototype = dbObject;


SocialIdentities.findByUserIdAndProvider = function(theUserId, socialProvider, callbackOnResult) {
  var queryObj = {};
  queryObj['user_id'] = theUserId;
  queryObj.provider = socialProvider;

  dbAccess.knex(this.tableName).where(queryObj).select('*').then(function (results) {
    callbackOnResult(results);
  });
}

module.exports = new SocialIdentities('social_identities');
