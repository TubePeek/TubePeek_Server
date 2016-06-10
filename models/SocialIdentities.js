var dbObject = require('./DbObject');

function SocialIdentities(tableName) {
  this.tableName = tableName;
}

SocialIdentities.prototype = dbObject;


SocialIdentities.prototype.findByUserIdAndProvider = function(theUserId, socialProvider, callbackOnResult) {
  var queryObj = {};
  queryObj['uid'] = theUserId;
  queryObj.provider = socialProvider;

  dbObject.knex(this.tableName).where(queryObj).select('*').then(function (results) {
    callbackOnResult(results);
  });
}

module.exports = new SocialIdentities('social_identities');
