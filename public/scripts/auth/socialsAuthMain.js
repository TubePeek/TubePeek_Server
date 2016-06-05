"use strict";

define(function (require) {
    var facebook = require('./facebookLoginSetup');
    var googlePlus = require('./googlePlusSetup');

    // Keep track of authorization states for both providers.
    window.AuthStates = {
      google: null,
      facebook: null
    };

    window.onGooglePlusClientLibraryLoaded = googlePlus.onGooglePlusClientLibraryLoaded;
    window.signinCallback = googlePlus.signinCallback;

    window.chooseAuthProvider = function() {
      if (AuthStates.google && AuthStates.facebook) {
        if (AuthStates.google['access_token']) {// Signed in with Google, you can now use Google+ APIs.

        } else if (AuthStates.facebook.authResponse) {// Not signed in with Google, but signed in with Facebook

        } else {// Not signed in with anyone, wait until the user chooses a social provider.
        }
      }
    }
    // document.addEventListener('DOMContentLoaded', function() {
    //
    // }, false);
});
