/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
const BaseConnector = require("../../lib/db/generic/BaseConnector");
const AbstractAccessor = require("../../lib/db/security/AbstractAccessHelper");

const chai = require("chai");
const expect = chai.expect;
chai.config.includeStack = true;
const sinon = require("sinon");
const assertArrays = require("chai-arrays");
chai.use(assertArrays);

var Intrface = require("../../lib/util/Intrface.js");
var {
  sessionParameterTable,
  counters,
} = require("../../lib/db/mongo/StateModels")();
var log = require("../../lib/log/")(module);
const util = require("util");
let testData = require("../test-data/tables");

var MockConnector = function (dbHelper) {
  BaseConnector.apply(this, [this, dbHelper]);

  this.connector = this;
  this.getSessionParameterTable = function () {
    return sessionParameterTable;
  };

  this.getCounters = function () {
    return counters;
  };

  this.updateSessionparamTable = async function (query, upd, callback) {
    let res = await callback(null, { update: `${query} :: ${upd}` });
    return res;
  };

  this.update = async function (tableName, query, upd, isMulti, callback) {
    var qry;
    if (callback) {
      let res = await callback(null, { update: `${query} :: ${upd}` });
      return res;
    } else return [];
  };

  this.findUser = function (query, callback) {
    callback(null, query);
  };

  this.findAndUpdate = function (tableName, query, upd, isMulti, callback) {
    callback(null, { findAndUpdate: query });
  };

  this.delete = function (tableName, query, isMulti, callback) {
    callback(null, { delete: query });
  };

  this.findSessionParam = function (context, query, callback) {
    // context.getSessionParameterTable().find(query, callback);
    callback(null, { __SessionId: 1 });
  };

  this.findDefault = function (context, query, resultCallback) {
    resultCallback(null, testData.test_table);
  };

  this.find = function (tableName, query, fields, isMulti, params, callback) {
    var pageLimit, pageNo;

    //let res = await
    let res = this.getAccessAdvisor(1);
    let resp = callback(null, { find: `${query}${res}` });
    return resp;
  };

  this.getNextSeq = function (name, callback) {
    callback(null, { seq: 1 });
  };
};

Intrface.Extend(MockConnector, BaseConnector);

var MockAccessor = function (accessLevel) {
  AbstractAccessor.apply(this, [this, accessLevel]);
};

Intrface.Extend(MockAccessor, AbstractAccessor);

describe("Baseconnector Abstract function Tests ", function () {
  var baseConnector;
  var accessor = new MockAccessor();

  beforeEach(function () {
    sinon.stub(accessor, "getPermittedFields").returns([{}]);
    var filterStub = sinon.stub(accessor, "filterColumns");
    filterStub.returns(testData.test_table);
    baseConnector = new MockConnector(accessor);
  });

  afterEach(function () {
    baseConnector = null;
    sinon.restore();
  });

  // sinon.replace(console, "log", fake);
  it("should create the connector", function (done) {
    log.debug("CREATE CONN");
    expect(baseConnector).to.exist;
    done();
  });

  // it("should call find successfully", async () => {
  //   let me = this;
  //   let res;
  //   res = await baseConnector.find("test", "qry", null, true, (e, r) => r);
  //   expect(JSON.stringify(res)).to.equal(JSON.stringify({ find: "qry" }));
  //   return;
  // });

  it("should call update successfully", async () => {
    let me = this;

    let res = await baseConnector.update(
      "test",
      "qry",
      null,
      true,
      (err, res) => {
        return res;
      }
    );
    expect(JSON.stringify(res)).to.equal(
      JSON.stringify({ update: "qry :: null" })
    );
    return;
  });

  it("should be able to autoLoadTable call", async () => {
    baseConnector.loadAutoTablePromise = util.promisify(
      baseConnector.loadAutoTable
    );
    let params = { test_TABLE: [] };
    let res = await baseConnector.loadAutoTablePromise(params);

    expect(testData.test_table).to.equalTo(res.test_TABLE);
    return;
  });

  it("should be able to receive error for invalid sessionId for loadAutoParams", async () => {
    baseConnector.loadAutoParamsPromise = util.promisify(
      baseConnector.loadAutoParams
    );
    let params = { test_TABLE: [] };
    try {
      let res = await baseConnector.loadAutoParamsPromise(params);
    } catch (err) {
      expect(err.status).to.equal(500);
    }
    return;
  });

  it("should be able to receive error for invalid sessionId", async () => {
    baseConnector.loadParamsPromise = util.promisify(
      baseConnector.loadParamsForValidSessionId
    );
    let params = { test_TABLE: [] };
    try {
      let res = await baseConnector.loadParamsPromise(params);
    } catch (err) {
      expect(err.status).to.equal(500);
    }
    return;
  });

  it("should be able to autoLoadParams call", async () => {
    baseConnector.loadAutoParamsPromise = util.promisify(
      baseConnector.loadAutoParams
    );
    let params = { __SessionId: 1, test_TABLE: [] };
    let res = await baseConnector.loadAutoParamsPromise(params);

    expect(testData.test_table).to.equalTo(res.test_TABLE);
    return;
  });

  it("should be able to saveAutoParams call", async () => {
    let newRow = { id: 3, user: "Third", name: "master" };
    // sinon.stub(baseConnector, "update").returns([newRow]);
    // var filterStub = sinon.stub(accessor, "filterColumns");

    baseConnector.saveAutoParamsPromise = util.promisify(
      baseConnector.saveAutoParams
    );
    let params = { __SessionId: 1, test_TABLE: [newRow] };
    let res = await baseConnector.saveAutoParamsPromise(baseConnector, params);

    expect(res.test_TABLE).to.equalTo([newRow]);
    return;
  });
});
