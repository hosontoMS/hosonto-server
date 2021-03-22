/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
const config = require("../../lib/config");
const chai = require("chai");
const chaiHttp = require("chai-http");

const expect = chai.expect;
const should = chai.should();
// const ssinon = require("sinon");
const fs = require("fs");
const util = require("util");
chai.use(chaiHttp);
chai.config.includeStack = true;
var testserver;
var { test_table } = require("../test-data/tables.js");

describe("Test API Calls", function () {
  let testData = [];
  beforeEach(function () {
    testData = test_table;

    testserver = require("./server");
  });

  afterEach(function () {
    testserver = null;
    // sinon.restore();
  });

  it("should handle autoLoadData api", async () => {
    const result = await chai
      .request("http://localhost:" + config.get("TEST_PORT"))
      .get("/autoLoadData/test/")
      .set("content-type", "application/json")
      .send();

    expect(JSON.stringify(result.body.test_TABLE)).to.equal(
      JSON.stringify(testData)
    );
    expect(result.status).to.equal(200);
  });

  it("should handle autoLoadData with params", async () => {
    const result = await chai
      .request("http://localhost:" + config.get("TEST_PORT"))
      .get("/autoLoadData/test/id/2/val/abc")
      .set("content-type", "application/json")
      .send();

    expect(JSON.stringify(result.body.test_TABLE)).to.equal(
      JSON.stringify([].concat(testData[0]))
    );
    expect(JSON.stringify(result.body.test_FIELD_)).to.equal(
      JSON.stringify({ id: "2", val: "abc" })
    );
    expect(result.status).to.equal(200);
  });

  it("should perform executeEvent and load Table ", async () => {
    const result = await chai
      .request("http://localhost:" + config.get("TEST_PORT"))
      .post("/executeEvent")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continue",
        __UseServerSideFunction: false,
        test_TABLE: [],
      });

    expect(JSON.stringify(result.body.test_TABLE)).to.equal(
      JSON.stringify(testData)
    );

    expect(result.status).to.equal(200);
    return;
  });

  it("should give error for unauthorized executeEvent", async () => {
    const result = await chai
      .request("http://localhost:" + config.get("TEST_PORT"))
      .post("/executeEvent")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.authorizedContinue",
        __UseServerSideFunction: false,
        test_TABLE: [],
      });

    if (result.body.__Error) {
      expect(result.body.__Error).length.greaterThan(1);
    } else {
      expect(result.body).to.equal("Forbidden.");
    }
    expect(result.status).to.equal(403);
  });

  it("should not send the unauthorized remote function to client", async () => {
    const result = await chai
      .request("http://localhost:" + config.get("TEST_PORT"))
      .post("/getRemoteFunction")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continue",
        __UseServerSideFunction: false,
      });
    expect(result.status).to.equal(403);
  });

  it("should send the remote function to client getRemoteFunction post request", async () => {
    const result = await chai
      .request("http://localhost:" + config.get("TEST_PORT"))
      .post("/getRemoteFunction")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continueRemote",
        __UseServerSideFunction: false,
      });

    should.exist(result.body.__RemoteFunction);

    expect(result.status).to.equal(200);
  });

  it("should send the remote function to client for getRemoteFunction get request", async () => {
    const result = await chai
      .request("http://localhost:" + config.get("TEST_PORT"))
      .get("/getRemoteFunction/BL.continueRemote")
      .set("content-type", "application/json")
      .send();

    should.exist(result.body.__RemoteFunction);

    expect(result.status).to.equal(200);
  });
});
