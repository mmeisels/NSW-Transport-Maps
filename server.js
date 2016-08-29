var fs = require('fs');
var express = require('express');
var app = express();
var routes = require('./routes');
var path = require('path');
var config = require('./oauth.js');
var User = require('./user.js');
var mongoose = require('mongoose');
var passport = require('passport');
var fbAuth = require('./authentication.js');
var TwitterStrategy = require('passport-twitter').Strategy;
var GithubStrategy = require('passport-github2').Strategy;
var GoogleStrategy = require('passport-google-oauth2').Strategy;
var InstagramStrategy = require('passport-instagram').Strategy;
// connect to the database
mongoose.connect('mongodb://localhost/passport-example');

// *** Travekl stuff
var request = require('request');
var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var fs = require('fs');
var token;
var tokenConfig = {
    scope: 'user',
    grant_type: 'client_credentials'
};
var credentials = {
    clientID: 'l7xx37865eae257545cea0c30cfb314c0a18',
    clientSecret: '4b487d1ebffe42cb9fc29a61a2844e7f',
    site: 'https://api.transport.nsw.gov.au',
    tokenPath: '/auth/oauth/v2/token',
    useBasicAuthorizationHeader: true,
    useBodyAuth: false
};
//********

var server = app.listen(process.env.PORT || 8080);
var io = require('socket.io').listen(server);

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'my_precious' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// serialize and deserialize
passport.serializeUser(function(user, done) {
  console.log('serializeUser: ' + user._id);
  done(null, user._id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user){
    console.log(user);
      if(!err) done(null, user);
      else done(err, null);
    });
});

// routes
app.get('/', routes.index);

app.get('/account', ensureAuthenticated, function(req, res){
  User.findById(req.session.passport.user, function(err, user) {
    if(err) {
      console.log(err);  // handle errors
    } else {
      console.log('User 2' +req.session.passport.user);
      console.log('User 1' +req.session.passport.user.name);
      res.render('account', { user: user, username:req.session.passport.user.name});
    }
  });
});
app.get('/profile', ensureAuthenticated, function(req, res){
  User.findById(req.session.passport.user, function(err, user) {
    if(err) {
      console.log(err);  // handle errors
    } else {
      res.render('profile', { user: user, username:req.session.passport.user.name});
    }
  });
});

app.get('/auth/facebook',
  passport.authenticate('facebook'),
  function(req, res){});
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/account');
  });
//
// app.get('/auth/twitter',
//   passport.authenticate('twitter'),
//   function(req, res){});
// app.get('/auth/twitter/callback',
//   passport.authenticate('twitter', { failureRedirect: '/' }),
//   function(req, res) {
//     res.redirect('/account');
//   });
//
// app.get('/auth/github',
//   passport.authenticate('github'),
//   function(req, res){});
// app.get('/auth/github/callback',
//   passport.authenticate('github', { failureRedirect: '/' }),
//   function(req, res) {
//     res.redirect('/account');
//   });
//
// app.get('/auth/google',
//   passport.authenticate('google', { scope: [
//     'https://www.googleapis.com/auth/plus.login',
//     'https://www.googleapis.com/auth/plus.profile.emails.read'
//   ] }
// ));
// app.get('/auth/google/callback',
//   passport.authenticate('google', { failureRedirect: '/' }),
//   function(req, res) {
//     res.redirect('/account');
//   });
//
// app.get('/auth/instagram',
//   passport.authenticate('instagram'),
//   function(req, res){});
// app.get('/auth/instagram/callback',
//   passport.authenticate('instagram', { failureRedirect: '/' }),
//   function(req, res) {
//     res.redirect('/account');
//   });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


// test authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}


// Initialize the OAuth2 Library
var oauth2 = require('simple-oauth2')(credentials);

// Get the access token object for the client
oauth2.client.getToken(tokenConfig, saveToken);

app.use(express.static(__dirname + '/public'));


// Save the access token
function saveToken(error, result) {
    if (error) {
        console.log('Access Token Error', error.message);
        console.log(error);
    }else {
      token = oauth2.accessToken.create(result);

    }
};

