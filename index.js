"use strict";

var express = require("express");
//var Hashids = require('hashids');
var DummyUser = require('./controllers/DummyUser');
var SocketComms = require('./controllers/SocketComms');
var Constants = require('./Constants');
var scribe = require('scribe-js')();    // if you need to customize scribe.
var console = process.console;


var app = express();
configureWebServer(app);

var server = app.listen(Constants.SERVER_PORT);
var io = require('socket.io').listen(server);

SocketComms.initialize(console, io, DummyUser);
setupCommunications();

function configureWebServer(appObj) {
    var bodyParser = require('body-parser');
    app.use(bodyParser.json()); // support json encoded bodies
    app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

    app.set("view options", {layout: false});
    app.use(express.static(__dirname + '/public'));

    app.get('/', function(req, res) {
        res.render('index.html');
    });

    var dbEnvVariable = 'WatchWith_DbEnv';
    if (process.env[dbEnvVariable] !== undefined) {
        var dbEnv = process.env[dbEnvVariable];

        console.log("[configureWebServer] WatchWith_DbEnv: " + dbEnv);
        if (dbEnv === 'development') {
            appObj.use('/logs', scribe.webPanel());
            DummyUser.enableDummyUser();
        }
    }
    if(DummyUser.shouldAddDummyFriend()) {
        app.post('/dummyUserAdmin', function(req, res) {
            console.time().info("[" + Constants.AppName + "] got post request for /dummyUserAdmin");
            var userEmail = req.body.userEmail;
            var ytVideoUrl = req.body.ytVideoUrl;

            SocketComms.sendDummyVidChangeToUser(ytVideoUrl, userEmail);
            res.send("[" + Constants.AppName + " response: " + userEmail + ', ' + ytVideoUrl);
            res.end();
        });
    }
}

function setupCommunications() {
    io.sockets.on('connection', function (socket) {
        console.time().info("\nGot a client socket.io connection!");
        SocketComms.sendRequestForIdentity(socket);

        socket.on('send', function (data) {
            SocketComms.handleClientMessage(socket, data);
        });
        socket.on('disconnect', function() {
            var disconnectedUserEmail = socket.userEmail;
            SocketComms.handleClientDisconnect(socket, disconnectedUserEmail);
        });
    });
    console.time().info("\nServer initialization done. Ready to receive requests.");
}
