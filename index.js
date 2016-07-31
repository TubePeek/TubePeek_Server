"use strict";

var express = require("express");
var Hashids = require('hashids');
var Users = require('./models/Users');
var SocialIdentities = require('./models/SocialIdentities');
var Constants = require('./Constants');
var Utils = require('./Utils');

var scribe = require('scribe-js')();                       // Use this import if you want to configure or custom something.
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
    //appObj.use('/logs', scribe.webPanel());
}


// Will contain objects, with a userEmail value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', 'friendsList', 'myRoom'
var connectedUsers = {};

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
            reaction(socket, data); // Every action demands an equal and opposite reaction!
        });
        socket.on('disconnect', function() {
            var disconnectedUserEmail = socket.userEmail;
            console.time().info("\nDisconnected UserEmail: " + disconnectedUserEmail);
            delete connectedUsers[disconnectedUserEmail];
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

    Users.findBy('email_address', authData.emailAddress, function(usersFound){
        if(usersFound && usersFound.length > 0) {
            var socialIdentitiesFinder = SocialIdentities.findByUIdAndProvider(authData.uid, socialProvider);

            socialIdentitiesFinder.then(function(identitiesFound) {
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
            });
        } else {
            Users.insert({'email_address': authData.emailAddress}, function(idOfNewUser) {
                insertSocialIdentityThenIdentifyClient(socketToAClient, socialProvider, authData, idOfNewUser, friendsList);
            });
        }
    });
}

function userChangedOnlineStatus (socketToAClient, messageData) {
    //console.time().info("\nIn userChangedOnlineStatus! Got online status change: \n" + JSON.stringify(messageData));
    var userEmailCausingAction = messageData.userEmail;
    var newUserOnlineState = messageData.onlineState;
    var roomToBroadcastTo = '';
    var googleUserIdOfCurrentUser = '';

    if(newUserOnlineState) {
        var currentUser = connectedUsers[userEmailCausingAction];

        sociallyIdentifyYourself(socketToAClient, messageData);
        if(currentUser) {
            googleUserIdOfCurrentUser = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            console.time().info("Room to broadcast to: " + roomToBroadcastTo);
        }
    } else {
        var currentUser = connectedUsers[userEmailCausingAction];
        if (currentUser) {
            googleUserIdOfCurrentUser = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            delete connectedUsers[userEmailCausingAction];

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
        console.time().info("Cool! Got video details");
        var videoDetails = JSON.parse(response);

        var currentUser = connectedUsers[userEmail];
        currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = videoUrl;
        currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = videoDetails.title;
        currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = videoDetails.thumbnail_url;

        connectedUsers[userEmail] = currentUser;
        //--
        var dataToBroadcast = {};
        dataToBroadcast.action = Constants.PossibleActions.takeFriendVideoChange;
        var friendChangedVideo = {};
        friendChangedVideo[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUserConnectionData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
        friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
        friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = videoUrl;
        friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = videoDetails.title;
        friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = videoDetails.thumbnail_url;
        dataToBroadcast.friendChangedVideo = friendChangedVideo;

        var roomToBroadcastTo = currentUserConnectionData[Constants.CONN_DATA_KEYS.MY_ROOM];
        console.time().info("Room to broadcast to: " + roomToBroadcastTo);
        socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
    });
}
//- End of core client actions


function insertSocialIdentityThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfUser, friendsList) {
    SocialIdentities.insertSocialIdentify(socialProvider, authData, idOfUser, function() {
        console.time().info("\nSocial identity inserted successfully.");
        takeVideosBeingWatched(socketToSendUserIdTo, authData.emailAddress, authData.uid, friendsList);
    });
}

function takeVideosBeingWatched(theSocket, userEmail, googleUserId, friendsList) {
    theSocket['userEmail'] = userEmail;

    var connectedUserObj = {};
    connectedUserObj[Constants.CONN_DATA_KEYS.SOCKET_ID] = theSocket.id;
    connectedUserObj[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    connectedUserObj[Constants.CONN_DATA_KEYS.FRIENDS_LIST] = friendsList;
    connectedUserObj[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;

    connectedUserObj[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
        videoUrl : '',
        title    : '',
        thumbnail_url : ''
    };

    connectedUsers[userEmail] = connectedUserObj;
    var friendsOnYoutube = addSocketToRooms(theSocket, userEmail);

    var dataToReplyWith = {};
    dataToReplyWith.action = Constants.PossibleActions.takeVideosBeingWatched;
    dataToReplyWith.friendsOnYoutube = friendsOnYoutube;

    theSocket.emit('message', dataToReplyWith);
    //console.time().info("Just sent: " + JSON.stringify(dataToReplyWith) + " to client\n");
}

function addSocketToRooms(currentUserSocket, userEmail) {
    var friendsWhoAreWatchingStuff = [];
    var currentUserConnectionData = connectedUsers[userEmail];
    var myFriendsList = currentUserConnectionData[Constants.CONN_DATA_KEYS.FRIENDS_LIST];

    for (var aPossibleFriendUserEmail in connectedUsers) {
        if(connectedUsers.hasOwnProperty(aPossibleFriendUserEmail)) {
            if (aPossibleFriendUserEmail !== userEmail) { //To skip myself
                var possibleFriendConnectedData = connectedUsers[aPossibleFriendUserEmail];
                var possibleFriendGoogleId = possibleFriendConnectedData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];

                if(Utils.isMyGoogleFriend(myFriendsList, possibleFriendGoogleId)) {
                    var friendChangedVideo = {};
                    friendChangedVideo[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = possibleFriendConnectedData[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
                    friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
                    friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl = possibleFriendConnectedData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].videoUrl;
                    friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title = possibleFriendConnectedData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].title;
                    friendChangedVideo[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url = possibleFriendConnectedData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO].thumbnail_url;
                    friendsWhoAreWatchingStuff.push(friendChangedVideo);

                    var friendSocket = io.sockets.connected[possibleFriendConnectedData[Constants.CONN_DATA_KEYS.SOCKET_ID]];
                    if(friendSocket) {
                        var myRoom = currentUserConnectionData[Constants.CONN_DATA_KEYS.MY_ROOM];
                        friendSocket.join(myRoom);

                        var myFriendsRoom = possibleFriendConnectedData[Constants.CONN_DATA_KEYS.MY_ROOM];
                        currentUserSocket.join(myFriendsRoom);
                    }
                }
            }
        }
    }
    return friendsWhoAreWatchingStuff;
}
