
var Constants = require('./Constants');

var console = null;

module.exports = {
    init : function (app, SocketComms, scribeConsole, scribe) {
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
        }
    }
};
