var dbObject = require('./DbObject');

function WatchSessionUsers(tableName) {
  this.tableName = tableName;
}

WatchSessionUsers.prototype = dbObject;

module.exports = new WatchSessionUsers('watchsessions_users');
