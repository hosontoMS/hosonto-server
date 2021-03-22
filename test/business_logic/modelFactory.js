"use strict";

if (typeof define !== "function") {
  var define = require("amdefine")(module);
}

define(function (require, exports) {
  var log = require("../../lib/log/")(module);
  let utils = require("../../lib/util/common");

  var uniqueInstance; // Private attribute that holds the single instance.

  function ModelFactory() {
    // All of the normal singleton code goes here.
  }

  ModelFactory.prototype = {
    securityTypes: utils.dbSecurity,
    initialize: function (mongooseInst) {
      if (!this.mongoose) {
        this.mongoose = mongooseInst;

        log.info("\n *** Registering schemas\n");

        require("./")(this);
      }
    },
  };

  ModelFactory.getInstance = function () {
    if (!uniqueInstance) {
      // Instantiate only if the instance doesn't exist.
      uniqueInstance = new ModelFactory();
    }
    return uniqueInstance;
  };
  return ModelFactory.getInstance();
});
