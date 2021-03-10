"use strict";

let coreFunctions = function () {
  let businessModule = {};

  businessModule.continue = function (params, finish) {
    // update the status/ error messages

    // finally call the callback routine to finish the business logic part
    finish(params);
  };
  businessModule.continue.allowGlobal = true;

  return businessModule;
};
module.exports = coreFunctions;
