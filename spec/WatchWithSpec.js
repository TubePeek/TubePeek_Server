var Users = require('../models/Users');


describe("Database tests", function() {
  describe("> Users table tests", function() {
    it("> User insert, retrieve and delete", function() {
      Users.insert([{'email_address': "garfunkel@gmail.com"}], function() {
        Users.findBy('email_address', "garfunkel@gmail.com", function(userResults) {
          expect(userResults.length).toEqual(1);
          console.log("Gotten userResults: " + JSON.stringify(userResults));

          expect(userResults[0].email_address).toEqual("garfunkel@gmail.com");

          Users.deleteBy('id', userResults[0].id, function(deleteReturn) {
            console.log("Delete returns: " + deleteReturn);
          });
        });
      });
    });
  });

  //--More types of database tests

});

//--More types of tests
