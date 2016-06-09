var dbObject = require('./DbObject');

function Users(tableName) {
  this.tableName = tableName;
}

Users.prototype = dbObject;

module.exports = new Users('usermaster');
