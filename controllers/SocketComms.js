var Constants = require('../Constants');
var Utils = require('../Utils');
var Users = require('../dbAccess/Users');
var SocialIdentities = require('../dbAccess/SocialIdentities');

// Will contain objects, with a userEmail value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', myRoom', 'videoData'
var connectedUsers = {};

//{{userEmail}} -> [{{actualFriendsList}}]
var _friendsMegaList = {};

var console = null;
var io = null;
var dummyUser = null;

var clientActionSelector = {
    'takeMySocialIdentity' : sociallyIdentifyYourself,
    'userChangedOnlineStatus' : userChangedOnlineStatus,
    'changedVideo' : changedVideo
};

var socketComm = {};

socketComm.initialize = function(scribeConsole, socketIo, dummy) {
    console = scribeConsole;
    io = socketIo;
    dummyUser = dummy;
};

socketComm.handleClientMessage = function(socket, data) {
    var clientAction = data.action;
    var serverReaction = clientActionSelector[clientAction];

    if (typeof serverReaction == 'function') {
        serverReaction(socket, data); // Every action demands an equal and opposite reaction!
    } else {
        console.time().info("Can't find reaction for: " + clientAction + ". Now panic!");
    }
};

socketComm.handleClientDisconnect = function(clientSocket, userEmail) {
    var currentUser = connectedUsers[userEmail];
    if(currentUser) {
        var dataToBroadcast = {};
        dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
        dataToBroadcast.userEmail = userEmail;
        dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
        dataToBroadcast.onlineState = false;

        var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
        clientSocket.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
        delete connectedUsers[userEmail];
        delete _friendsMegaList[userEmail];
        console.time().info("\nDisconnected UserEmail: " + userEmail);
    }
};

socketComm.sendRequestForIdentity = function (socket) {
    console.time().info("Inside sendRequestForIdentity");

    var initialDataToSend = {};
    initialDataToSend.action = Constants.PossibleActions.pleaseIdentifyYourself;
    socket.emit('message', initialDataToSend);
};

socketComm.sendDummyVidChangeToUser = function (ytVideoUrl, userEmail) {
    var userConnData = connectedUsers[userEmail];
    if (userConnData) {
        var userSocket = io.sockets.connected[userConnData[Constants.CONN_DATA_KEYS.SOCKET_ID]];
        if (userSocket) {
            dummyUser.sendDummyVidChangeToUser(ytVideoUrl, userSocket);
        }
    }
};

//--
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
            var createdAt = Utils.dateFormat(new Date(), "%Y-%m-%d %H:%M:%S", true);
            Users.insertEmail(authData.emailAddress, createdAt, function(idOfNewUser) {
                insertSocialIdentityThenIdentifyClient(socketToAClient, socialProvider, authData, idOfNewUser, friendsList);
            });
        }
    });
    var insertSocialIdentityThenIdentifyClient = function (socketToSendUserIdTo, socialProvider, authData, idOfUser, friendsList) {
        SocialIdentities.insertSocialIdentify(socialProvider, authData, idOfUser, function() {
            console.time().info("\nSocial identity inserted successfully.");
            takeVideosBeingWatched(socketToSendUserIdTo, authData.emailAddress, authData.uid, friendsList);
        });
    };
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

function takeVideosBeingWatched(currentUserSocket, userEmail, googleUserId, friendsList) {
    currentUserSocket.userEmail = userEmail;

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
    if (dummyUser.shouldAddDummyFriend()) {
        friendsList.push(dummyUser.getDummyUserFriendData());
    }
    _friendsMegaList[userEmail] = friendsList;
    var friendsOnYoutube = addSocketToRooms(currentUserSocket, userEmail);
    if (dummyUser.shouldAddDummyFriend()) {
        friendsOnYoutube.push(dummyUser.getConnData());
    }

    var dataToReplyWith = {};
    dataToReplyWith.action = Constants.PossibleActions.takeVideosBeingWatched;
    dataToReplyWith.friendsOnYoutube = friendsOnYoutube;

    currentUserSocket.emit('message', dataToReplyWith);
    //console.time().info("Just sent: " + JSON.stringify(dataToReplyWith) + " to client\n");
}
//--

function addSocketToRooms (currentUserSocket, userEmail) {
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

module.exports = socketComm;
