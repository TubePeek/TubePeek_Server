"use strict";

//var clientId = "946104220756-g83q8olnduambr5h8pvvt6vnvqi9di8g.apps.googleusercontent.com";
//var clientSecret = "IA71PLwcNp4KJIYTJ1ub3o5h";
//https://developers.google.com/+/best-practices/facebook#the_google_sign-in_button

define(function (require) {
    return {
        signinCallback : function(authResult) {
            console.log("In Google signinCallback")

            if (authResult['access_token']) {
                gapi.client.load('plus','v1', function(){
                    var request = gapi.client.plus.people.get({
                        'userId': 'me'
                    });
                    request.execute(function(response) {
                        var googleAuthData = {};
                        googleAuthData.accessToken = authResult['access_token'];
                        googleAuthData.accessTokenExpiry = authResult['expires_in'];

                        var emailAddress = '';
                        if(response.emails) {
                            if(response.emails.length > 0) {
                                emailAddress = response.emails[0].value;
                            }
                        }
                        googleAuthData.uid = response.id;
                        googleAuthData.emailAddress = emailAddress;
                        googleAuthData.fullName = response.displayName;

                        //setAuthProvider is defined in the webAppMain.js file
                        window.setAuthProvider('google', googleAuthData);
                    });
                });
            } else if (authResult['error']) {
                console.log("There was an error signing the user in");
            }
        }
    };
});
