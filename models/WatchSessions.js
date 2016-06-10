var dbObject = require('./DbObject');

function WatchSessions(tableName) {
  this.tableName = tableName;
}

WatchSessions.prototype = dbObject;

var watchSessionsTable = new WatchSessions('watchsessions');

module.exports = watchSessionsTable;
