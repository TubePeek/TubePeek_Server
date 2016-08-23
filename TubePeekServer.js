"use strict";

var express = require("express");
//var Hashids = require('hashids');
var DummyUser = require('./controllers/DummyUser');
var SocketComms = require('./controllers/SocketComms');
var Constants = require('./Constants');

var scribe = require('scribe-js')();    // if you need to customize scribe.
var console = process.console;

var app = express();
configureWebServer();
var server = app.listen(Constants.SERVER_PORT);

var io = require('socket.io').listen(server);
setupCommunications();

function configureWebServer() {
    var bodyParser = require('body-parser');
    app.use(bodyParser.json()); // support json encoded bodies
    app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

    app.set("view options", {layout: false});
    app.use(express.static(__dirname + '/public'));

    // http://stackoverflow.com/questions/4529586/render-basic-html-view-in-node-js-express
    app.set('views', __dirname + '/public');
    app.engine('html', require('ejs').renderFile);
    //app.set('view engine', 'ejs');

    app.get('/', function(req, res) {
        res.render('index.html');
    });

    // https://developer.chrome.com/extensions/runtime#method-setUninstallURL
    app.get('/uninstall', function(req, res) {
        var gId = req.query.gId;
        var browser = req.query.browser;
        console.log("gId: " + gId + ", browser: " + browser);

        res.render('uninstall.html');
    });

    var dbEnvVariable = 'WatchWith_DbEnv';
    if (process.env[dbEnvVariable] !== undefined) {
        var dbEnv = process.env[dbEnvVariable];
        if (dbEnv === 'development') {
            setupDevEndPoints();
        }
    }
}

function setupDevEndPoints() {
    app.use('/logs', scribe.webPanel());

    DummyUser.enableDummyUser();
    app.post('/dummyUserAdmin', function(req, res) {
        console.time().info("[" + Constants.AppName + "] got post request for /dummyUserAdmin");
        var userEmail = req.body.userEmail;
        var ytVideoUrl = req.body.ytVideoUrl;
        var googleUserId = req.body.googleUserId;

        SocketComms.sendDummyVidChangeToUser(googleUserId, ytVideoUrl, userEmail);
        res.send("[" + Constants.AppName + "] Response: \n" + googleUserId + ", " + userEmail + ', ' + ytVideoUrl);
        res.end();
    });
}

function setupCommunications() {
    SocketComms.initialize(console, io, DummyUser);

    io.sockets.on('connection', function (socket) {
        console.time().info("\nGot a client socket.io connection!");
        SocketComms.sendRequestForIdentity(socket);

        socket.on('send', function (data) {
            SocketComms.handleClientMessage(socket, data);
        });
        socket.on('disconnect', function() {
            var userEmail = socket.userEmail;
            var googleUserId = socket[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            SocketComms.handleClientDisconnect(socket, userEmail, googleUserId);
        });
    });
    console.time().info("\nServer initialization done. Ready to receive requests.");
}
