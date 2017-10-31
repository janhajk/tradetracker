// User Config File
var config = require(__dirname + '/config.js');

var utils = require(__dirname + '/utils.js');


var passport       = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.serializeUser(function(user, done) {
    done(null, user);
});


passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// Google Login
passport.use(new GoogleStrategy({
    clientID: config.google.GOOGLE_CLIENT_ID,
    clientSecret: config.google.GOOGLE_CLIENT_SECRET,
    callbackURL: config.baseurl + '/auth/google/callback'
}, function(accessToken, refreshToken, profile, done) {
    utils.log(profile);
    process.nextTick(function() {
        if(profile.id === config.google.user) {
            utils.log('Login in user "' + profile.displayName + '"');
            return done(null, profile);
        } else {
            utils.log('User not authorised!');
            return done('User not authorised!');
        }
    });
}));

var ensureAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/');
};
exports.ensureAuthenticated = ensureAuthenticated;

var routing = function(app) {
    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/auth/google', passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/plus.login']
    }), function() {});

    app.get('/auth/google/callback', passport.authenticate('google', {
        failureRedirect: '/'
    }), function(req, res) {
        res.redirect('/');
    });

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};
exports.routing = routing;