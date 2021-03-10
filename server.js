/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";

var express = require("express");
var app = express(); // create our app w/ express
//var mongoose = require("mongoose"); // mongoose for mongodb
var util = require("util");
var http = require("http");

var bodyParser = require("body-parser"); // pull information from HTML POST (express4)

var session = require("express-session");

app.use(
  session({
    secret: "leonardo ariano marialupo",
    resave: true,
    saveUninitialized: true,
    cookie: {
      _expires: 74 * 60 * 600000,
    },
  })
);

app.use(flash());

app.use(
  bodyParser.urlencoded({
    extended: "true",
  })
); // parse application/x-www-form-urlencoded
app.use(bodyParser.json());

// configuration =================
var config = require("./lib/config");

global.BL = {};
global.BL.v1 = require("./lib/business_logic/v1"); // (myConn);
global.BL.v1(global.BL.v1); //, myConn, passport, models);
global.BL = global.BL.v1;

var passport = require("passport");

var LocalStrategy = require("passport-local").Strategy;

// var bcrypt = require("bcrypt-nodejs");

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      passReqToCallback: true,
    },
    function (req, username, password, done) {
      return { isAuthorized: done(null, username) };
    }
  )
);

passport.serializeUser(function (user, done) {
  logger.debug("serializeUser::" + user);
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  //   var Users = mongoose.model("sys_users");
  //   logger.debug("deserializeUser::" + JSON.stringify(user));
  //   Users.find({ _id: user._id }, function (err, user1) {
  //     if (err) {
  //       done(err);
  //     }
  done(null, user);
  //   });
});

// Set up the routing.
var v1 = express.Router();

require("./lib/api/v1/hosonto_api")(v1, null);
app.use("/api/v1", v1);
//app.use('/v2', v2); // If any other version are designed
app.use("/", v1); // Set the default version to latest.

// var logger = require("./lib/log")(module, "s_messages.log");

// logger.fatal(new Error("Testing error in logging."));
// logger.info("Hello world-info");
// logger.debug("Hello world-debug");
// logger.log("info", "Hello world-trace");

var httpServer = http.createServer(app);
httpServer.listen(config.get("TEST_PORT"));
