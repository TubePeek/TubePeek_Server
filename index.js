"use strict";

var express = require("express");
var Hashids = require('hashids');

var Users = require('./dbAccess/Users');
var SocialIdentities = require('./dbAccess/SocialIdentities');
var Constants = require('./Constants');
var Utils = require('./Utils');

var scribe = require('scribe-js')();    // if you need to customize something on scribe.
var console = process.console;


var app = express();
configureWebServer(app);

var server = app.listen(Constants.SERVER_PORT);
var io = require('socket.io').listen(server);
setupCommunications();

function configureWebServer(appObj) {
    appObj.set('views', __dirname + '/tpl');
    appObj.set('view engine', "jade");
    appObj.engine('jade', require('jade').__express);

    appObj.get("/", function(req, res){
        res.render("page");
    });
    appObj.use(express.static(__dirname + '/public'));

    var dbEnvVariable = 'WatchWith_DbEnv';
    if (process.env[dbEnvVariable] !== undefined) {
        var dbEnv = process.env[dbEnvVariable];

        console.log("[configureWebServer] WatchWith_DbEnv: " + dbEnv);
        if (dbEnv === 'development') {
            appObj.use('/logs', scribe.webPanel());
        }
    }
}


// Will contain objects, with a userEmail value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', myRoom', 'videoData'
var connectedUsers = {};

//{{userEmail}} -> [{{actualFriendsList}}]
var _friendsMegaList = {};

var clientActionSelector = {
    'sociallyIdentifyYourself' : sociallyIdentifyYourself,
    'userChangedOnlineStatus' : userChangedOnlineStatus,
    'changedVideo' : changedVideo
};

function setupCommunications() {
    io.sockets.on('connection', function (socket) {
        console.time().info("\nGot a socket.io connection!");

        socket.on('send', function (data) {
            var clientAction = data.action;
            var reaction = clientActionSelector[clientAction];
            if(typeof reaction == 'function')
                reaction(socket, data); // Every action demands an equal and opposite reaction!
            else {
                console.time().info("Oops! Can't find reaction function!");
                console.time().info("Can't react to client action: " + clientAction);
                console.time().info("Now, panic.");
            }
        });
        socket.on('disconnect', function() {
            var disconnectedUserEmail = socket.userEmail;
            var currentUser = connectedUsers[disconnectedUserEmail];

            if(currentUser) {
                var dataToBroadcast = {};
                dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
                dataToBroadcast.userEmail = disconnectedUserEmail;
                dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
                dataToBroadcast.onlineState = false;

                var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
                socket.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
                delete connectedUsers[disconnectedUserEmail];
                delete _friendsMegaList[disconnectedUserEmail];
                console.time().info("\nDisconnected UserEmail: " + disconnectedUserEmail);
            }
        });
    });
    console.time().info("\nServer initialization done. Ready to receive requests.");
}

//-- Core client actions
function sociallyIdentifyYourself(socketToAClient, messageData) {
    console.time().info("\nIn sociallyIdentifyYourself! Got social identity!");
    var authData = messageData.authData;
    var socialProvider = messageData.provider;
    var friendsList = messageData.friendsList;

    Users.findByEmail(authData.emailAddress, function(usersFound) {
        if(usersFound && usersFound.length > 0) {
            var socialIdentitiesFinder = SocialIdentities.findByUIdAndProvider(authData.uid, socialProvider);

            var onIdentitiesFound = function(identitiesFound) {
                if(identitiesFound.length > 0) {
                    identitiesFound.some(function(anIdentity) {
                        if(anIdentity.provider === socialProvider) {
                            takeVideosBeingWatched(socketToAClient, authData.emailAddress, authData.uid, friendsList);
                            return true;
                        }
                    });
                } else {
                    insertSocialIdentityThenIdentifyClient(socketToAClient, socialProvider, authData, usersFound[0]['id'], friendsList);
                }
            }
            socialIdentitiesFinder.then(onIdentitiesFound);
        } else {
            Users.insertEmail(authData.emailAddress, function(idOfNewUser) {
                insertSocialIdentityThenIdentifyClient(socketToAClient, socialProvider, authData, idOfNewUser, friendsList);
            });
        }
    });
}

function userChangedOnlineStatus (socketToAClient, messageData) {
    var userEmailCausingAction = messageData.userEmail;
    var newUserOnlineState = messageData.onlineState;
    var roomToBroadcastTo = '';
    var googleUserIdOfCurrentUser = '';

    if(newUserOnlineState) {
        sociallyIdentifyYourself(socketToAClient, messageData);

        var currentUser = connectedUsers[userEmailCausingAction];
        if(currentUser) {
            googleUserIdOfCurrentUser = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            console.time().info("Room to broadcast to: " + roomToBroadcastTo);
        }
    } else {
        console.log("[userChangedOnlineStatus] ... \n" + JSON.stringify(messageData));
        var currentUser = connectedUsers[userEmailCausingAction];
        if (currentUser) {
            googleUserIdOfCurrentUser = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            delete connectedUsers[userEmailCausingAction];
            delete _friendsMegaList[userEmailCausingAction];

            roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            console.time().info("Room to broadcast to: " + roomToBroadcastTo);
        } else {
            console.log("currentUser NOT in connectedUsers ... ");
        }
    }

    var dataToBroadcast = {};
    dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
    dataToBroadcast.userEmail = userEmailCausingAction;
    dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserIdOfCurrentUser;
    dataToBroadcast.onlineState = newUserOnlineState;

    socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
}

