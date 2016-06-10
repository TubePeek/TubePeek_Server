"use strict";


define(function (require) {
  var fbAsyncInit = function() {
    FB.init({
      appId      : '833454443465085',
      xfbml      : true,
      version    : 'v2.6'
    });
  };

  var fbImmediatelyExecutingFunc = function(d, s, id){
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {return;}
     js = d.createElement(s); js.id = id;
     js.src = "//connect.facebook.net/en_US/sdk.js";
     fjs.parentNode.insertBefore(js, fjs);
  };//(document, 'script', 'facebook-jssdk'));


  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  var checkLoginState = function() {
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
      document.getElementById('status').innerHTML = 'Please log into this app.';
    } else {// The person is not logged into Facebook, so we're not sure if they are logged into this app or not.
      document.getElementById('status').innerHTML = 'Please log into Facebook.';
    }
  }

  function testAPI(fbSuccessAuthResponse) {
    var userFbId = fbSuccessAuthResponse.userID;
    var accessToken = fbSuccessAuthResponse.accessToken;
    var accessTokenExpiry = fbSuccessAuthResponse.expiresIn;

    FB.api('/me?fields=id,name,email,permissions', function(response) {
      var fbAuthData = {};
      fbAuthData.accessToken = accessToken;
      fbAuthData.accessTokenExpiry = accessTokenExpiry;

      fbAuthData.uid = userFbId;
      fbAuthData.emailAddress = response.email;
      fbAuthData.fullName = response.name;

      //setAuthProvider is defined in the webAppMain.js file
      window.setAuthProvider('facebook', fbAuthData);
    });
  }

  //In case you need to export stuff outside
  return {
    fbAsyncInit : fbAsyncInit,
    fbImmediatelyExecutingFunc : fbImmediatelyExecutingFunc,
    checkLoginState: checkLoginState
  };
});
