var dbAccess = require('../db');

var DbObject = {};


DbObject.findBy = function(columnName, columnVal, callbackOnResult) {
    var queryObj = {};
    queryObj[columnName] = columnVal;
    //console.log("select query obj: " + JSON.stringify(queryObj));

    dbAccess(this.tableName).where(queryObj).select('*').then(function (results) {
        callbackOnResult(results);
    });
    //--
    // var sqlSelectQuery = 'select * from ' + this.tableName + ' where ' + columnName + ' = ?';
    // dbAccess.raw(sqlSelectQuery, [columnVal]).then(function(results) {
    //     //console.log("Result from videos query: " + JSON.stringify(results.rows));
    //     callbackOnResult(results.rows);
    // });
}

//This exists for inserts that don't need the id of the newly inserted row
//If the id of the newly inserted row is needed then create a model that extends
//from DbObject then override the insert function
DbObject.insert = function(insertData, callbackOnInsertDone) {
    dbAccess(this.tableName).insert(insertData).then(function() {
         callbackOnInsertDone();
     });
}

DbObject.deleteBy = function(columnName, columnVal, callbackOnDeleteDone) {
    dbAccess(this.tableName).where(columnName, columnVal).del().then(function(theReturn) {
        callbackOnDeleteDone(theReturn);
    });
}

DbObject.knex = dbAccess;

module.exports = DbObject;
