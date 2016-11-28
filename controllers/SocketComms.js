

var Constants = require('../Constants');
var Utils = require('../Utils');

var SocialIdentities = require('../dbAccess/SocialIdentities');
var UserInfoPersist = require('../dbAccess/UserInfoPersist');
var UserFriends = require('../dbAccess/UserFriends');
var UserVideosPersist = require('../dbAccess/UserVideosPersist');

// Will contain objects, with a google user id value pointing at an object
// The object will have keys: 'socketId', 'googleUserId', myRoom', 'videoData'
var connectedUsers = {};

var console = null;
var io = null;
var socketComm = {};

var clientActionSelector = {
    'takeOnlyMySocialIdentity' : acceptIdentityAnnouncement,
    'userChangedOnlineStatus' : userChangedOnlineStatus,
    'addThisPersonToMyFriendsList': addThisPersonToMyFriendsList,
    'changedVideo' : changedVideo
};

socketComm.initialize = function(scribeConsole, socketIo) {
    console = scribeConsole;
    io = socketIo;
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

socketComm.handleClientDisconnect = function(clientSocket, googleUserId) {
    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        var dataToBroadcast = {};
        dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
        dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
        dataToBroadcast.onlineState = false;

        var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
        clientSocket.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);

        delete connectedUsers[googleUserId];
        broadcastOnlineStatus(clientSocket, false, googleUserId, roomToBroadcastTo);
        //console.time().info("\n\nDisconnected User: googleUserId: " + googleUserId + "\n");
    }
};

socketComm.sendRequestForIdentity = function (socket) {
    var initialDataToSend = {};
    initialDataToSend.action = Constants.PossibleActions.pleaseIdentifyYourself;
    socket.emit('message', initialDataToSend);
};

//--

