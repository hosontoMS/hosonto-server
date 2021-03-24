"use strict";

const { MongoAccessHelper } = require("./mongo/MongoAccessHelper.js");
const { MongoDBConnector } = require("./mongo/MongoConnector.js");

var MyConnector = function (
  mongoose,
  dbString,
  options,
  rootAccessor,
  rootConfig
) {
  var uniqueInstance; // Private attribute that holds the single instance.

  function constructor(securityLevel, config) {
    // All of the normal singleton code goes here.
    let accessor =
      rootAccessor ||
      new MongoAccessHelper(securityLevel, config || rootConfig);
    if (!uniqueInstance)
      uniqueInstance = new MongoDBConnector(
        mongoose,
        dbString,
        options,
        accessor,
        config || rootConfig
      );
    return uniqueInstance;
  }

  return {
    getInstance: function (securityLevel, config) {
      if (!uniqueInstance)
        uniqueInstance = constructor(securityLevel, config || rootConfig);
      return uniqueInstance;
    },
  };
};

module.exports = MyConnector;
