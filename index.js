"use strict";


var express = require("express");
var Hashids = require('hashids');
var Users = require('./models/Users');
var SocialIdentities = require('./models/SocialIdentities');

var scribe = require('scribe-js')();                       // Use this import if you want to configure or custom something.
var console = process.console;


// Will contain objects with key: 'userId' pointing at an object
// The object will have keys: 'socket', 'googleUserId', 'friendsList', 'myRoom'
var connectedUsers = {};

var PossibleActions = {
    identifyUser : 'identifyUser',                         // The server sends this to the client
    sociallyIdentifyYourself : 'sociallyIdentifyYourself', // The client sends this to the server.

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
console.log("Listening on port: " + port);

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
    appObj.use('/logs', scribe.webPanel());
}

function setupCommunications() {
    io.sockets.on('connection', function (socket) {
        console.time().info("\nGot a connection");

        socket.on('send', function (data) {
            actOnClientMessage(socket, data);
        });
        socket.on('disconnect', function() {
            var disconnectedUserId = socket.userId;
            delete connectedUsers[disconnectedUserId];
            console.time().info("\nDisconnected userId: " + disconnectedUserId);
        });
    });
}

function actOnClientMessage(socketToAClient, messageData) {
    var action = messageData.action || "";

    if(action === PossibleActions.sociallyIdentifyYourself) {
        //console.time().info("\nGot sociallyIdentifyYourself from client: \n" + JSON.stringify(messageData) + "\n");
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
        dataToReplyWith.videoTitle = videoTitle;
        dataToReplyWith.videoUrl = videoUrl;

        var currentUserConnectionData = connectedUsers[userIdCausingAction];
        io.sockets.in(currentUserConnectionData.myRoom).emit("message", dataToBroadcast);
    }
}

function persistSocialIdentity(socketToSendUserIdTo, socialProvider, authData, friendsList) {
    Users.findBy('email_address', authData.emailAddress, function(usersFound){
        if(usersFound && usersFound.length > 0) {
            var socialIdentitiesFinder = SocialIdentities.findByUserIdAndProvider(authData.uid, socialProvider);

            socialIdentitiesFinder.then(function(identitiesFound) {
                if(identitiesFound.length > 0) {
                    identitiesFound.some(function(anIdentity) {
                        if(anIdentity.provider === socialProvider) {
                            identifyConnectedClient(socketToSendUserIdTo, usersFound[0]['id'], authData.uid, friendsList);
                            return true;
                        }
                    });
                } else {
                    insertSocialIdentifyThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, usersFound[0]['id'], friendsList);
                }
            });
        } else {
            Users.insert({'email_address': authData.emailAddress}, function(idOfNewUser) {
                insertSocialIdentifyThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfNewUser, friendsList);
            });
        }
    });
}

function insertSocialIdentifyThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfUser, friendsList) {
    var socialIdentityInsertObj = {
        'user_id' : idOfUser, 'uid' : authData.uid,
        'provider' : socialProvider,
        'email_address' : authData.emailAddress, 'full_name' : authData.fullName,
        'access_token' : authData.accessToken, 'expires_at' : authData.accessTokenExpiry
    };
    SocialIdentities.insert(socialIdentityInsertObj, function() {
        console.time().info("\nsocial identity inserted successfully.");
        identifyConnectedClient(socketToSendUserIdTo, idOfUser, authData.uid, friendsList);
    });
}

//This sends the unique userId to the newly connected client
function identifyConnectedClient(theSocket, theUserId, googleUserId, friendsList) {
    theSocket.userId = theUserId;
    theSocket.myRoom = "room_" + theUserId;
    var connectedUserObj = {
        'socket' : theSocket,
        'googleUserId' : googleUserId,
        'friendsList' : friendsList,
        'myRoom' : "room_" + theUserId
    };
    connectedUsers[theUserId] = connectedUserObj;
    console.time().info("in-memory store of friendsList for userId: " + theUserId);
    //--
    addSocketToRooms(theSocket, theUserId);

    var dataToReplyWith = {};
    dataToReplyWith.userId = theUserId;
    dataToReplyWith.action = PossibleActions.identifyUser;

    theSocket.emit('message', dataToReplyWith);
    //console.time().info("Just sent: " + JSON.stringify(dataToReplyWith) + " to client\n");
}

function addSocketToRooms(currentUserSocket, theUserId) {
    theUserId = theUserId + '';                                                 // VERY IMPORTANT! FOR EQUALITY CHECK BELOW
    var currentUserConnectionData = connectedUsers[theUserId];
    var myFriendsList = currentUserConnectionData['friendsList'];

    for (var aPossibleFriendUserId in connectedUsers) {
        if(connectedUsers.hasOwnProperty(aPossibleFriendUserId)) {
            aPossibleFriendUserId = aPossibleFriendUserId + '';                 // VERY IMPORTANT! FOR EQUALITY CHECK BELOW
            if (aPossibleFriendUserId !== theUserId) {
                var possibleFriendConnectedData = connectedUsers[aPossibleFriendUserId];
                var possibleFriendGoogleId = possibleFriendConnectedData['googleUserId'];
                console.time().info("possibleFriendGoogleId: " + possibleFriendGoogleId);

                if(isMyGoogleFriend(myFriendsList, possibleFriendGoogleId)) {
                    console.time().info("Found a google friend online! google user id: " + possibleFriendGoogleId);
                    // So any of the current user's friends broadcasts he/she will see it.
                    possibleFriendConnectedData.socket.join(currentUserConnectionData.myRoom);

                    // So that when current user broadcasts his friends will see it
                    currentUserSocket.join(possibleFriendConnectedData.myRoom);
                }
            } else {
                console.time().info("In addSocketToRooms ... finding friends! Skipped myself");
            }
        }
    }
}

function isMyGoogleFriend(myFriendsList, otherGoogleUserId) {
    myFriendsList.forEach(function(aFriend) {
        if(aFriend.id === otherGoogleUserId)
            return true;
        else
            return false;
    });
}
