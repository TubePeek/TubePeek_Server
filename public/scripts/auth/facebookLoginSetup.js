"use strict";


define(function (require) {
  window.fbAsyncInit = function() {
    FB.init({
      appId      : '833454443465085',
      xfbml      : true,
      version    : 'v2.6'
    });
  };

  (function(d, s, id){
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {return;}
     js = d.createElement(s); js.id = id;
     js.src = "//connect.facebook.net/en_US/sdk.js";
     fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));


  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  window.checkLoginState = function() {
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });
  }


  // This is called with the results from from FB.getLoginStatus().
  function statusChangeCallback(response) {
    console.log("FB statusChangeCallback: " + JSON.stringify(response) + "\n");

    if (response.status === 'connected') {// Logged into your app and Facebook.
      testAPI(response.authResponse);
    } else if (response.status === 'not_authorized') {// The person is logged into Facebook, but not your app.
      document.getElementById('status').innerHTML = 'Please log ' +
        'into this app.';
    } else {// The person is not logged into Facebook, so we're not sure if they are logged into this app or not.
      document.getElementById('status').innerHTML = 'Please log into Facebook.';
    }
  }

  // Here we run a very simple test of the Graph API after login is
  // successful.  See statusChangeCallback() for when this call is made.
  function testAPI(fbSuccessAuthResponse) {
    console.log('Welcome!  Fetching your information.... \n');
    var userFbId = fbSuccessAuthResponse.userID;
    var accessToken = fbSuccessAuthResponse.accessToken;
    var accessTokenExpiry = fbSuccessAuthResponse.expiresIn;

    FB.api('/me', function(response) {
      console.log("FB.api(/'me') >>: " + JSON.stringify(response) + "\n");
      var userFbFullName = response.name;
      var userFbId = response.id;
      console.log('Successful fb login for: ' + userFbFullName);

      AuthStates.facebook = response;
      window.chooseAuthProvider();
    });
  }

  //In case you need to export stuff outside
  return {

  };
});
