//May use this at a later time


// requirejs(["auth/socialsAuthMain"], function(util) {
//     //This function is called when scripts/helper/util.js is loaded.
//     //If util.js calls define(), then this function is not fired until
//     //util's dependencies have loaded, and the util argument will hold
//     //the module value for "helper/util".
// });

// Start loading the main app file. Put all of
// your application logic in there.
//requirejs(['./webAppMain']);

requirejs.config({
    baseUrl: 'scripts',
    app: {
        auth: '../auth'
    }
});

requirejs(['auth/socialsAuthMain']);
