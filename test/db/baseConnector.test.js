/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
const BaseConnector = require("../../lib/db/generic/BaseConnector");
const AbstractAccessor = require("../../lib/db/security/AbstractAccessHelper");
let { MongoAccessHelper } = require("../../lib/db/mongo/MongoAccessHelper");
let mongoose = require("mongoose");

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
} = require("../../lib/db/mongo/StateModels")(mongoose);
var log = require("../../lib/log/")(module);
const util = require("util");
let testData = require("../test-data/tables");
let config = require("../config");

var MockConnector = function (dbHelper, config) {
  BaseConnector.apply(this, [this, dbHelper, config]);

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
    let resp = callback(null, testData.test_table);
    return resp;
  };

  this.getNextSeq = function (name, callback) {
    callback(null, { seq: 1 });
  };
};

Intrface.Extend(MockConnector, BaseConnector);

var MockAccessor = function (accessLevel, config) {
  AbstractAccessor.apply(this, [this, accessLevel, config]);
  this.getPermittedFields = async function () {};

  this.filterColumns = async function (
    tableName,
    rows,
    userAdvisor,
    ownerField,
    sharedField,
    idFields,
    toBeHiddenFields
  ) {
    let response = rows;
    // remove the to be hidden fields
    return response.map((elem) =>
      this.maskFields(elem, userAdvisor._owner_id, idFields, toBeHiddenFields)
    );
  };
};

Intrface.Extend(MockAccessor, AbstractAccessor);
let concreteAccessor = new MockAccessor(null, config);

describe("Baseconnector Abstract function Tests ", function () {
  var baseConnector;

  beforeEach(function () {
    sinon
      .stub(concreteAccessor, "getPermittedFields")
      .returns([
        ["id", "name", "val1", "id2", "owner2", "task"],
        ["_id", "id2"],
        ["_shared_ids"],
        ["_owner_id"],
        ["_owner_id", "owner2"],
      ]);
    baseConnector = new MockConnector(concreteAccessor, config);
  });

  afterEach(function () {
    baseConnector = null;
    sinon.restore();
  });

  it("should create the connector", function (done) {
    expect(baseConnector).to.exist;
    done();
  });

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
    expect(res).to.deep.equal({ update: "qry :: null" });
    return;
  });

  it("should be able to autoLoadTable call", async () => {
    baseConnector.loadAutoTablePromise = util.promisify(
      baseConnector.loadAutoTable
    );
    let params = { test_TABLE: [] };
    let res = await baseConnector.loadAutoTablePromise(params);
    expect(res.test_TABLE.length).to.equal(2);
    expect(res.test_TABLE[0]._id).to.not.equal(testData.test_table[0]._id);
    expect(res.test_TABLE[0].val1).to.equal(testData.test_table[0].val1);
    expect(res.test_TABLE[0].id2).to.not.equal(testData.test_table[0].id2);
    expect(res.test_TABLE[0].owner2).to.not.exist;

    expect(res.test_TABLE[1]._id).to.not.equal(testData.test_table[1]._id);
    expect(res.test_TABLE[1].val1).to.equal(testData.test_table[1].val1);
    expect(res.test_TABLE[1].id2).to.not.equal(testData.test_table[1].id2);
    expect(res.test_TABLE[1].owner2).to.not.exist;

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

    expect(res.test_TABLE.length).to.equal(2);
    expect(res.test_TABLE[0]._id).to.not.equal(testData.test_table[0]._id);
    expect(res.test_TABLE[0].val1).to.equal(testData.test_table[0].val1);
    expect(res.test_TABLE[0].id2).to.not.equal(testData.test_table[0].id2);
    expect(res.test_TABLE[0].owner2).to.not.exist;

    expect(res.test_TABLE[1]._id).to.not.equal(testData.test_table[1]._id);
    expect(res.test_TABLE[1].val1).to.equal(testData.test_table[1].val1);
    expect(res.test_TABLE[1].id2).to.not.equal(testData.test_table[1].id2);
    expect(res.test_TABLE[1].owner2).to.not.exist;

    return;
  });

  it("should be able to saveAutoParams call", async () => {
    let newRow = { id: 3, user: "Third", name: "master" };

    baseConnector.saveAutoParamsPromise = util.promisify(
      baseConnector.saveAutoParams
    );
    let params = { __SessionId: 1, test_TABLE: [newRow] };
    let res = await baseConnector.saveAutoParamsPromise(baseConnector, params);

    expect(res.test_TABLE).to.equalTo([newRow]);
    return;
  });
});
