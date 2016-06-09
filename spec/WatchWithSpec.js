var Users = require('../models/Users');


describe("Database tests", function() {
  describe("> Users table tests", function() {
    it("> User insert, retrieve and delete", function() {
      var idOfNewUser = Users.insert({
        email_address: 'passions@gmail.com',
        first_name: "louis",
        last_name: "fitzgerald",
        username: "louis.fitzgerald",
        password_hash: "asdfasdf",
        birthday: "14th of April 1900",
        gender: "You decide"
      }, function() {
        Users.findBy('email_address', 'passions@gmail.com', function(userResults) {
          expect(userResults.length).toEqual(1);

          var firstName = userResults[0].first_name;
          expect(firstName).toEqual('louis');

          Users.deleteBy('email_address', 'passions@gmail.com', function(deleteReturn) {
            console.log("Delete return: " + deleteReturn);
          });
        });
      });
    });
  });

  //--More types of database tests

});

//--More types of tests
