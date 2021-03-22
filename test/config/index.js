/**
 * Server Configuration Script
 */
"use strict";

var nconf = (module.exports = require("nconf"));
var path = require("path");

nconf
  // Command-line arguments
  .argv()
  // Environment variables
  .env(["DATA_BACKEND", "MONGO_URL", "MONGO_COLLECTION", "PORT"])
  .file({
    file: path.join(__dirname, "config.json"),
  })
  // Defaults
  .defaults({
    LOG_LEVEL: "trace",
    LOG_FILE: "debug_messages.log",
    CORS: true,
    ALLOW_AUTODATAHANDLER: true,
    // dataBackend can be 'datastore', 'cloudsql', or 'mongodb'. Be sure to
    // configure the appropriate settings for each storage engine below.
    // If you are unsure, use datastore as it requires no additional
    // configuration.
    DATA_BACKEND: "mongodb",

    // MongoDB connection string
    MONGO_URL: "mongodb+srv://annodb:annohosonto786@anno.ywwxt.mongodb.net/",
    MONGO_COLLECTION: "annoface?retryWrites=true&w=majority",

    MYSQL_USER: "",
    MYSQL_PASSWORD: "",
    MYSQL_HOST: "",

    MAX_FIELD_IN_HTTP_REQ: 100,

    // Default Port the HTTP server
    PORT: 8086,
    HTTPS_PORT: 44386, //for ssl

    // Default Port the HTTP server
    TEST_PORT: 8186,
    TEST_HTTPS_PORT: 44186, //for ssl

    // Processing interval in seconds
    PROCESSING_INTERVAL: 2,
  });

// Check for required settings
checkConfig("DATA_BACKEND");

if (nconf.get("DATA_BACKEND") === "cloudsql") {
  checkConfig("MYSQL_USER");
  checkConfig("MYSQL_PASSWORD");
  checkConfig("MYSQL_HOST");
} else if (nconf.get("DATA_BACKEND") === "mongodb") {
  checkConfig("MONGO_URL");
  checkConfig("MONGO_COLLECTION");
}

function checkConfig(setting) {
  if (!nconf.get(setting)) {
    throw new Error(
      "You must set the " +
        setting +
        " environment variable or" +
        " add it to config.json!"
    );
  }
}
