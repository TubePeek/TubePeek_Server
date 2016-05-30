var bookshelf = require('../bookshelf');


describe("Database tests", function() {
  describe("Users table tests", function() {
    it("Users can be inserted, retrieved and deleted", function() {
      var newUser = new bookshelf.Users({
        email_address: 'passions@gmail.com',
        first_name: "louis",
        last_name: "fitzgerald",
        username: "louis.fitzgerald",
        password_hash: "asdfasdf",
        birthday: "14th of April 1900",
        gender: "You decide"
      });
      newUser.save(null, {method: 'insert'});
      // bookshelf.Users.create({
      //   email_address: 'efe3232@gmail.com',
      //   first_name: "fitzgerald"
      // }).save();
      //--
      bookshelf.Users.byEmail('passions@gmail.com')
      .then(function(userModel){
        var firstName = userModel.get('first_name');
        expect(firstName).toEqual('louis');

        userModel.destroy();    //Delete row
      }).catch(function(error){
        //expect(testFn).toThrow(new Error("unrecognized to-unit"));
        //fail('Failure to insert a row to usermaster table! \n' + error + '\n');
      });
      //done();
    });
  });

  //--More types of database tests

});

//--More types of tests
