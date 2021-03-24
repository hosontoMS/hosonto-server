/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
const AbstractAccessor = require("../../lib/db/security/AbstractAccessHelper");
const chai = require("chai");
const assertArrays = require("chai-arrays");
chai.use(assertArrays);

const expect = chai.expect;
chai.config.includeStack = true;

var Intrface = require("../../lib/util/Intrface.js");
var { dbSecurity } = require("../../lib/util/common.js");
// var BaseConnector = require("../generic/baseConnector.js");
// var log = require("../../../log.js")(module, "dev_messages.log");
// var util = require("util");
let config = require("../config/");
let testData = require("../test-data/tables");

var MockAccessor = function (accessLevel) {
  AbstractAccessor.apply(this, [null, accessLevel, config]);
};

Intrface.Extend(MockAccessor, AbstractAccessor);

describe("Abstract Accessor Tests ", function () {
  // var fake = sinon.fake.returns(
  //   console.error("e" + sinon.fake.callCount + "\n\n")
  // );
  // sinon.restore();

  let accessor;
  beforeEach(function () {
    accessor = new MockAccessor();
  });

  afterEach(function () {
    accessor = null;
  });

  it("should create the accessor", function (done) {
    let accessAdvisor = accessor.getUserAccessAdvisor(
      { _id: "123", role: "", _shared: ["a", "b", "v"] },
      "_id",
      null,
      "_shared"
    );
    expect(accessAdvisor).to.exist;
    expect(accessor.accessLevel).to.equal(dbSecurity.PUBLIC);
    expect(accessAdvisor.isAdmin).to.equal(false);
    expect(accessAdvisor.isSuperadmin).to.equal(false);
    expect(accessAdvisor._owner_id).to.equal("123");
    expect(accessAdvisor._shared_ids).to.be.equalTo(["a", "b", "v"]);
    done();
  });

  it("should get null for contextual functions", async () => {
    let me = this;
    let res = await accessor.getPermittedFields("test", {
      _id: "123",
      role: "",
    });
    let filtered = await accessor.filterColumns(
      "test",
      {},
      { _id: "123", role: "" }
    );
    expect(res).to.not.exist;
    expect(filtered).to.not.exist;
    return;
  });

  it("should mask fields", async () => {
    let me = this;
    let res = await accessor.maskFields(
      {
        id: "123",
        role: "admin",
        test: "iam joy",
        _owner_id: "256",
      },
      "_owner_id",
      ["id", "role"],
      ["_owner_id"]
    );
    console.log(res);
    expect(res.id).to.exist;
    expect(res._owner_id).to.not.exist;
    expect(res.test).to.equal("iam joy");
    expect(res.role).to.not.equal("admin");
    expect(res.id).to.not.equal("123");
    return;
  });

  it("should correctly decode fields", async () => {
    let me = this;
    let res = await accessor.maskFields(
      {
        id: "123",
        role: "78ab",
        test: "iam joy",
        _owner_id: "256",
      },
      "_owner_id",
      ["id", "role"],
      ["_owner_id"]
    );

    let unmasked = await accessor.unmaskFields(res, "256", ["id", "role"]);
    expect(unmasked.id).to.exist;
    expect(unmasked._owner_id).to.not.exist;
    expect(unmasked.test).to.equal("iam joy");
    expect(unmasked.id).to.equal("123");
    expect(unmasked.role).to.equal("78ab");
    return;
  });
});
