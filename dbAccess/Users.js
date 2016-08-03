var dbObject = require('./DbObject');

function Users(tableName) {
    this.tableName = tableName;
}

Users.prototype = dbObject;

var usersTable = new Users('usermaster');
usersTable.insert = function(insertData, callbackOnInsertDone) {
    dbObject.knex.insert(insertData).returning('id').into(this.tableName)
    .then(function (id) {
        callbackOnInsertDone(parseInt(id));
    });
}

module.exports = usersTable;
