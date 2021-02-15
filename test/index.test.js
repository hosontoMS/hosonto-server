/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
const hosonto = require("../lib/hosonto-server");
const chai = require("chai");
const expect = chai.expect;
chai.config.includeStack = true;

describe("Loaded successfully", function () {
  it("should load module", function (done) {
    expect(hosonto).to.exist;
    done();
  });
});
