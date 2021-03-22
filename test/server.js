/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";

// var bcrypt = require("bcrypt-nodejs");

exports = module.exports = async (connString) => {
  console.log("initiating server");

  var express = require("express");
  var app = express(); // create our app w/ express
  //var mongoose = require("mongoose"); // mongoose for mongodb
  var util = require("util");
  var http = require("http");
  var log = require("../lib/log")(module);
  var bodyParser = require("body-parser"); // pull information from HTML POST (express4)
  var path = require("path");
  var flash = require("connect-flash");
  var session = require("express-session");
  var testData = require("./test-data/tables.js");

  // configuration =================
  var config = require("./config");

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

  app.set("view engine", "html");
  app.set("view engine", "pug");
  app.set("views", path.join(__dirname, "/"));

  app.use(
    bodyParser.urlencoded({
      extended: "true",
    })
  ); // parse application/x-www-form-urlencoded
  app.use(bodyParser.json());

  //setup CORS

  app.use(function (req, res, next) {
    if (config.get("CORS")) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    }
  });

  let mongoose = require("mongoose");
  // (async () => {
  try {
    console.log("running fake mongo at: ", connString);
    mongoose.connect(connString);

    var models = require("./business_logic/modelFactory");
    models.initialize(mongoose);
    //var dbHelper = require("./server/hosonto/db/util/dbHelper")();
    let { MongoAccessHelper } = require("../lib/db/mongo/MongoAccessHelper");
    let dbHelper = new MongoAccessHelper({}, config);

    var myConn = require("../lib/db/MyConnector.js")(
      connString,
      null,
      dbHelper,
      config
    );

    let passport = require("passport");

    var LocalStrategy = require("passport-local").Strategy;

    passport.use(
      new LocalStrategy(
        {
          passReqToCallback: true,
        },
        function (req, username, password, done) {
          log.debug("local strategy called for" + username);
          //   done(null, username); //
          return { isAuthorized: done(null, username) };
        }
      )
    );

    passport.serializeUser(function (user, done) {
      log.debug("serializeUser::" + user);
      done(null, user);
    });

    passport.deserializeUser(function (user, done) {
      //   var Users = mongoose.model("sys_users");
      log.debug("deserializeUser::" + JSON.stringify(user));
      //   Users.find({ _id: user._id }, function (err, user1) {
      //     if (err) {
      //       done(err);
      //     }
      done(null, user);
      //   });
    });

    app.use(passport.initialize());
    app.use(passport.session());

    class BusinessLogicVault {
      constructor(app, ppt, log) {
        this.passport = ppt;
        this.continue = ([params], finish) => {
          finish(null, params);
        };
        this.continue.allowGlobal = true;

        this.continueRemote = ([params]) => {
          return params;
        };
        this.continueRemote.allowRemote = true;

        this.authorizedContinue = ([params]) => {
          return params;
        };
        //   static continue.allowGlobal = true;
        this.login = async ([params, req, res], finish) => {
          log.debug("auth local\n\n");
          log.debug("passport local " + JSON.stringify(ppt));
          req.body.username = "abc";
          req.body.password = "test";
          await this.passport.authenticate("local", (err, user, info) => {
            log.debug(
              "\r\nCALLED PASSPORT\r\n" + err + user + JSON.stringify(info)
            );
            req.login(user, (err, doc) => {
              console.log("err" + err + "doc" + doc);
              return;
            });
            //finish(params);
            //   done();
          });
          finish(null, params);
        };
        this.login.allowGlobal = true;
      }
    }

    global.BL = new BusinessLogicVault(app, passport, log);

    app.get("/", function (req, res) {
      log.debug("AT ROOT Route ::");
      res.send("/index.html");
    });

    app.get("/failedlogin", function (req, res) {
      log.debug("AT FAIL ::");
      //   log.debug(passport);
      res.send("failed login");
    });

    app.post("/login", function (req, res) {
      console.log("Calling login");
      //   req.body.username = "xyz";
      //   req.body.password = "xyz";
      passport.authenticate("local", (err, user, info) => {
        log.debug(
          "\r\nCALLED PASSPORT\r\n" + err + user + JSON.stringify(info)
        );
        req.login(user, (err, doc) => {
          console.log("\n\n after login err" + err + "doc" + doc);
          res.redirect("/");
        });
        //finish(params);
        //   done();
      });
      // res.redirect("/");
    });

    var isAuthenticated = function (req, res, next) {
      // if user is authenticated in the session, call the next() to call the next request handler
      // Passport adds this method to request object. A middleware is allowed to add properties to
      // request and response objects
      if (req.isAuthenticated()) {
        log.debug("\n\n  authenticated, return to menu");

        return next();
      }
      // if the user is not authenticated then redirect him to the login page

      log.debug("\n\nnot authenticated, return to login");
      // req.session.returnTo = req.url;
      res.redirect("/");
    };

    app.get("/home", isAuthenticated, (req, res) => {
      res.send({ code: 200, body: "HOME SWEET HOME" });
    }); // Set the default version to latest.

    var server = require("../lib/hosonto-server");
    server.createServer(app, myConn.getInstance(), config);
    // var logger = require("../lib/log")(module, "s_messages.log");

    // log.fatal(new Error("Testing error in logging."));
    // log.info("Hello world-info");
    // log.debug("Hello world-debug");
    // log.log("info", "Hello world-log-info");

    var httpServer = http.createServer(app);
    httpServer.listen(config.get("PORT"));
    console.log("Server started.");
  } catch (e) {
    console.log("Error" + e);
  }
  // })();

  // return;
};
