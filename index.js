var express = require("express");
var Hashids = require('hashids');
var Users = require('./models/Users');
var SocialIdentities = require('./models/SocialIdentities');

//--
//Will contain objects with key: userId and value: socketObject
var connectedUsers = {};

//Contains Session objects ... each session object has a sessionId and a list of users
//var activeSessions = {};

var PossibleActions = {
    identifyUser : 'identifyUser',                         // The server sends this to the client
    sociallyIdentifyYourself : 'sociallyIdentifyYourself', // The client sends this to the server.
    videoStateChange : 'videoStateChange',
    giveMeYourVideoState : 'giveMeYourVideoState',
    takeVideoState : 'takeVideoState',
    //videoChangedByUser : 'videoChangedByUser',
    //roomChange : 'roomChange',

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
}

function setupCommunications() {
    io.sockets.on('connection', function (socket) {
        console.log("Got a connection");

        socket.on('send', function (data) {
            actOnClientMessage(socket, data);
        });
        socket.on('disconnect', function() {
            var userIdOfDisconnectedUser = socket.userId;
            delete connectedUsers[userIdOfDisconnectedUser];
            console.log("Disconnected userId: " + userIdOfDisconnectedUser);
        });
    });
}

function actOnClientMessage(socketToAClient, messageData) {
    var action = messageData.action || "";

    if(action === PossibleActions.sociallyIdentifyYourself) {
        console.log("Got sociallyIdentifyYourself from client: " + JSON.stringify(messageData));
        var authData = messageData.authData;
        var socialProvider = messageData.provider;

        persistSocialIdentity(socketToAClient, socialProvider, authData);
    } else if(action === PossibleActions.giveMeYourVideoState) {
        var userIdCausingAction = messageData.userId;

        var userIdOfWhoWantsVideoState = messageData.userIdOfWhoWantsIt;
        var socketToSendStateTo = connectedUsers[userIdOfWhoWantsVideoState];

        if(socketToSendStateTo && socketToSendStateTo.connected) {
            var dataToReplyWith = {};
            dataToReplyWith.action = PossibleActions.takeVideoState;
            dataToReplyWith.currentPlayTime = messageData.currentPlayTime;
            dataToReplyWith.videoState = messageData.videoState;

            socketToSendStateTo.emit('message', dataToReplyWith);
        }
    } else if(action === PossibleActions.videoStateChange) {
        var userIdCausingAction = messageData.userId;
        var theState = messageData.videoState;

        var dataToReplyWith = {};
        dataToReplyWith.action = PossibleActions.takeVideoState;
        dataToReplyWith.currentPlayTime = messageData.currentPlayTime;
        dataToReplyWith.videoState = theState;

        socketToAClient.broadcast.emit('message', dataToReplyWith);
    }
}

function persistSocialIdentity(socketToSendUserIdTo, socialProvider, authData) {
    Users.findBy('email_address', authData.emailAddress, function(usersFound){
        if(usersFound && usersFound.length > 0) {
            console.log("User already exists.")
            SocialIdentities.findByUserIdAndProvider(authData.uid, socialProvider, function(identitiesFound) {
                if(identitiesFound && identitiesFound.length > 0) {
                    for (var anIdentity in identitiesFound) {
                        if(anIdentity.provider === socialProvider) {
                            identifyConnectedClient(socketToSendUserIdTo, usersFound[0]['id']);
                            break;
                        }
                    }
                } else {
                    insertSocialIdentifyThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, usersFound[0]['id']);
                }
            });
        } else {
            Users.insert({'email_address': authData.emailAddress}, function(idOfNewUser) {
                insertSocialIdentifyThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfNewUser);
            });
        }
    });
}

function insertSocialIdentifyThenIdentifyClient(socketToSendUserIdTo, socialProvider, authData, idOfUser) {
    var socialIdentityInsertObj = {
        'user_id' : idOfUser, 'uid' : authData.uid,
        'provider' : socialProvider,
        'email_address' : authData.emailAddress, 'full_name' : authData.fullName,
        'access_token' : authData.accessToken, 'expires_at' : authData.accessTokenExpiry
    };
    SocialIdentities.insert(socialIdentityInsertObj, function() {
        console.log("social identity inserted successfully.");
        identifyConnectedClient(socketToSendUserIdTo, idOfUser);
    });
}

//This sends the unique userId to the newly connected client
function identifyConnectedClient(theSocket, theUserId) {
    theSocket.userId = theUserId;
    connectedUsers[theUserId] = theSocket;

    var dataToReplyWith = {};
    dataToReplyWith.userId = theUserId;
    dataToReplyWith.action = PossibleActions.identifyUser;

    theSocket.emit('message', dataToReplyWith);
    newUserVideoStateInit(theUserId);
}

//Here, I try to get video state from any other connected user
function newUserVideoStateInit(userIdOfWhoWantsVideoState) {
    for (var aUserId in connectedUsers) {
        if(connectedUsers.hasOwnProperty(aUserId)) {
            if(aUserId !== userIdOfWhoWantsVideoState) {
                var dataToReplyWith = {};
                dataToReplyWith.action = PossibleActions.giveMeYourVideoState;
                dataToReplyWith.userIdOfWhoWantsIt = userIdOfWhoWantsVideoState;

                var socketToAskForVideoState = connectedUsers[aUserId];
                if(socketToAskForVideoState && socketToAskForVideoState.connected) {
                    socketToAskForVideoState.emit('message', dataToReplyWith);
                    break;
                }
            }
        }
    }// end of for loop
}
