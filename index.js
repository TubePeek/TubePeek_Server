"use strict";

var http = require('http');
var express = require("express");
var Hashids = require('hashids');
var Users = require('./models/Users');
var SocialIdentities = require('./models/SocialIdentities');

var scribe = require('scribe-js')();                       // Use this import if you want to configure or custom something.
var console = process.console;

// Will contain objects, with a userEmail value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', 'friendsList', 'myRoom'
var connectedUsers = {};

// This is necessary so that I don't use magic strings everywhere
var CONN_DATA_KEYS = {
    SOCKET_ID : 'socketId',
    GOOGLE_USER_ID : 'googleUserId',
    FRIENDS_LIST : 'friendsList',
    MY_ROOM: 'myRoom'
};

var PossibleActions = {
    sociallyIdentifyYourself : 'sociallyIdentifyYourself',   // The client first sends this to the server
    takeVideosBeingWatched : 'takeVideosBeingWatched',       // The server then sends this to the client

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
        console.time().info("\nGot a socket.io connection!");

        socket.on('send', function (data) {
            var clientAction = data.action;
            var reaction = clientActionSelector[clientAction];
            reaction(socket, data); // For every action demands a reaction!
        });
        socket.on('disconnect', function() {
            var disconnectedUserEmail = socket.userEmail;
            console.time().info("\nDisconnected UserEmail: " + disconnectedUserEmail);
            delete connectedUsers[disconnectedUserEmail];
        });
    });
    console.time().info("\nServer initialization done. Ready to receive requests.");
}

var clientActionSelector = {
    'sociallyIdentifyYourself' : sociallyIdentifyYourself,
    'userChangedOnlineStatus' : userChangedOnlineStatus,
    'changedVideo' : changedVideo
};

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
    console.time().info("\nIn userChangedOnlineStatus! Got online status change: \n" + JSON.stringify(messageData));
    var userEmailCausingAction = messageData.userEmail;
    var newUserOnlineState = messageData.onlineState;

    var dataToBroadcast = {};
    dataToBroadcast.action = PossibleActions.takeFriendOnlineStatus;
    dataToBroadcast.userEmail = userEmailCausingAction;
    dataToBroadcast.onlineState = newUserOnlineState;

    var currentUserConnectionData = connectedUsers[userEmailCausingAction];
    //io.sockets.in(currentUserConnectionData[CONN_DATA_KEYS.MY_ROOM]).emit("message", dataToBroadcast);
    var roomToBroadcastTo = currentUserConnectionData[CONN_DATA_KEYS.MY_ROOM];
    console.time().info("Room to broadcast to: " + roomToBroadcastTo);
    socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
}

function changedVideo (socketToAClient, messageData) {
    console.time().info("\nIn changedVideo! Got video change: \n" + JSON.stringify(messageData));

    var userEmail = messageData.userEmail;
    var videoUrl = messageData.videoUrl;
    getVideoDetails(messageData.videoUrl);

    // var dataToBroadcast = {};
    // dataToBroadcast.action = PossibleActions.takeFriendVideoChange;
    // dataToBroadcast.video = {};
    // dataToBroadcast.video.videoTitle = videoTitle;
    // dataToBroadcast.video.videoUrl = videoUrl;
    // dataToBroadcast.video.friend = {};
    //
    // var currentUserConnectionData = connectedUsers[userIdCausingAction];
    // io.sockets.in(currentUserConnectionData.myRoom).emit("message", dataToBroadcast);
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
    connectedUserObj[CONN_DATA_KEYS.SOCKET_ID] = theSocket.id;
    connectedUserObj[CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    connectedUserObj[CONN_DATA_KEYS.FRIENDS_LIST] = friendsList;
    connectedUserObj[CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;

    connectedUsers[userEmail] = connectedUserObj;
    var friendsDataOnline = addSocketToRooms(theSocket, userEmail);

    var dataToReplyWith = {};
    dataToReplyWith.action = PossibleActions.takeVideosBeingWatched;
    dataToReplyWith.videos = friendsDataOnline;

    theSocket.emit('message', dataToReplyWith);
    //console.time().info("Just sent: " + JSON.stringify(dataToReplyWith) + " to client\n");
}

function addSocketToRooms(currentUserSocket, userEmail) {
    console.time().info("Inside addSocketToRooms ...");
    userEmail += ''; // VERY IMPORTANT! FOR EQUALITY CHECK BELOW
    var friendsWhoAreWatchingStuff = [];

    var currentUserConnectionData = connectedUsers[userEmail];
    var myFriendsList = currentUserConnectionData[CONN_DATA_KEYS.FRIENDS_LIST];

    for (var aPossibleFriendUserEmail in connectedUsers) {
        if(connectedUsers.hasOwnProperty(aPossibleFriendUserEmail)) {
            aPossibleFriendUserEmail += ''; // VERY IMPORTANT! FOR EQUALITY CHECK BELOW
            if (aPossibleFriendUserEmail !== userEmail) { //To skip myself
                var possibleFriendConnectedData = connectedUsers[aPossibleFriendUserEmail];
                var possibleFriendGoogleId = possibleFriendConnectedData[CONN_DATA_KEYS.GOOGLE_USER_ID];
                console.time().info("possibleFriendGoogleId: " + possibleFriendGoogleId);

                if(isMyGoogleFriend(myFriendsList, possibleFriendGoogleId)) {
                    console.time().info("Found a google friend online! google user id: " + possibleFriendGoogleId);
                    friendsWhoAreWatchingStuff.push(possibleFriendConnectedData);

                    var friendSocket = io.sockets.connected[possibleFriendConnectedData[CONN_DATA_KEYS.SOCKET_ID]];
                    if(friendSocket) {
                        console.log("Found socket for friend");

                        var myRoom = currentUserConnectionData[CONN_DATA_KEYS.MY_ROOM];
                        console.time().info("myRoom: " + myRoom);
                        friendSocket.join(myRoom);
                        console.time().info("Added my friend's socket to my room.");

                        var myFriendsRoom = possibleFriendConnectedData[CONN_DATA_KEYS.MY_ROOM];
                        console.time().info("myFriendsRoom: " + myFriendsRoom);
                        currentUserSocket.join(myFriendsRoom);
                        console.time().info("Added my socket to friend's room.");
                    }
                }
            }
        }
    }
    return friendsWhoAreWatchingStuff;
}

function isMyGoogleFriend(myFriendsList, otherGoogleUserId) {
    for(var i = 0; i < myFriendsList.length; i++) {
        if(myFriendsList[i].id == otherGoogleUserId) {
            return true;
        } else if(i == myFriendsList.length - 1) {
            return false;
        }
    }
}

function getVideoDetails(youtubeVideoUrl) {
    var pathParam = '/oembed?url=' + youtubeVideoUrl + '&format=json';
    var options = {
        host: 'www.youtube.com',
        path: pathParam
    };

    var req = http.get(options, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));

        // Buffer the body entirely for processing as a whole.
        var bodyChunks = [];
        res.on('data', function(chunk) {
            // You can process streamed parts here...
            bodyChunks.push(chunk);
        }).on('end', function() {
            var body = Buffer.concat(bodyChunks);
            console.time().info('BODY: ' + body);
            // ...and/or process the entire body here.
        })
    });

    req.on('error', function(e) {
        console.log('ERROR: ' + e.message);
    });
}
