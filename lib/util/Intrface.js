"use strict";

var log = require("../log")(module);

// Constructor.
var Intrface = function (name, methods) {
  log.debug(name + ":methods:" + methods);

  if (arguments.length != 2) {
    throw new Error(
      "Intrface constructor called with " +
        arguments.length +
        "arguments, but expected exactly 2."
    );
  }
  this.name = name;
  this.methods = [];
  for (var i = 0, len = methods.length; i < len; i++) {
    if (typeof methods[i] !== "string") {
      throw new Error(
        "Intrface constructor expects method names to be " +
          "passed in as a string."
      );
    }
    this.methods.push(methods[i]);
  }
};

// Static class method.
Intrface.ensureImplements = function (object) {
  if (arguments.length < 2) {
    throw new Error(
      "Function Intrface.ensureImplements called with " +
        arguments.length +
        "arguments, but expected at least 2."
    );
  }
  for (var i = 1, len = arguments.length; i < len; i++) {
    var Intrface = arguments[i];
    log.trace(Intrface);
    if (Intrface.constructor !== exports.Intrface) {
      throw new Error(
        "Function Intrface.ensureImplements expects arguments" +
          "two and above to be instances of Intrface."
      );
    }
    for (var j = 0, methodsLen = Intrface.methods.length; j < methodsLen; j++) {
      var method = Intrface.methods[j];
      if (!object[method] || typeof object[method] !== "function") {
        throw new Error(
          "Function Intrface.ensureImplements: object " +
            "does not implement the " +
            Intrface.name +
            " Intrface. Method " +
            method +
            " was not found."
        );
      }
    }
  }
};

/* Extend function. */
Intrface.Extend = function (subClass, superClass) {
  var F = function () {};
  F.prototype = superClass.prototype;
  subClass.prototype = new F();
  subClass.prototype.constructor = subClass;
  subClass.superclass = superClass.prototype;
  if (superClass.prototype.constructor == Object.prototype.constructor) {
    superClass.prototype.constructor = superClass;
  }
};

module.exports = exports = Intrface;