function changedVideo (socketToAClient, messageData) {
    console.time().info("\nIn changedVideo! Got video change: \n" + JSON.stringify(messageData));
    var userEmail = messageData.userEmail;
    var videoUrl = messageData.videoUrl;

    var pathParam = '/oembed?url=' + messageData.videoUrl + '&format=json';
    Utils.doGet('www.youtube.com', pathParam, function(response) {
        console.time().info("\n\nCool! Got youtube video details:\n" + response + "\n\n");
        var videoDetails = JSON.parse(response);

        var currentUser = connectedUsers[userEmail];
        if(currentUser) {
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = videoUrl;
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = videoDetails.title;
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = videoDetails.thumbnail_url;

            connectedUsers[userEmail] = currentUser;
            //--
            var dataToBroadcast = {};
            dataToBroadcast.action = Constants.PossibleActions.takeFriendVideoChange;
            var friendVidChange = {};
            friendVidChange[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = videoUrl;
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = videoDetails.title;
            friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = videoDetails.thumbnail_url;
            dataToBroadcast.friendChangedVideo = friendVidChange;

            var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            console.time().info("Room to broadcast to: " + roomToBroadcastTo);
            socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
        } else {
            console.time().info("currentUser for : " + userEmail + " is NULL.");
        }
    });
}
//- End of core client actions


function insertSocialIdentityThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfUser, friendsList) {
    SocialIdentities.insertSocialIdentify(socialProvider, authData, idOfUser, function() {
        console.time().info("\nSocial identity inserted successfully.");
        takeVideosBeingWatched(socketToSendUserIdTo, authData.emailAddress, authData.uid, friendsList);
    });
}

function takeVideosBeingWatched(currentUserSocket, userEmail, googleUserId, friendsList) {
    currentUserSocket['userEmail'] = userEmail;

    var connectedUserObj = {};
    connectedUserObj[Constants.CONN_DATA_KEYS.SOCKET_ID] = currentUserSocket.id;
    connectedUserObj[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;

    connectedUserObj[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
        videoUrl : '',
        title    : '',
        thumbnail_url : ''
    };

    connectedUsers[userEmail] = connectedUserObj;
    _friendsMegaList[userEmail] = friendsList;
    var friendsOnYoutube = addSocketToRooms(currentUserSocket, userEmail);

    var dataToReplyWith = {};
    dataToReplyWith.action = Constants.PossibleActions.takeVideosBeingWatched;
    dataToReplyWith.friendsOnYoutube = friendsOnYoutube;

    currentUserSocket.emit('message', dataToReplyWith);
    //console.time().info("Just sent: " + JSON.stringify(dataToReplyWith) + " to client\n");
}

function addSocketToRooms(currentUserSocket, userEmail) {
    var friendsOnYoutube = [];
    var currentUserConnData = connectedUsers[userEmail];
    var myFriendsList = _friendsMegaList[userEmail];

    for (var aPossibleFriendUserEmail in connectedUsers) {
        if(connectedUsers.hasOwnProperty(aPossibleFriendUserEmail)) {
            if (aPossibleFriendUserEmail !== userEmail) { //To skip myself
                var possibleFriendConnData = connectedUsers[aPossibleFriendUserEmail];
                var possibleFriendGoogleId = possibleFriendConnData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];

                if(Utils.isMyGoogleFriend(myFriendsList, possibleFriendGoogleId)) {
                    var friendVidChange = {};
                    friendVidChange[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = possibleFriendConnData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
                    friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
                    friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = possibleFriendConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl;
                    friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = possibleFriendConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title;
                    friendVidChange[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = possibleFriendConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url;
                    friendsOnYoutube.push(friendVidChange);

                    var friendSocket = io.sockets.connected[possibleFriendConnData[Constants.CONN_DATA_KEYS.SOCKET_ID]];
                    if(friendSocket) {
                        var myRoom = currentUserConnData[Constants.CONN_DATA_KEYS.MY_ROOM];
                        friendSocket.join(myRoom);

                        var myFriendsRoom = possibleFriendConnData[Constants.CONN_DATA_KEYS.MY_ROOM];
                        currentUserSocket.join(myFriendsRoom);
                    }
                }
            }
        }
    }
    return friendsOnYoutube;
}
