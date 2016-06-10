var dbObject = require('./DbObject');

function WatchSessionUsers(tableName) {
  this.tableName = tableName;
}

WatchSessionUsers.prototype = dbObject;

var watchSessionUsersTable = new WatchSessionUsers('watchsessions_users');

module.exports = watchSessionUsersTable;