io.on('connection', function (socket) {

    var requestSettings = {
        method: 'GET',
        url: 'https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/buses',
        encoding: null,
        'auth': {
            'bearer': token.token.access_token
        }
    };

    request.get(requestSettings, function(err, res, body) {
        if (err) {
            console.log('Access Token Error', error.message);
            console.log(error);
        };
        var feed = GtfsRealtimeBindings.FeedMessage.decode(body);
        feed.entity.forEach(function(entity){
          if (entity.alert) {
          //   console.log('Route Alert: ' + entity.alert.cause);
          //   console.log('Route effect: ' + entity.alert.effect);
          //     console.log('Route header_text: ' + entity.alert.header_text);
          }
          if (entity.trip_update) {
            //console.log('Route Alert: ' + entity.trip_update.delay);

          }
          if (entity.vehicle) {
                if (entity.vehicle.position) {
                  //console.log('Access Token Error');
                    socket.emit('vehicle',{route: entity.vehicle.trip.route_id, vehicle: entity.vehicle.trip.trip_id, name: entity.vehicle.trip.trip_id, key: entity.vehicle.trip.trip_id, lat:entity.vehicle.position.latitude,lng:entity.vehicle.position.longitude });
                }
            }
        });
    })

    // var requestSettings2 = {
    //     method: 'GET',
    //     url: 'https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/ferries',
    //     encoding: null,
    //     'auth': {
    //         'bearer': token.token.access_token
    //     }
    // };
    //
    // request.get(requestSettings2, function(err, res, body) {
    //     if (err) {
    //         console.log('Access Token Error', error.message);
    //         console.log(error);
    //     };
    //     var feed2 = GtfsRealtimeBindings.FeedMessage.decode(body);
    //     feed2.entity.forEach(function(entity){
    //       if (entity.alert) {
    //       //   console.log('Route Alert: ' + entity.alert.cause);
    //       //   console.log('Route effect: ' + entity.alert.effect);
    //       //     console.log('Route header_text: ' + entity.alert.header_text);
    //       }
    //       if (entity.trip_update) {
    //         //console.log('Route Alert: ' + entity.trip_update.delay);
    //
    //       }
    //       if (entity.vehicle) {
    //             if (entity.vehicle.position) {
    //               //console.log('Access Token Error');
    //                 socket.emit('ferry',{route: entity.vehicle.trip.route_id, vehicle: entity.vehicle.trip.trip_id, name: entity.vehicle.trip.trip_id, key: entity.vehicle.trip.trip_id, lat:entity.vehicle.position.latitude,lng:entity.vehicle.position.longitude });
    //             }
    //         }
    //     });
    // })

    var requestSettings1 = {
        method: 'GET',
        url: 'https://api.transport.nsw.gov.au/v1/gtfs/vehiclepos/sydneytrains',
        encoding: null,
        'auth': {
            'bearer': token.token.access_token
        }
    };

    request.get(requestSettings1, function(err, res, body) {
        if (err) {
            console.log('Access Token Error', error.message);
            console.log(error);
        };
        var feed1 = GtfsRealtimeBindings.FeedMessage.decode(body);
        feed1.entity.forEach(function(entity){
          if (entity.alert) {
            console.log('Route Alert: ' + entity.alert.cause);
            console.log('Route effect: ' + entity.alert.effect);
              console.log('Route header_text: ' + entity.alert.header_text);
          }
          if (entity.trip_update) {
            console.log('Route Alert: ' + entity.trip_update.delay);

          }
          if (entity.trip) {
            console.log('Trip ID: ' + entity.trip.trip_id);
            console.log('route_id ID: ' + entity.trip.route_id);
            console.log('direction_id ID: ' + entity.trip.direction_id);
            console.log('start_time ID: ' + entity.trip.start_time);

          }
          if (entity.vehicle) {
            console.log(' Route Short Name: ' + entity.vehicle.trip.route_short_name + ' TripID: ' + entity.vehicle.trip.trip_id + ' Route ID: ' + entity.vehicle.trip.route_id);
                if (entity.vehicle.position) {
                    console.log('Location: ' +  entity.vehicle.position.latitude + ' ,' + entity.vehicle.position.longitude)
                    socket.emit('train',{route: entity.vehicle.trip.route_id, vehicle: entity.vehicle.trip.trip_id, name: entity.vehicle.trip.trip_id, key: entity.vehicle.trip.trip_id, lat:entity.vehicle.position.latitude,lng:entity.vehicle.position.longitude });
                }
            }
        });
    })

  // socket.on('my other event', function (data) {
  //   console.log(data);
  // });
});
module.exports = app;
