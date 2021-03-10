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
// var BaseConnector = require("../generic/baseConnector.js");
var log = require("../../lib/log/")(module);
const util = require("util");
let testData = require("../test-data/tables");

var MockConnector = function (dbHelper) {
  BaseConnector.apply(this, [this, dbHelper]);

  this.update = async function (tableName, query, upd, isMulti, callback) {
    var qry;
    if (arguments.length <= 3) {
      // Only supplied context, query, upd and callback
      // used default table for update which is SessionParamtable
      this.updateDefault(this, arguments[0], arguments[1], arguments[2]);
    } else {
      let res = await callback(null, { update: `${query} :: ${upd}` });
      return res;
    }
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
    context.getSessionParameterTable().find(query, callback);
  };

  this.findDefault = function (context, query, resultCallback) {
    context.getSessionParameterTable().find(query, resultCallback);
  };

  this.find = function (tableName, query, fields, isMulti, params, callback) {
    var pageLimit, pageNo;

    //let res = await
    let res = this.getAccessAdvisor(1);
    let resp = callback(null, { find: `${query}${res}` });
    return resp;
  };

  this.getNextSeq = function (name, callback) {
    callback(null, 1);
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
    baseConnector.loadAutoTablePromise = util.promisify(
      baseConnector.loadAutoTable
    );
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
    let me = this;
    let params = { test_TABLE: [] };

    let res = await baseConnector.loadAutoTablePromise(params);
    console.log("I am rest:" + res);

    expect(testData.test_table).to.equalTo(res.test_TABLE);
    return;
  });
});
