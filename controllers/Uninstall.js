var Constants = require('../Constants');

var console = null;

var uninstallControl = {
    setup : function (app, scribeConsole) {
        console = scribeConsole;
        
        app.get('/uninstall', doUninstallDance);
    }
};

function doUninstallDance (req, res) {
    var gId = req.query.gId;
    var browser = req.query.browser;
    console.log("gId: " + gId + ", browser: " + browser);

    res.render('uninstall.html');
}

module.exports = uninstallControl;
