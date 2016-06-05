var dbAccess = require('../dbAccess');

var Users = {};

Users.insert = function(insertData, callbackOnInsertDone) {
    return dbAccess.knex('usermaster').insert(insertData).then(function(theReturn) {
      //console.log("theReturn from insert: " + JSON.stringify(theReturn));
      callbackOnInsertDone();
    });
}

Users.findBy = function(columnName, columnVal, callbackOnResult) {
  var queryObj = {};
  queryObj[columnName] = columnVal;

  dbAccess.knex('usermaster').where(queryObj).select('*').then(function (results) {
    callbackOnResult(results);
  });
}

Users.deleteBy = function(columnName, columnVal, callbackOnDeleteDone) {
  dbAccess.knex('usermaster').where(columnName, columnVal).del().then(function(theReturn) {
    //Do nothing .. theReturn seems to be number of rows deleted
    callbackOnDeleteDone(theReturn);
  });
}

module.exports = Users;
