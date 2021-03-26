/**
 * Server Configuration Script
 */
"use strict";

module.exports = {
  get: (config) => {
    switch (config) {
      case "LOG_LEVEL":
        return "info";
        break;
      case "LOG_FILE":
        return "log_information.log";
        break;

      default:
        return "info";
        break;
    }
  },
};
