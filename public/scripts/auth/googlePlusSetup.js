"use strict";

define(function (require) {
  //var clientId = "946104220756-g83q8olnduambr5h8pvvt6vnvqi9di8g.apps.googleusercontent.com";
  //var clientSecret = "IA71PLwcNp4KJIYTJ1ub3o5h";
  //https://developers.google.com/+/best-practices/facebook#the_google_sign-in_button

  return {
    onGooglePlusClientLibraryLoaded : function() {
        console.log("Google plus client library up and running.");

    },
    signinCallback : function(authResult) {
      console.log("In Google signinCallback")

      if (authResult['access_token']) {
        console.log("Got google access token: " + authResult['access_token']);
        // Signed in with Google+, you can proceed as usual

        AuthStates.google = authResult;
        window.chooseAuthProvider();
      } else if (authResult['error']) {
        // There was an error signing the user in
      }
    }
  };
});
