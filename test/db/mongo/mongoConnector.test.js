/* eslint no-unused-expressions:0, prefer-arrow-callback: 0 */
/* globals describe, it */

"use strict";
const util = require("util");
const chai = require("chai");
const expect = chai.expect;

const chaiHttp = require("chai-http");
const sinon = require("sinon");
const config = require("../../../lib/config");
chai.use(chaiHttp);

const mongoUnit = require("mongo-unit");
const testData = require("../../test-data/tables");
const log = require("../../../lib/log/")(module);
let sessionParameters, users;

describe("Mongo Connector Unit test", function () {
  sessionParameters = require("mongoose").model("sessionparameters");
  sessionParameters.findPromise = util.promisify(sessionParameters.find);
  beforeEach(async () => {
    users = require("mongoose").model("users");
    users.findPromise = util.promisify(users.find);
  });

  it("should receive table using autoLoadData", async () => {
    const results = await chai
      .request("http://localhost:" + config.get("PORT"))
      .get("/autoLoadData/users/");

    expect(results.body.users_TABLE).to.deep.equal(testData.users);
    expect(results.status).to.equal(200);
  });

  it("should receive table using autoLoadData post call", async () => {
    const results = await chai
      .request("http://localhost:" + config.get("PORT"))
      .post("/autoLoadData/")
      .set("content-type", "application/json")
      .send({
        users_TABLE: [],
      });

    expect(results.body.users_TABLE).to.deep.equal(testData.users);
    expect(results.status).to.equal(200);
  });

  it("should receive table using autoLoadData and field", async () => {
    const results = await chai
      .request("http://localhost:" + config.get("PORT"))
      .get("/autoLoadData/users/_id/56d9bf92f9be48771d6fe5b2");

    expect(results.body.users_TABLE).to.deep.equal([testData.users[1]]);
    expect(results.status).to.equal(200);
  });

  it("should load table using executeEvent", async () => {
    const results = await chai
      .request("http://localhost:" + config.get("PORT"))
      .post("/executeEvent")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continue",
        __UseServerSideFunction: false,
        users_TABLE: [],
      });

    let sessionLog = await sessionParameters.findPromise({});

    expect(results.body.users_TABLE).to.deep.equal(testData.users);
    expect(results.status).to.equal(200);
  });

  it("should perform table manipulation", async () => {
    let modifiedUsers = [
      { _id: "56d9bf92f9be48771d6fe5b1", name: "abcd" },
      { _id: "56d9bf92f9be48771d6fe5b2", name: "efgh" },
    ];

    const results = await chai
      .request("http://localhost:" + config.get("PORT"))
      .post("/executeEvent")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continue",
        __UseServerSideFunction: false,
        users_TABLE: modifiedUsers,
      });
    expect(results.body.users_TABLE).to.deep.equal(modifiedUsers);
    expect(results.status).to.equal(200);

    // test database users are modified
    let usersFromDB = await users.findPromise({});
    // deep equal does not work as mongo-unit returns an object
    expect(JSON.stringify(usersFromDB)).to.equal(JSON.stringify(modifiedUsers));

    // test sessionparameters are correctly updated
    let sessionLog = await sessionParameters.findPromise({});
    let numberOfSessions = 0;
    for (let val in sessionLog) {
      switch (sessionLog[val].key) {
        case "__SessionId":
          expect(sessionLog[val].value).to.equal("1");
          numberOfSessions++;
          break;
        case "__EventName":
          expect(sessionLog[val].value).to.be.a("string");
          expect(sessionLog[val].value).to.include(`BL.continue`);
          break;
        case "users_TABLE":
          expect(JSON.parse(sessionLog[val].value)).to.deep.equal(
            modifiedUsers
          );
          console.log(JSON.stringify(sessionLog[val].value));
          break;
      }
    }
    expect(numberOfSessions).to.equal(1);
  });

  it("should perform table manipulation and hide id fields", async () => {
    let modifiedUsers = [
      { _id: "56d9bf92f9be48771d6fe5b1", name: "abcd" },
      { _id: "56d9bf92f9be48771d6fe5b2", name: "efgh" },
    ];

    const results = await chai
      .request("http://localhost:" + config.get("PORT"))
      .post("/executeEvent")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continue",
        __UseServerSideFunction: false,
        users_TABLE: modifiedUsers,
      });
    expect(results.body.users_TABLE).to.deep.equal(modifiedUsers);
    expect(results.status).to.equal(200);

    // test database users are modified
    let usersFromDB = await users.findPromise({});
    // deep equal does not work as mongo-unit returns an object
    expect(JSON.stringify(usersFromDB)).to.equal(JSON.stringify(modifiedUsers));

    // test sessionparameters are correctly updated
    let sessionLog = await sessionParameters.findPromise({});
    let numberOfSessions = 0;
    for (let val in sessionLog) {
      switch (sessionLog[val].key) {
        case "__SessionId":
          expect(sessionLog[val].value).to.equal("1");
          numberOfSessions++;
          break;
        case "__EventName":
          expect(sessionLog[val].value).to.be.a("string");
          expect(sessionLog[val].value).to.equal(`BL.continue`);
          break;
        case "users_TABLE":
          expect(JSON.parse(sessionLog[val].value)).to.deep.equal(
            modifiedUsers
          );
          break;
      }
    }
    expect(numberOfSessions).to.equal(1);
  });

  it("should find a record and update correctly", async () => {
    let modifiedUsers = [
      { _id: "56d9bf92f9be48771d6fe5b1", name: "abcd" },
      { _id: "56d9bf92f9be48771d6fe5b2", name: "efgh" },
    ];
    const results = await chai
      .request("http://localhost:" + config.get("PORT"))
      .post("/executeEvent")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continue",
        __UseServerSideFunction: false,
        users_TABLE: [],
        users_FIELD_: { _id: "56d9bf92f9be48771d6fe5b2" },
        // __SessionUser: { _id: "56d9bf92f9be48771d6fe5b2" },
      });

    expect(results.body.users_TABLE).to.deep.equal([testData.users[1]]);
    expect(results.status).to.equal(200);

    let selected = results.body.users_TABLE[0];
    selected.name = "MODIFIED";
    const results2 = await chai
      .request("http://localhost:" + config.get("PORT"))
      .post("/executeEvent")
      .set("content-type", "application/json")
      .send({
        __EventName: "BL.continue",
        __UseServerSideFunction: false,
        users_TABLE: [selected],
        users_FIELD_: { _id: "56d9bf92f9be48771d6fe5b2" },
        // __SessionUser: { _id: "56d9bf92f9be48771d6fe5b2" },
      });

    expect(results.body.users_TABLE).to.deep.equal([
      { ...testData.users[1], ...selected },
    ]);
    expect(results.status).to.equal(200);

    // test sessionparameters are correctly updated

    let sessionLog = await sessionParameters.findPromise({});
    let numberOfSessions = 0;
    let numberOfOccurrences = 0;
    for (let val in sessionLog) {
      switch (sessionLog[val].key) {
        case "__SessionId":
          expect(sessionLog[val].value).to.be.oneOf(["1", "2"]);
          numberOfSessions++;
          numberOfOccurrences++;
          break;
        case "__EventName":
          expect(sessionLog[val].value).to.be.a("string");
          expect(sessionLog[val].value).to.include(`BL.continue`);
          numberOfOccurrences++;
          break;
        case "users_TABLE":
          numberOfOccurrences++;
          if (sessionLog[val].__SessionId === 1) {
            expect(sessionLog[val].value).to.equal("[]");
          } else {
            log.trace(
              "Modified row::" +
                JSON.stringify({
                  ...testData.users[1],
                })
            );
            expect(JSON.parse(sessionLog[val].value)).to.deep.equal([
              {
                ...testData.users[1],
                ...selected,
              },
            ]);
          }
          break;
      }
    }

    expect(numberOfSessions).to.equal(2);
    expect(numberOfOccurrences).to.be.above(5);
  });
});
