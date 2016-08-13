var Utils = require('../Utils');
var Users = require('./Users');
var SocialIdentities = require('./SocialIdentities');

var userInfoPersist = {};

userInfoPersist.persist = function(authData, socialProvider, onPersistDoneFunc) {
    Users.findByEmail(authData.emailAddress, function(usersFound) {
        if(usersFound && usersFound.length > 0) {
            var socialIdentitiesFinder = SocialIdentities.findByUIdAndProvider(authData.uid, socialProvider);

            var onIdentitiesFound = function(identitiesFound) {
                if(identitiesFound.length > 0) {
                    identitiesFound.some(function(anIdentity) {
                        if(anIdentity.provider === socialProvider) {
                            return true;
                            onPersistDoneFunc();
                        }
                    });
                } else {
                    insertSocialIdentityThenIdentifyClient(authData, socialProvider, usersFound[0]['id']);
                }
            }
            socialIdentitiesFinder.then(onIdentitiesFound);
        } else {
            var createdAt = Utils.dateFormat(new Date(), "%Y-%m-%d %H:%M:%S", true);
            Users.insertEmail(authData.emailAddress, createdAt, function(idOfNewUser) {
                insertSocialIdentityThenIdentifyClient(authData, socialProvider, idOfNewUser);
            });
        }
    });
    var insertSocialIdentityThenIdentifyClient = function (authData, socialProvider, idOfUser) {
        SocialIdentities.insertSocialIdentify(socialProvider, authData, idOfUser, function() {
            console.log("\nSocial identity inserted successfully.");
            onPersistDoneFunc();
        });
    };
}

module.exports = userInfoPersist;
