"use strict";

define(function (require) {
    var facebook = require('./facebookLoginSetup');
    var googlePlus = require('./googlePlusSetup');

    //--Facebook things
    window.fbAsyncInit = facebook.fbAsyncInit;
    facebook.fbImmediatelyExecutingFunc(document, 'script', 'facebook-jssdk');
    window.checkLoginState = facebook.checkLoginState;

    //--Google things
    window.signinCallback = googlePlus.signinCallback;
});
