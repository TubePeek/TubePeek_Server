var Users = require('../models/Users');


describe("Database tests", function() {
  describe("> Users table tests", function() {
    it("> User insert, retrieve and delete", function() {
      Users.insert({}, function(idOfNewUser) {
        console.log("id of new user: " + idOfNewUser);
        // Users.findBy('user_id', idOfNewUser, function(userResults) {
        //   expect(userResults.length).toEqual(1);
        //
        //   expect(userResults[0].user_id).toEqual(idOfNewUser);
        //
        //   Users.deleteBy('user_id', userResults[0].user_id, function(deleteReturn) {
        //     console.log("Delete return: " + deleteReturn);
        //   });
        // });
      });
    });
  });

  //--More types of database tests

});

//--More types of tests
