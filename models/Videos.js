var dbObject = require('./DbObject');

function Videos(tableName) {
  this.tableName = tableName;
}

Videos.prototype = dbObject;

module.exports = new Videos('videos');