function acceptIdentityAnnouncement(clientSocket, messageData) {
    console.time().info("\nInside acceptIdentityAnnouncement!\n" + JSON.stringify(messageData));
    var authData = messageData.authData;

    UserInfoPersist.persist(authData, messageData.provider, function() {
        var googleUserId = authData.uid;
        clientSocket[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;

        var connectedUserObj = {};
        connectedUserObj[Constants.CONN_DATA_KEYS.SOCKET_ID] = clientSocket.id;
        connectedUserObj[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
        connectedUserObj[Constants.CONN_DATA_KEYS.MY_ROOM] = "room_" + googleUserId;
        connectedUserObj[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {};
        connectedUsers[googleUserId] = connectedUserObj;

        UserFriends.getFriends(authData.uid, function(allFriends) {
            sendVideosBeingWatched(clientSocket, authData.uid, authData.fullName, authData.imageUrl,
                turnFriendsArrayToObject(allFriends));
        });
    });
    //--
    function turnFriendsArrayToObject(friendsArray) {
        var obj = {};
        for (var i = 0; i < friendsArray.length; ++i) {
            var friendObj = friendsArray[i];
            var friendGoogleUserId = friendObj.friend_google_uid;
            delete friendObj.user_google_uid;
            delete friendObj.friend_google_uid;

            obj[friendGoogleUserId] = friendObj;
        }
        return obj;
    }
}


function userChangedOnlineStatus (socketToAClient, messageData) {
    var googleUserId = messageData.googleUserId;
    var newUserOnlineState = messageData.onlineState;

    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        if(newUserOnlineState) {
            acceptIdentityAnnouncement(socketToAClient, messageData);
        } else {
            delete connectedUsers[googleUserId];

            var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            broadcastOnlineStatus(socketToAClient, false, googleUserId, roomToBroadcastTo);
        }
    } else if(newUserOnlineState) {
        acceptIdentityAnnouncement(socketToAClient, messageData);
    }
}

function addThisPersonToMyFriendsList(socketToAClient, messageData) {
    var currentUserGoogleUserId = messageData.currentUserGoogleUserId;
    var theFriendsGoogleUserId = messageData.theFriendsGoogleUserId;

    var currentDateTime = Utils.dateFormat(new Date(), "%Y-%m-%d %H:%M:%S", true);
    UserFriends.addOneFriend(currentUserGoogleUserId, theFriendsGoogleUserId, currentDateTime, function(idOfInsertRow){
        console.log("First step Friend addition done! idOfInsertRow: " + idOfInsertRow);

        var findSocialIdentities = SocialIdentities.findByUIdAndProvider(theFriendsGoogleUserId, 'google');
        findSocialIdentities.then(function(friendSocialIdentity) {
            if(friendSocialIdentity.length > 0) {

                UserFriends.addOneFriend(theFriendsGoogleUserId, currentUserGoogleUserId, currentDateTime, function(idOfInsertRow){
                    console.log("Second step Friend addition done! idOfInsertRow: " + idOfInsertRow);
                    var dataToSend = {};
                    dataToSend.action = Constants.PossibleActions.newFriendInstalledTubePeek;
                    dataToSend.friend = {
                        googleUserId : theFriendsGoogleUserId,
                        emailAddress : friendSocialIdentity[0]['email_address'],
                        fullName : friendSocialIdentity[0]['full_name'],
                        imageUrl : friendSocialIdentity[0]['image_url'],
                    };
                    socketToAClient.emit('message', dataToSend);
                    //--
                    var friendConnData = connectedUsers[theFriendsGoogleUserId];
                    if (friendConnData) {
                        var friendSocket = io.sockets.connected[friendConnData[Constants.CONN_DATA_KEYS.SOCKET_ID]];
                        if(friendSocket) {
                            var findSocialIdentities2 = SocialIdentities.findByUIdAndProvider(currentUserGoogleUserId, 'google');
                            findSocialIdentities2.then(function(currentUserSocialIdentity) {
                                if(currentUserSocialIdentity.length > 0) {
                                    var dataToSend = {};
                                    dataToSend.action = Constants.PossibleActions.newFriendInstalledTubePeek;
                                    dataToSend.friend = {
                                        googleUserId : currentUserGoogleUserId,
                                        fullName : currentUserSocialIdentity[0]['full_name'],
                                        imageUrl : currentUserSocialIdentity[0]['image_url'],
                                    };
                                    friendSocket.emit('message', dataToSend);
                                }
                            });
                        }
                    }
                });
            }
        });
    });
}

function changedVideo (socketToAClient, messageData) {
    var googleUserId = messageData.googleUserId;
    var videoUrl = messageData.videoUrl;
    var pathParam = '/oembed?format=json&url=' + videoUrl;

    var currentUser = connectedUsers[googleUserId];
    if(currentUser) {
        Utils.doGet('http://www.youtube.com', pathParam, function(youtubeResponse) {
            // console.time().info("Got video details for video change.");
            var videoDetails = JSON.parse(youtubeResponse);
            currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO] = {
                videoUrl : videoUrl,
                title : videoDetails.title,
                thumbnail_url : videoDetails.thumbnail_url
            };
            connectedUsers[googleUserId] = currentUser;
            //--
            var dataToBroadcast = {};
            dataToBroadcast.action = Constants.PossibleActions.takeFriendVideoChange;
            dataToBroadcast.friendChangedVideo = {
                googleUserId : currentUser[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID],
                videoData : currentUser[Constants.CONN_DATA_KEYS.CURRENT_VIDEO]
            };
            var roomToBroadcastTo = currentUser[Constants.CONN_DATA_KEYS.MY_ROOM];
            socketToAClient.broadcast.to(roomToBroadcastTo).emit("message", dataToBroadcast);
            //--
            UserVideosPersist.persist(googleUserId, videoUrl, videoDetails.title);
        });
    }
}
//- End of core client actions


function sendVideosBeingWatched(currentUserSocket, googleUserId, fullName, imageUrl, friendsList) {
    getActiveFriendVids_AddSocketToRooms(currentUserSocket, googleUserId, function (friendVideosOnYoutubeNow) {
        var friendsWhoInstalledTubePeek = {};

        SocialIdentities.findAll(function(allSocialIdentities) {
            if(allSocialIdentities && allSocialIdentities.length > 0) {
                for(var i = 0; i < allSocialIdentities.length; i++) {
                    var aSocialIdentity = allSocialIdentities[i];

                    var foundFriend = friendsList[aSocialIdentity.uid];
                    if(foundFriend) {
                        friendsWhoInstalledTubePeek[aSocialIdentity.uid] = foundFriend;
                    }
                }
            }

            var dataToReplyWith = {};
            dataToReplyWith.action = Constants.PossibleActions.takeVideosBeingWatched;
            dataToReplyWith.friendsOnYoutube = friendVideosOnYoutubeNow;
            dataToReplyWith.friendsOnTubePeek = friendsWhoInstalledTubePeek;

            currentUserSocket.emit('message', dataToReplyWith);
            console.log("videosBeingWatched data sent:\n" + JSON.stringify(dataToReplyWith));
            //addNewUserToFriendsListOfFriends(googleUserId, fullName, imageUrl, friendsWhoInstalledTubePeek);
            //broadcastOnlineStatus(currentUserSocket, true, userEmail, googleUserId, "room_" + googleUserId);
        });
    });
}

function broadcastOnlineStatus(clientSocket, onlineState, googleUserId, roomId) {
    var dataToBroadcast = {};
    dataToBroadcast.action = Constants.PossibleActions.takeFriendOnlineStatus;
    dataToBroadcast[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = googleUserId;
    dataToBroadcast.onlineState = onlineState;

    clientSocket.broadcast.to(roomId).emit("message", dataToBroadcast);
}

function getActiveFriendVids_AddSocketToRooms (currentUserSocket, googleUserId, continueWithActiveFriendVids) {
    var activeFriendVids = {};
    var currentUserConnData = connectedUsers[googleUserId];
    var currentUserRoom = currentUserConnData[Constants.CONN_DATA_KEYS.MY_ROOM];

    UserFriends.getFriends(googleUserId, function (myFriendsList) {
        activeFriendVids = getActiveFriendVids(myFriendsList, function (friendSocketId, isExcluded, friendRoom) {
            var friendSocket = io.sockets.connected[friendSocketId];
            if(friendSocket) {
                friendSocket.join(currentUserRoom);
                if(!isExcluded) {// current User will NOT see activity of friend if friend is excluded
                    currentUserSocket.join(friendRoom);
                }
            }
        });
        continueWithActiveFriendVids(activeFriendVids);
    });
}

function getActiveFriendVids (myFriendsList, onEachConnectedFriend) {
    var activeFriendVids = {};
    var numFriends = myFriendsList.length;
    for(var i = 0; i < numFriends; ++i) {
        var aFriendGoogleUserId = myFriendsList[i]['friend_google_uid'];

        var aFriendConnData = connectedUsers[aFriendGoogleUserId];

        if(aFriendConnData) {// If friend is connected now
            var aFriendVidData = aFriendConnData[Constants.CONN_DATA_KEYS.CURRENT_VIDEO];
            var aFriendVideoUrl = aFriendVidData.videoUrl;

            if (aFriendVideoUrl && aFriendVideoUrl.length > 0) {// If the friend has viewed an actual youtube video
                activeFriendVids[aFriendGoogleUserId] = {};
                activeFriendVids[aFriendGoogleUserId][Constants.CONN_DATA_KEYS.CURRENT_VIDEO] =  {
                    videoUrl : aFriendVideoUrl,
                    title : aFriendVidData.title,
                    thumbnail_url : aFriendVidData.thumbnail_url
                };
                //Is this necessary?
                activeFriendVids[aFriendGoogleUserId][Constants.CONN_DATA_KEYS.GOOGLE_USER_ID] = aFriendGoogleUserId;
            }
            onEachConnectedFriend(aFriendConnData[Constants.CONN_DATA_KEYS.SOCKET_ID],
                myFriendsList[i]['is_friend_excluded'], aFriendConnData[Constants.CONN_DATA_KEYS.MY_ROOM]);
        }
    }
    return activeFriendVids;
}

module.exports = socketComm;
