var Constants = require('../Constants');
var Users = require('../dbAccess/Users');
var SocialIdentities = require('../dbAccess/SocialIdentities');


// Will contain objects, with a userEmail value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', myRoom', 'videoData'
var connectedUsers = {};

var console = null;

// var clientActionSelector = {
//     'takeMySocialIdentity' : sociallyIdentifyYourself,
//     'userChangedOnlineStatus' : userChangedOnlineStatus,
//     'changedVideo' : changedVideo
// };

var socketComm = {};

socketComm.initialize = function(scribeConsoleObj) {
    console = scribeConsoleObj;
};

socketComm.sendRequestForIdentity = function (socket) {
    console.time().info("Inside sendRequestForIdentity");
    var initialDataToSend = {};
    initialDataToSend.action = Constants.PossibleActions.pleaseIdentifyYourself;
    socket.emit('message', initialDataToSend);
};





module.exports = socketComm;
