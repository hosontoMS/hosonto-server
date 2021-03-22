const api = require("./api/v1/hosonto_api");
const express = require("express");
const log = require("./log/");
module.exports.createServer = function (app, connection, config) {
  // Set up the routing.
  var v1 = express.Router();

  api(v1, connection, config);
  app.use("/api/hosonto/v1", v1);
  //app.use('/v2', v2); // If any other version are designed
  app.use("/", v1); // Set the default version to latest.
};
module.exports.log = log;
