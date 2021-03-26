/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
const AbstractAccessor = require("../../../lib/db/security/AbstractAccessHelper");
const chai = require("chai");
const expect = chai.expect;

const assertArrays = require("chai-arrays");
chai.use(assertArrays);

chai.config.includeStack = true;

var Intrface = require("../../../lib/util/Intrface.js");
let config = require("../../config");
var log = require("../../../lib/log")(module, config);

let testData = require("../../test-data/tables");
const {
  MongoAccessHelper,
} = require("../../../lib/db/mongo/mongoAccessHelper");
let mongoose = require("mongoose");
let modelDef = require("./testModel.js")(mongoose);

describe("Concrete Accessor Tests ", function () {
  let accessor;
  beforeEach(function () {
    accessor = new MongoAccessHelper(mongoose, null, config);
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
    expect(accessAdvisor.isAdmin).to.equal(false);
    expect(accessAdvisor.isSuperadmin).to.equal(false);
    expect(accessAdvisor._owner_id).to.equal("123");
    expect(accessAdvisor._shared_ids).to.be.equalTo(["a", "b", "v"]);
    done();
  });

  it("should filter required fields ", async () => {
    let filtered = await accessor.filterColumns(
      "sys_users",
      testData.users_table,
      testData.users_table[0],
      "id",
      "_shared_ids",
      ["id"],
      ["_owner_id", "_shared_ids", "__SessionId"]
    );
    expect(filtered[0]).to.exist;
    expect(filtered[0]._id).to.not.equal("1");
    expect(filtered[0]._shared_ids).to.not.exist;
    expect(filtered[0].password).to.exist;
    expect(filtered[1].password).to.not.exist;
    expect(filtered[0].about).to.exist;
    expect(filtered[1].about).to.exist;
    expect(filtered[2].about).to.not.exist;
    return;
  });

  it("should get the permitted fields from table level access description", async () => {
    let [fields] = await accessor.getPermittedFields(
      "sys_users",
      accessor.getUserAccessAdvisor(testData.users_table[0])
    );
    expect(fields.role).to.equal(0);
    expect(fields.status).to.equal(0);
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
      "256",
      ["id", "role"],
      ["_owner_id"]
    );

    let decoded = await accessor.unmaskFields(res, "256", ["id", "role"]);
    console.log(decoded);
    expect(decoded.id).to.exist;
    expect(decoded._owner_id).to.not.exist;
    expect(decoded.test).to.equal("iam joy");
    expect(decoded.id).to.equal("123");
    expect(decoded.role).to.equal("78ab");
    return;
  });
});
