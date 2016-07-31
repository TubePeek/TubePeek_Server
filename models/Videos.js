var dbObject = require('./DbObject');

function Videos(tableName) {
    this.tableName = tableName;
}

Videos.prototype = dbObject;

var videosTable = new Videos('videos');
videosTable.insert = function(insertData, callbackOnInsertDone) {
    dbObject.knex.insert(insertData).returning('id').into(this.tableName)
    .then(function (id) {
        callbackOnInsertDone(parseInt(id));
    });
}

module.exports = videosTable;
