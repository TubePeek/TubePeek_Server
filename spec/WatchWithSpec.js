var Users = require('../models/Users');


describe("Database tests", function() {
    describe("> Users table tests", function() {
        it("> User insert, retrieve and delete", function() {
            Users.insert([{'email_address': "garfunkel@gmail.com"}], function(idOfNewUser) {
                Users.findBy('id', idOfNewUser, function(userResults) {
                    expect(userResults.length).toEqual(1);
                    expect(userResults[0].email_address).toEqual("garfunkel@gmail.com");

                    Users.deleteBy('id', userResults[0].id, function(deleteReturn) {
                        expect(deleteReturn).toEqual(1);
                    });
                });
            });
        });
    });

    //--More types of database tests

});

//--More types of tests
