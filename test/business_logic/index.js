"use strict";

let coreFunctions = function () {
  let businessModule = {};

  businessModule.continue = function ([params], finish) {
    // update the status/ error messages

    // finally call the callback routine to finish the business logic part
    finish(null, params);
  };
  businessModule.continue.allowGlobal = true;

  businessModule.authorizedContinue = function ([params], finish) {
    // update the status/ error messages

    // finally call the callback routine to finish the business logic part
    finish(null, params);
  };
  return businessModule;
};
module.exports = coreFunctions;
