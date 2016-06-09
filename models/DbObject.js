var dbAccess = require('../db');

var DbObject = {};

DbObject.insert = function(insertData, callbackOnInsertDone) {
    return dbAccess(this.tableName).insert(insertData).then(function(theReturn) {
      //console.log("insert return: " + JSON.stringify(theReturn));
      //theReturn is NOT the value of the id of the newly inserted row

      callbackOnInsertDone();
    });
}

DbObject.findBy = function(columnName, columnVal, callbackOnResult) {
    var queryObj = {};
    queryObj[columnName] = columnVal;

    dbAccess(this.tableName).where(queryObj).select('*').then(function (results) {
        callbackOnResult(results);
    });
}

DbObject.deleteBy = function(columnName, columnVal, callbackOnDeleteDone) {
    dbAccess(this.tableName).where(columnName, columnVal).del().then(function(theReturn) {
        callbackOnDeleteDone(theReturn);
    });
}

DbObject.knex = dbAccess;

module.exports = DbObject;
