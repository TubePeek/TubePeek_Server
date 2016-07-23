"use strict";


var express = require("express");
var Hashids = require('hashids');
var Users = require('./models/Users');
var SocialIdentities = require('./models/SocialIdentities');

var scribe = require('scribe-js')();                       // Use this import if you want to configure or custom something.
var console = process.console;

// Will contain objects, with a userId value pointing at an object
// The object will have keys: 'socket', 'googleUserId', 'friendsList', 'myRoom'
var connectedUsers = {};
var CONN_DATA_KEYS = {
    SOCKET : 'socket',
    GOOGLE_USER_ID : 'googleUserId',
    FRIENDS_LIST : 'friendsList',
    MY_ROOM: 'myRoom'
};

var PossibleActions = {
    sociallyIdentifyYourself : 'sociallyIdentifyYourself',   // The client first sends this to the server
    identifyUser : 'identifyUser',                           // The server then sends this to the client

    userChangedOnlineStatus : 'userChangedOnlineStatus',
    takeFriendOnlineStatus : 'takeFriendOnlineStatus',

    changedVideo : 'changedVideo',
    takeFriendVideoChange : 'takeFriendVideoChange',

    acknowledge : "acknowledge"
};

var app = express();
var port = 3700;
configureWebServer(app);

var server = app.listen(port);

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

function setupCommunications() {
    io.sockets.on('connection', function (socket) {
        console.time().info("\nGot a connection!");

        socket.on('send', function (data) {
            actOnClientMessage(socket, data);
        });
        socket.on('disconnect', function() {
            var disconnectedUserId = socket.userId;
            console.time().info("\nDisconnected userId: " + disconnectedUserId);
            delete connectedUsers[disconnectedUserId];
        });
    });
    console.time().info("\nServer initialization done. Ready to receive requests.");
}

function actOnClientMessage(socketToAClient, messageData) {
    var action = messageData.action || "";

    if(action === PossibleActions.sociallyIdentifyYourself) {
        var authData = messageData.authData;
        var socialProvider = messageData.provider;
        var friendsList = messageData.friendsList;

        persistSocialIdentity(socketToAClient, socialProvider, authData, friendsList);
    } else if(action === PossibleActions.userChangedOnlineStatus) {
        console.time().info("Got online status change: " + JSON.stringify(messageData));
        var userIdCausingAction = messageData.userId;
        var newUserOnlineState = messageData.onlineState;

        var dataToBroadcast = {};
        dataToBroadcast.action = PossibleActions.takeFriendOnlineStatus;
        dataToBroadcast.userId = userIdCausingAction;
        dataToBroadcast.onlineState = newUserOnlineState;

        var currentUserConnectionData = connectedUsers[userIdCausingAction];
        io.sockets.in(currentUserConnectionData.myRoom).emit("message", dataToBroadcast);
    } else if(action === PossibleActions.changedVideo) {
        console.time().info("Got video change: " + JSON.stringify(messageData));
        var userIdCausingAction = messageData.userId;
        var videoTitle = messageData.videoTitle;
        var videoUrl = messageData.videoUrl;

        var dataToBroadcast = {};
        dataToBroadcast.action = PossibleActions.takeFriendVideoChange;
        dataToBroadcast.video = {};
        dataToReplyWith.video.videoTitle = videoTitle;
        dataToReplyWith.video.videoUrl = videoUrl;
        dataToReplyWith.video.friend = {};

        var currentUserConnectionData = connectedUsers[userIdCausingAction];
        io.sockets.in(currentUserConnectionData.myRoom).emit("message", dataToBroadcast);
    }
}

function persistSocialIdentity(socketToSendUserIdTo, socialProvider, authData, friendsList) {
    Users.findBy('email_address', authData.emailAddress, function(usersFound){
        if(usersFound && usersFound.length > 0) {
            var socialIdentitiesFinder = SocialIdentities.findByUIdAndProvider(authData.uid, socialProvider);

            socialIdentitiesFinder.then(function(identitiesFound) {
                if(identitiesFound.length > 0) {
                    identitiesFound.some(function(anIdentity) {
                        if(anIdentity.provider === socialProvider) {
                            identifyConnectedClient(socketToSendUserIdTo, usersFound[0]['id'], authData.uid, friendsList);
                            return true;
                        }
                    });
                } else {
                    insertSocialIdentityThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, usersFound[0]['id'], friendsList);
                }
            });
        } else {
            Users.insert({'email_address': authData.emailAddress}, function(idOfNewUser) {
                insertSocialIdentityThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfNewUser, friendsList);
            });
        }
    });
}

function insertSocialIdentityThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfUser, friendsList) {
    SocialIdentities.insertSocialIdentify(socialProvider, authData, idOfUser, function() {
        console.time().info("\nSocial identity inserted successfully.");
        identifyConnectedClient(socketToSendUserIdTo, idOfUser, authData.uid, friendsList);
    });
}
//This sends the unique userId to the newly connected client
function identifyConnectedClient(theSocket, theUserId, googleUserId, friendsList) {
    theSocket.userId = theUserId;

    var connectedUserObj = {};
    connectedUserObj[CONN_DATA_KEYS.SOCKET] = theSocket;
    connectedUserObj[CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    connectedUserObj[CONN_DATA_KEYS.FRIENDS_LIST] = friendsList;
    connectedUserObj[CONN_DATA_KEYS.MY_ROOM] = "room_" + theUserId;

    connectedUsers[theUserId] = connectedUserObj;
    addSocketToRooms(theSocket, theUserId);

    var dataToReplyWith = {};
    dataToReplyWith.userId = theUserId;
    dataToReplyWith.action = PossibleActions.identifyUser;

    theSocket.emit('message', dataToReplyWith);
    //console.time().info("Just sent: " + JSON.stringify(dataToReplyWith) + " to client\n");
}

function addSocketToRooms(currentUserSocket, theUserId) {
    theUserId += '';                                                 // VERY IMPORTANT! FOR EQUALITY CHECK BELOW
    var currentUserConnectionData = connectedUsers[theUserId];
    var myFriendsList = currentUserConnectionData[CONN_DATA_KEYS.FRIENDS_LIST];

    for (var aPossibleFriendUserId in connectedUsers) {
        if(connectedUsers.hasOwnProperty(aPossibleFriendUserId)) {
            aPossibleFriendUserId += '';                                       // VERY IMPORTANT! FOR EQUALITY CHECK BELOW
            if (aPossibleFriendUserId !== theUserId) {//To skip myself
                var possibleFriendConnectedData = connectedUsers[aPossibleFriendUserId];
                var possibleFriendGoogleId = possibleFriendConnectedData[CONN_DATA_KEYS.GOOGLE_USER_ID];
                console.time().info("possibleFriendGoogleId: " + possibleFriendGoogleId);

                if(isMyGoogleFriend(myFriendsList, possibleFriendGoogleId)) {
                    console.time().info("Found a google friend online! google user id: " + possibleFriendGoogleId);
                    // So that any of the current user's friends can broadcast and the current user will see it.
                    possibleFriendConnectedData.socket.join(currentUserConnectionData.MY_ROOM);

                    // So that when the current user broadcasts, his friends will see it
                    currentUserSocket.join(possibleFriendConnectedData.MY_ROOM);
                }
            }
        }
    }
}

function isMyGoogleFriend(myFriendsList, otherGoogleUserId) {
    myFriendsList.some(function(aFriend) {
        return (aFriend.id === otherGoogleUserId);
    });
}
