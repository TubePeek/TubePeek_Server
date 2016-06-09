var dbObject = require('./DbObject');

function Users(tableName) {
    this.tableName = tableName;
}

Users.prototype = dbObject;

Users.insert = function(insertData, callbackOnInsertDone) {
    this.knex.insert(insertData)
    .returning('id')
    .into(this.tableName)
    .then(function (id) {
        callbackOnInsertDone(id);
    });

    // var theId = dbObject.knex(this.tableName).insert(insertData);
    // callbackOnResult(theId);


    // return dbObject.knex(this.tableName).insert(insertData).then(function(theReturn) {
    //   //console.log("insert return: " + JSON.stringify(theReturn));
    //   //theReturn is NOT the value of the id of the newly inserted row
    //
    //   callbackOnInsertDone();
    // });
}

module.exports = new Users('usermaster');
