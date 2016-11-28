
var UserFriends = require('../dbAccess/UserFriends');
var Constants = require('../Constants');
var Utils = require('../Utils');

var console = null;

var friendExclusionsControl = {
    setup : function (app, scribeConsole) {
        console = scribeConsole;

        app.post('/api/v1/friendExclusion/', addExclusion);
        app.delete('/api/v1/friendExclusion/', deleteExclusion);
    }
};

var addExclusion = function (req, res) {
    console.time().info("[" + Constants.AppName + "] got post for /friendExclusion");
    var googleUserId = req.body.googleUserId;
    var friendGoogleUserId = req.body.friendGoogleUserId;
    console.log("googleUserId: " + googleUserId + ", friendGoogleUserId: " + friendGoogleUserId);

    if (googleUserId && friendGoogleUserId) {
        var currentDateTime = Utils.dateFormat(new Date(), "%Y-%m-%d %H:%M:%S", true);
        UserFriends.setFriendExclusion(googleUserId, friendGoogleUserId, true, currentDateTime, function () {
            console.log("Success set friend excluded to true");
            res.status(201).end();
        });
    } else { // Bad request
        res.status(400).json({"errorMsg": "Inputs for adding a friend exclusion Not OK!"});
    }
}

// Resource does not exist - 404 Not Found
// Resource already deleted - 410 Gone
// Users does not have permission - 403 Forbidden
var deleteExclusion = function (req, res) {
    console.time().info("[" + Constants.AppName + "] got delete for /friendExclusion");
    var googleUserId = req.body.googleUserId;
    var friendGoogleUserId = req.body.friendGoogleUserId;
    console.log("googleUserId: " + googleUserId + ", friendGoogleUserId: " + friendGoogleUserId);

    if (googleUserId && friendGoogleUserId) {
        var currentDateTime = Utils.dateFormat(new Date(), "%Y-%m-%d %H:%M:%S", true);
        UserFriends.setFriendExclusion(googleUserId, friendGoogleUserId, false, currentDateTime, function () {
            console.log("Successfully set friend excluded to false");
            res.status(204).end();
        });
    } else { // Bad request
        res.status(400).json({"errorMsg": "Input for Friend exclusion deletion Not OK!"});
    }
}

module.exports = friendExclusionsControl;
