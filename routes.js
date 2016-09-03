
var Constants = require('./Constants');

var console = null;

module.exports = {
    init : function (app, DummyUser, SocketComms, scribeConsole, scribe) {
        console = scribeConsole;

        app.get('/', function(req, res) {
            res.render('index.html');
        });
        // var Controllers = [
        //     'Uninstall',
        //     'FriendExclusionsController'
        // ];
        // Controllers.map(function(controllerName) {
        //     var controller = require('./controllers/' + controllerName);
        //     controller.setup(app, scribeConsole);
        // });

        var Uninstall = require('./controllers/Uninstall');
        var FriendExclusionsController = require('./controllers/FriendExclusionsController');

        Uninstall.setup(app, scribeConsole, SocketComms);
        FriendExclusionsController.setup(app, scribeConsole);

        var dbEnvVariable = 'WatchWith_DbEnv';
        var dbEnv = process.env[dbEnvVariable];
        if (dbEnv && dbEnv === 'development') {
            app.use('/logs', scribe.webPanel());
            DummyUser.enableDummyUser();
            setupDevEndPoints(app, DummyUser, SocketComms);
        }
    }
};

function setupDevEndPoints(app, DummyUser, SocketComms) {
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
