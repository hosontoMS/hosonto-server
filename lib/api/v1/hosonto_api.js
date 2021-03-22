var util = require("util");
var serverTemplates = require("../../messages");

module.exports = function (app, myConn, config) {
  let log = require("../../log")(module, config);

  let deserialize = function (str, separation, array) {
    var index = function (obj, i) {
      return obj[i];
    };
    return str.split(separation).reduce(index, array);
  };

  let sendHttpResponse = function (res, code, message) {
    errorMessage = serverTemplates.http_messages[code];
    if (code === 200) {
      res.status(200).json(message);
    } else {
      if (config.get("LOG_LEVEL") === "debug") {
        errorMessage = message;
      }
      log.debug("\n\n\nServer error: " + code + " " + JSON.stringify(message));
      res.status(code || 500).json(errorMessage);
    }
  };

  let isAutoDataAllowed = function (req, res, next) {
    log.debug(
      "\n\nAuto Data Api not permitted for security reason, use executeEvent and event endpoint instead."
    );
    if (config.get("ALLOW_AUTODATAHANDLER") === true) {
      return next();
    }
    sendHttpResponse(res, 403);
  };

  let fArray = Array.from(
    Array(config.get("MAX_FIELD_IN_HTTP_REQ")),
    (x, ind) => "/:fieldName" + ind + "?/:fieldValue" + ind + "?"
  );

  app.get(
    "/autoLoadData/:tableName" + fArray.join(""),
    isAutoDataAllowed,
    async function (req, res) {
      log.debug(
        JSON.stringify(req.body) + " params:" + JSON.stringify(req.params)
      );
      let tableName = req.params["tableName"] + "_TABLE";
      let params = {};
      let searchQry = {};
      params[tableName] = [];
      searchQry[req.params["fieldName"] || req.query["fieldName"]] =
        req.params["fieldValue"] || req.query["fieldValue"];
      for (let i = 0; i < 100; i++) {
        searchQry[req.params["fieldName" + i] || req.query["fieldName" + i]] =
          req.params["fieldValue" + i] || req.query["fieldValue" + i];
      }
      params[req.params["tableName"] + "_FIELD_"] = JSON.parse(
        JSON.stringify(searchQry)
      );
      try {
        let loadAutoTablePromise = util.promisify(myConn.loadAutoTable);
        params = await loadAutoTablePromise.call(myConn, params);
        log.debug("Returned params" + JSON.stringify(params));
        sendHttpResponse(res, 200, params);
      } catch (error) {
        log.debug("Returned error" + JSON.stringify(error));
        sendHttpResponse(res, error & error.code, error);
      }
    }
  );

  app.post("/autoLoadData", isAutoDataAllowed, function (req, res) {
    try {
      var params = req.body;

      params["session"] = req.session;
      if (req.session && req.session.passport) {
        params["__SessionUser"] = req.session.passport.user;
      }

      log.debug(
        "\n\nsession::" +
          JSON.stringify(req.session) +
          " &&" +
          params["__SessionUser"] +
          ":::" +
          params["__SessionId"]
      );

      myConn.loadAutoTable(params, function callback(err, params) {
        global._params = params;
        log.trace("LoadTable Params=" + util.inspect(params));
        sendHttpResponse(res, (err && err.code) || 200, params);
      });
    } catch (error) {
      sendHttpResponse(res, 500, error);
    }
  });
  let callFunction = async function (req, res, params, connection, fn) {
    try {
      let fnPromise = util.promisify(fn);
      let passed;

      passed = await fnPromise([params, req, res]);
      if (params["__UseServerSideFunction"] === true) {
        log.trace(
          "\n Returning by server side execution" + util.inspect(passed)
        );
        sendHttpResponse(res, 200, passed);
      } else {
        log.debug(
          "\n\n\n Before SAVE params: " +
            passed.__SessionId +
            util.inspect(connection)
        );
        log.trace("\n\n RETURNED passed:" + util.inspect(passed));
        connection.saveAutoParams(connection, passed, (err, params) => {
          log.debug("\n executeEvent::  Loading params" + params.__SessionId);
          log.trace("\n\n" + util.inspect(params));
          connection.loadAutoParams(params, (err, params) => {
            log.trace(
              "\n\n\n After Load Params" +
                "\n" +
                JSON.stringify(err) +
                "\n" +
                util.inspect(params)
            );
            if (!err) {
              let retParams = { ...params };
              Object.keys(retParams).forEach((key) => {
                if (key.includes("_TABLE")) {
                  let [tableName, desc] = key.split("_TABLE");
                  delete retParams[tableName + "__search"];
                  delete retParams[tableName + "__sort"];
                  delete retParams[tableName + "__bi"];
                }
              });
              sendHttpResponse(res, 200, retParams);
            } else {
              sendHttpResponse(res, err && err.code, []);
            }
          });
          // sendHttpResponse(res, 200, params);
        });
      }
    } catch (err) {
      log.debug("\n ERRROR IN PROMISE" + util.inspect(err));
      sendHttpResponse(res, 500, passed);
    }
  };

  app.post("/executeEvent", function (req, res) {
    var params = req.body;

    log.debug(
      " Request body :: " +
        JSON.stringify(req.body) +
        req.body +
        " request params:" +
        JSON.stringify(req.params)
    );

    params["__IP"] =
      req.ip ||
      (
        (req.headers["x-forwarded-for"] || "").split(",").pop() ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress
      )
        .split(":")
        .slice(-1);

    params["session"] = req.session;

    log.debug(" \n\n\n\nSESSION:: " + JSON.stringify(req.session));

    if (req.session && req.session.passport) {
      params["__SessionUser"] = req.session.passport.user;
    }

    var sessionId = params["__SessionId"];

    var fn = deserialize(params["__EventName"], ".", global);

    global._params = params;
    log.debug(
      "\n Execute fn: " + fn + "\n with Params: " + util.inspect(params)
    );

    try {
      let { isAuthorized, role } = req.isAuthenticated();
      if (
        (fn.allowGlobal && fn.allowGlobal == true) ||
        (isAuthorized && fn.authorizationLevel >= role)
      ) {
        try {
          callFunction(req, res, params, myConn, fn);
        } catch (error) {
          sendHttpResponse(res, error && error.code);
        }
      } else if (!isAuthorized) {
        let newParams = {};
        newParams["__Error"] = serverTemplates.auth_messages.login_required;
        myConn.saveAutoParams(myConn, newParams, (err, params) => {
          myConn.loadAutoParams(params, (err, params) => {
            if (!err) {
              sendHttpResponse(res, 403, params);
            } else {
              sendHttpResponse(res, err && err.code, params);
            }
          });
        });
      }
    } catch (error) {
      sendHttpResponse(res, 500, error);
    }
  });

  let getRemoteFunction = function (req, res, fnName, params) {
    var fn = deserialize(fnName, ".", global);

    log.trace("\nFound fn= " + fn + " \nReq=" + req + "\nParams=" + params);

    try {
      if (!fn) {
        params["__Error"] = serverTemplates.server_messages.remote_fn_not_found;
        myConn.saveAutoParams(myConn, params, (err, params) => {
          myConn.loadAutoParams(params, (err, results) => {
            sendHttpResponse(res, 404, { __Error: params.__Error });
          });
        });
      } else if (fn.allowRemote && fn.allowRemote == true) {
        strFn = fn + " ";
        params["__RemoteFunction"] = strFn;
        log.debug("In param=" + params["__RemoteFunction"]);
        myConn.saveAutoParams(myConn, params, function (err, params) {
          myConn.loadAutoParams(params, (err, results) => {
            sendHttpResponse(res, 200, {
              __RemoteFunction: params.__RemoteFunction,
            });
          });
        });
      } else {
        params["__Error"] = serverTemplates.remote_fn_not_permitted;
        myConn.saveAutoParams(myConn, params, function (err, params) {
          myConn.loadAutoParams(params, function (err, results) {
            sendHttpResponse(res, 403, { __Error: params.__Error });
          });
        });
      }
    } catch (error) {
      sendHttpResponse(res, 500, error);
    }
  };

  app.get("/getRemoteFunction/:fnName", function (req, res) {
    var params = req.params;
    let fnName = req.params["fnName"];
    params["__IP"] =
      req.ip ||
      (
        (req.headers["x-forwarded-for"] || "").split(",").pop() ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress
      )
        .split(":")
        .slice(-1);

    params["session"] = req.session;
    if (req.session && req.session.passport) {
      params["__SessionUser"] = req.session.passport.user;
    }

    getRemoteFunction(req, res, fnName, params);
  });

  app.post("/getRemoteFunction", function (req, res) {
    var params = req.body;

    params["__IP"] =
      req.ip ||
      (
        (req.headers["x-forwarded-for"] || "").split(",").pop() ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress
      )
        .split(":")
        .slice(-1);

    params["session"] = req.session;
    if (req.session && req.session.passport) {
      params["__SessionUser"] = req.session.passport.user;
    }

    var sessionId = params["__SessionId"];

    getRemoteFunction(req, res, params["__EventName"], params);
  });
};
