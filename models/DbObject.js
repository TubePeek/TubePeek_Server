var dbAccess = require('../dbAccess');

var DbObject = {};

DbObject.insert = function(insertData, callbackOnInsertDone) {
    return dbAccess.knex(this.tableName).insert(insertData).then(function(theReturn) {
      callbackOnInsertDone();
    });
}

DbObject.findBy = function(columnName, columnVal, callbackOnResult) {
  var queryObj = {};
  queryObj[columnName] = columnVal;

  dbAccess.knex(this.tableName).where(queryObj).select('*').then(function (results) {
    callbackOnResult(results);
  });
}

DbObject.deleteBy = function(columnName, columnVal, callbackOnDeleteDone) {
  dbAccess.knex(this.tableName).where(columnName, columnVal).del().then(function(theReturn) {
    callbackOnDeleteDone(theReturn);
  });
}

module.exports = DbObject;
