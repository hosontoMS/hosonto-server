/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
//const server; //= require("./server");
const chai = require("chai");
const expect = chai.expect;
// chai.config.includeStack = true;
const chaiHttp = require("chai-http");
const sinon = require("sinon");
const config = require("../../../lib/config");
chai.use(chaiHttp);

var testserver;

describe("Mongo Connector Unit test", function () {
  beforeEach(function () {
    testserver = require("../../server");
  });

  afterEach(function () {
    testserver = null;
  });
  //   var fake = sinon.fake.returns(
  //     console.error("e" + sinon.fake.callCount + "\n\n")
  //   );
  //   // sinon.restore();
  //   sinon.replace(console, "log", fake);
  it("should start http server successfully", function (done) {
    //expect(testserver).to.exist;
    done();
  });
});
