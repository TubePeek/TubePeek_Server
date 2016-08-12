var dbObject = require('./DbObject');

function Users(tableName) {
    this.tableName = tableName;
}

Users.prototype = dbObject;

var usersTable = new Users('usermaster');

usersTable.findByEmail = function(theEmail, callbackOnResult) {
    this.findBy('email_address', theEmail, callbackOnResult);
}

usersTable.insert = function(insertData, callbackOnInsertDone) {
    dbObject.knex.insert(insertData).returning('id').into(this.tableName)
    .then(function (id) {
        callbackOnInsertDone(parseInt(id));
    });
}

usersTable.insertEmail = function(theEmail, createdAt, callbackOnInsertDone) {
    this.insert({
        'email_address': theEmail,
        'created_at': createdAt
    }, callbackOnInsertDone);
}

module.exports = usersTable;
