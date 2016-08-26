
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
        FriendExclusions.doesExclusionExist(userEmail, friendGoogleUserId, function (yes) {
            if(yes) {
                res.status(409).end();
            } else {
                FriendExclusions.add(userEmail, socialProvider, friendGoogleUserId,
                                    friendFullName, friendImageUrl, function (idOfNewExclusion) {
                    if(idOfNewExclusion) {
                        // At this point I should add the current user to the exclusions of the friend
                        // but I am tired.
                        res.status(201).end();
                    } else {
                        res.status(500).json({"error": "Gosh, darn it. Don't know what happened."});
                    }
                });
            }
        });
    } else { // Bad request
        res.status(400).end();
    }
}

// Resource does not exist - 404 Not Found
// Resource already deleted - 410 Gone
// Users does not have permission - 403 Forbidden
var deleteExclusion = function (req, res) {
    console.time().info("[" + Constants.AppName + "] got delete for /friendExclusion");
    var userEmail = req.body.userEmail;
    var friendGoogleUserId = req.body.friendGoogleUserId;

    if (userEmail && friendGoogleUserId) {
        FriendExclusions.delete(userEmail, friendGoogleUserId, function (numRowsDeleted) {
            if (numRowsDeleted === 1) {//Success
                res.status(204).end();
            } else {// Could not find exclusion row to delete. Still a kind of success right?
                res.status(404).end();
            }
        });
    } else { // Bad request
        res.status(400).end();
    }
}


module.exports = friendExclusionsControl;
