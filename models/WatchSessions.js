var dbObject = require('./DbObject');

function WatchSessions(tableName) {
  this.tableName = tableName;
}

WatchSessions.prototype = dbObject;

module.exports = new WatchSessions('watchsessions');
