var Constants = require('../Constants');

var Users = require('../dbAccess/Users');
var SocialIdentities = require('../dbAccess/SocialIdentities');
var FriendExclusions = require('../dbAccess/FriendExclusions');
var MongoDb = require('../dbAccess/MongoDb');

var console = null;
var SocketComms = null;

var uninstallControl = {
    setup : function (app, scribeConsole, socketComms) {
        console = scribeConsole;
        SocketComms = socketComms;

        app.get('/uninstall', doUninstallDance);
    }
};

function doUninstallDance (req, res) {
    var gId = req.query.gId;
    var browser = req.query.browser;
    console.log("gId: " + gId + ", browser: " + browser);

    // TODO
    // First, the user's social identity has to be deleted
    // Then the user's row in the usermaster table has to be deleted
    // The user's friend exclusions need to be deleted
    
    // The user's friends list need to be deleted from mongodb
    // MongoDb.FriendsList.remove(gId, function (isSuccessful) {
    //     console.time().info("MongoDb Friends delete: " + isSuccessful);
    // });

    res.render('uninstall.html');
}

module.exports = uninstallControl;
