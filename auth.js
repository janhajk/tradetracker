
const config = {
  users: [{
    id: process.env.UID,
    username: process.env.USER,
    password: process.env.PSW
  }]
};


var passport = require('passport');
var Strategy = require('passport-local').Strategy;



var findById = function(id, cb) {
  process.nextTick(function() {
    var idx = id - 1;
    if (config.users[idx]) {
      cb(null, config.users[idx]);
    }
    else {
      cb(new Error('User ' + id + ' does not exist'));
    }
  });
}

var findByUsername = function(username, cb) {
  process.nextTick(function() {
    for (var i = 0, len = config.users.length; i < len; i++) {
      var record = config.users[i];
      if (record.username === username) {
        return cb(null, record);
      }
    }
    return cb(null, null);
  });
}


// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new Strategy(
  function(username, password, cb) {
    findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != password) { return cb(null, false); }
      return cb(null, user);
    });
  }));


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  findById(id, function(err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});


var ensureAuthenticated = require('connect-ensure-login').ensureLoggedIn();
exports.ensureAuthenticated = ensureAuthenticated;

var routing = function(app) {
  app.use(passport.initialize());
  app.use(passport.session());

  app.post('/login',
    passport.authenticate('local', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/');
    });

  app.get('/logout',
    function(req, res) {
      req.logout();
      res.redirect('/login');
    });
};
exports.routing = routing;
