"use strict";

var express = require("express");
//var Hashids = require('hashids');
var Constants = require('./Constants');
var SocketComms = require('./controllers/SocketComms');
var DummyUser = require('./controllers/DummyUser');
var routes = require('./routes');

var scribe = require('scribe-js')();    // if you need to customize scribe.
var console = process.console;

var app = express();

configureWebServer();

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

    routes.init(app, DummyUser, SocketComms, console);

    var dbEnvVariable = 'WatchWith_DbEnv';
    var dbEnv = process.env[dbEnvVariable];
    if (dbEnv && dbEnv === 'development') {
        app.use('/logs', scribe.webPanel());
    }

    var server = app.listen(Constants.SERVER_PORT);
    var io = require('socket.io').listen(server);
    setupCommunications(io);
}

function setupCommunications(io) {
    SocketComms.initialize(console, io, DummyUser);

    io.sockets.on('connection', function (socket) {
        console.time().info("\nGot a client socket.io connection!");
        SocketComms.sendRequestForIdentity(socket);

        socket.on('send', function (data) {
            SocketComms.handleClientMessage(socket, data);
        });
        socket.on('disconnect', function() {
            var googleUserId = socket[Constants.CONN_DATA_KEYS.GOOGLE_USER_ID];
            SocketComms.handleClientDisconnect(socket, googleUserId);
        });
    });
    console.time().info("\nServer initialization done. Ready to receive requests.");
}
