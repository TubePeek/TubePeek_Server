
var FriendExclusions = require('../dbAccess/FriendExclusions');
var Constants = require('../Constants');

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
    var userEmail = req.body.userEmail;
    var friendGoogleUserId = req.body.friendGoogleUserId;
    var socialProvider = req.body.socialProvider;
    var friendFullName = req.body.friendFullName;
    var friendImageUrl = req.body.friendImageUrl;

    if (userEmail && friendGoogleUserId && socialProvider && friendFullName && friendImageUrl) {
        FriendExclusions.add(userEmail, socialProvider, friendGoogleUserId, friendFullName, friendImageUrl, function (idOfNewExclusion) {
            if(idOfNewExclusion) {
                res.status(201).end();
            } else {
                res.status(500).json({"error": "Gosh, darn it. Don't know what happened."});
            }
        });
    } else { // Bad request
        res.status(400).end();
    }
}

var deleteExclusion = function (req, res) {
    console.time().info("[" + Constants.AppName + "] got delete for /friendExclusion");
    var userEmail = req.body.userEmail;
    var friendGoogleUserId = req.body.friendGoogleUserId;

    if (userEmail && friendGoogleUserId) {
        FriendExclusions.delete(userEmail, friendGoogleUserId, function (numRowsDeleted) {
            if (numRowsDeleted === 1) {
                res.status(204).end();
            } else {
                res.status(404).end();
            }
        });
    } else { // Bad request
        res.status(400).end();
    }
}


module.exports = friendExclusionsControl;
