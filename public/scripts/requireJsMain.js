requirejs.config({
    baseUrl: 'scripts',
    app: {
        auth: '../auth'
    }
});

requirejs(['auth/socialsAuthMain'], function(social) {
  //This function is called when scripts/auth/socialsAuthMain.js is loaded.
  //If socialsAuthMain.js calls define(), then this function is not fired until
  //social's dependencies have loaded, and the social argument will hold
  //the module value for "auth/socialsAuthMain".
  
});
