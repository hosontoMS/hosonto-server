let winston = require("winston");

let defaultConfig = require("../config/default");

let Logger = function (caller, localConfig) {
  let config = localConfig || defaultConfig;
  // set default log level.
  var logLevel = config.get("LOG_LEVEL");
  var logFile = config.get("LOG_FILE");

  // Set up logger
  var customColors = {
    trace: "cyan",
    debug: "green",
    info: "blue",
    warn: "yellow",
    crit: "red",
    fatal: "red",
  };

  var getLabel = function (caller) {
    var parts;
    if (process.platform == "win32") parts = caller.filename.split("\\");
    else parts = caller.filename.split("/");
    return parts[parts.length - 2] + "/" + parts.pop();
  };

  //var getLogger = function(){
  var logger = new winston.Logger({
    colors: customColors,
    level: logLevel,
    levels: {
      fatal: 0,
      crit: 1,
      warn: 2,
      info: 3,
      debug: 4,
      trace: 5,
    },
    transports: [
      new winston.transports.Console({
        label: getLabel(caller),
        colorize: true,
        timestamp: true,
      }),
      new winston.transports.File({ filename: logFile }),
    ],
  });

  winston.addColors(customColors);

  // Extend logger object to properly log 'Error' types
  var origLog = logger.log;

  logger.log = function (level, msg) {
    if (msg instanceof Error) {
      var args = Array.prototype.slice.call(arguments);
      args[1] = msg.stack;
      origLog.apply(logger, args);
    } else {
      origLog.apply(logger, arguments);
    }
  };

  return logger;
};

module.exports = Logger;
