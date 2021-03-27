"use strict";

var Intrface = require("../../util/Intrface.js");
var BaseConnector = require("../generic/BaseConnector.js");
var util = require("util");

var MongoConnector = function (
  mongoose,
  server1,
  connOptions,
  dbHelper,
  config
) {
  BaseConnector.apply(this, [this, dbHelper, config]);
  var log = require("../../log/")(module, config);

  this.mongoose = mongoose;
  var { sessionParameterTable, counters } = require("./StateModels")(
    this.mongoose
  );

  this.server = server1;
  this.options = connOptions;
  this.dbHelper = dbHelper;

  this.connector = this;

  // var cleanSessionParam = function( callback){
  //
  //
  // sessionParameterTable.find({}, function (e, docs){
  //         var cback = callback;
  //         var id = -1;
  //         if (docs[0] && docs[0]["__SessionId"])
  //           id = docs[0]["__SessionId"];
  //         log.debug("\n\n\n FOUND ++++"+(id));
  //         if (id && id > 500){
  //            id = id -600;
  //           sessionParameterTable.remove({"__SessionId":{$lt: id} },cback);
  //         }else
  //           if (callback) callback();
  //       })
  //       .sort({'__SessionId':-1})
  //       .limit(10);
  //
  // };

  // If the connection throws an error
  // this.mongoose.connection.on("connected", null);//this.cleanSessionParam);

  // If the connection throws an error
  this.mongoose.connection.on("error", function (err) {
    console.error("Failed to connect to DB " + server1 + " on startup ", err);
  });

  // When the connection is disconnected
  this.mongoose.connection.on("disconnected", function () {
    log.debug(
      "Mongoose default connection to DB :" + server1 + " disconnected"
    );
  });

  var gracefulExit = function () {
    var mongoose = require("mongoose");

    // cleanSessionParam(function(){
    mongoose.connection.close(function () {
      log.debug(
        "Mongoose default connection with DB :" +
          server1 +
          " is disconnected through app termination"
      );
      process.exit(0);
    });
    // });
  };

  // If the Node process ends, close the Mongoose connection
  process.on("SIGINT", gracefulExit).on("SIGTERM", gracefulExit);

  this.getSessionParameterTable = function () {
    return sessionParameterTable;
  };

  this.getCounters = function () {
    return counters;
  };

  ////////////////////////////////////////////////////

  this.connect = function () {
    log.debug("Connecting to Server: " + this.server);
    this.mongoose.connect(this.server, this.options);
  };

  this.disconnect = function () {
    this.mongoose.disconnect();
  };

  // Schema to be fixed prior to call

  this.create = function (table, row, callback) {
    // var table = this.mongoose.model(tableName, schema);
    var newRow = new table(row);
    // newRow.options({upsert:true, new:true});
    newRow.save(callback);
  };

  this.updateSessionparamTable = function (
    context,
    query,
    update,
    callbackResults
  ) {
    // var q = query, upd = update, cbr = callbackResults;
    // log.debug("query::" + JSON.stringify(query) + " update::"+JSON.stringify(update));
    var qry = context.getSessionParameterTable().update(query, update);
    qry.setOptions({ upsert: true, new: true, multi: true, strict: false });
    qry.exec(callbackResults);
  };

  /**
   *
   *
   */

  this.update = function (tableName, query, upd, isMulti, callback) {
    var qry;
    if (arguments.length <= 3) {
      // Only supplied context, query, upd and callback
      // used default table for update which is SessionParamtable
      this.updateDefault(this, arguments[0], arguments[1], arguments[2]);
    } else {
      var table = this.mongoose.model(tableName);

      log.trace(
        "connection:update:" +
          tableName +
          " :: " +
          util.inspect(query) +
          " :: upd : " +
          util.inspect(upd)
      );
      if (
        (typeof upd === "string" || upd instanceof String) &&
        upd.trim().length <= 0
      ) {
        //callback();
        log.trace(
          "connection:update:return:" +
            tableName +
            " :: " +
            JSON.stringify(query) +
            " :: upd : " +
            JSON.stringify(upd)
        );
        return;
      }

      if (!isMulti) {
        qry = table.findOneAndUpdate(query, upd);
        qry.setOptions({
          upsert: true,
          new: true,
          multi: false,
          strict: false,
        });

        qry.exec(callback);
        // newRow.save(callback);
      } else {
        qry = table.update(query, upd);
        qry.setOptions({ upsert: true, new: true, multi: true, strict: false });
        qry.exec(callback);
      }
    }
  };

  this.findUser = function (query, callback) {
    var Users = mongoose.model(config.get("user-permission-table"));

    Users.findOne(query, (err, res) => {
      callback(err, res);
      log.trace("\n\n\n Found user: \n" + JSON.stringify(res));
    });
  };

  this.findAndUpdate = function (tableName, query, upd, isMulti, callback) {
    var table = this.mongoose.model(tableName);
    var qry;

    log.trace(
      "connection:update:0:" +
        JSON.stringify(query) +
        "upd" +
        JSON.stringify(upd)
    );
    if (!isMulti) {
      qry = table.findOneAndUpdate(query, upd, {
        new: true,
        upsert: true,
        strict: false,
      });
      qry.exec(callback);
      // newRow.save(callback);
    } else {
      qry = table.findOneAndUpdate(query, upd, {
        new: true,
        upsert: true,
        multi: true,
        strict: false,
      });
      qry.exec(callback);
    }
  };

  this.delete = function (tableName, query, isMulti, callback) {
    var table = this.mongoose.model(tableName);
    var qry;

    if (!isMulti) {
      qry = table.findOne(query);
      qry.exec(function (err, doc) {
        if (err) {
          throw err;
        } else {
          qry = doc.remove(callback);
        }
      });
      // newRow.save(callback);
    } else {
      qry = table.remove(query);
      qry.exec(callback);
    }
  };

  this.findSessionParam = function (context, query, callback) {
    log.debug("findSessionparam: " + JSON.stringify(query));
    this.getSessionParameterTable().find(query, callback);
  };

  this.findDefault = function (context, query, resultCallback) {
    this.getSessionParameterTable().find(query, resultCallback);
  };

  this.find = async function (
    tableName,
    query,
    fields,
    isMulti,
    params,
    callback
  ) {
    var pageLimit, pageNo;

    let userAccessAdvisor = {};
    try {
      userAccessAdvisor = await this.getAccessAdvisor(
        (params["__SessionUser"] && params["__SessionUser"]._id) || null
      );
    } catch (err) {
      if (callback)
        callback({ code: 520, message: err }, params["__SessionId"]);
      log.debug("Error occurred inside getAccessAdvisor: " + err);
      return;
    }

    if (
      params[tableName + "__pageLimit"] &&
      params[tableName + "__pageLimit"] != ""
    ) {
      pageLimit = Number(params[tableName + "__pageLimit"]);
    } else {
      params[tableName + "__pageLimit"] = pageLimit = 1000;
    }

    if (
      params[tableName + "__currentPage"] &&
      params[tableName + "__currentPage"] != "" &&
      params[tableName + "__currentPage"] >= 0
    ) {
      pageNo = Number(params[tableName + "__currentPage"]);
    } else {
      params[tableName + "__currentPage"] = pageNo = 1;
    }

    var sortStr = {};
    if (params[tableName + "__sort"]) {
      if (typeof params[tableName + "__sort"] === "object") {
        sortStr = params[tableName + "__sort"];
      } else {
        let temp = params[tableName + "__sort"];
        temp = temp.replace(/\\+\"|\\+\'|(\\\")+/gm, '"');
        sortStr = JSON.parse(temp);
      }
    }

    var searchStr;
    if (params[tableName + "__search"]) {
      if (typeof params[tableName + "__search"] === "object") {
        searchStr = params[tableName + "__search"];
      } else {
        let temp = params[tableName + "__search"];
        temp = temp.replace(/\\+\"|\\+\'|(\\\")+/gm, '"');
        log.debug("\n\n Parsing" + temp);
        searchStr = JSON.parse(temp);
      }
    }
    var biStr;
    if (params[tableName + "__bi"]) {
      if (typeof params[tableName + "__bi"] === "object") {
        biStr = params[tableName + "__bi"];
      } else {
        let temp = params[tableName + "__bi"];
        temp = temp.replace(/\\+\"|\\+\'|(\\\")+/gm, '"');
        biStr = JSON.parse(temp);
      }
    }

    log.trace(
      "\n\n Inside FIND::table:" +
        tableName +
        " str:" +
        JSON.stringify(tableName) +
        " query=" +
        JSON.stringify(query) +
        " sort=" +
        JSON.stringify(sortStr) +
        " search=" +
        JSON.stringify(searchStr) +
        " BI=" +
        JSON.stringify(biStr) +
        " page=" +
        params[tableName + "__currentPage"] +
        " limit=" +
        params[tableName + "__pageLimit"]
    );

    var table = mongoose.model(tableName);

    var biPromises = [];
    if (biStr) {
      if (!Array.isArray(params[tableName + "__bi_results"])) {
        params[tableName + "__bi_results"] = new Array(biStr.length);
      }
      for (var i = 0; i < biStr.length; i++) {
        log.debug("\n BI::" + i + ":" + JSON.stringify(biStr[i]));

        biPromises.push(
          new Promise(
            ((index, table, params, dbHelper) => {
              return (resolve, reject) => {
                log.debug("\n CALLING BI::err" + JSON.stringify(biStr[index]));
                table
                  .aggregate(biStr[index])
                  .allowDiskUse(true)
                  .exec(async function (e, docs) {
                    log.debug(
                      "\n BI::err" +
                        JSON.stringify(e) +
                        " results:" +
                        JSON.stringify(docs)
                    );
                    if (e) reject("BI Execution error" + e);
                    else {
                      let filteredResponse = await dbHelper.filterColumns(
                        tableName,
                        docs,
                        userAccessAdvisor
                      );

                      resolve(
                        (params[tableName + "__bi_results"][
                          index
                        ] = filteredResponse)
                      );
                    }
                  });
              };
            })(i, table, params, this.dbHelper)
          )
        );
      }
    }

    if (!isMulti) {
      table.findOne(query, fields, callback);
    } else {
      var finalQry = {};
      if (
        query &&
        Object.entries(query).length > 0 &&
        searchStr &&
        Object.entries(searchStr).length > 0
      ) {
        finalQry = { $and: [query, searchStr] };
      } else if (query && Object.entries(query).length > 0) {
        finalQry = query;
      } else if (searchStr && Object.entries(searchStr).length > 0) {
        finalQry = searchStr;
      }

      log.debug(
        "\n\n Inside FIND::table22:" +
          tableName +
          " str:" +
          JSON.stringify(tableName) +
          " final query=" +
          JSON.stringify(finalQry) +
          " query=" +
          JSON.stringify(query) +
          " sort=" +
          JSON.stringify(sortStr) +
          " search=" +
          JSON.stringify(searchStr) +
          " BI=" +
          JSON.stringify(biStr) +
          " page=" +
          params[tableName + "__currentPage"] +
          " limit=" +
          params[tableName + "__pageLimit"]
      );

      table.find(finalQry, fields).count(function (err, count) {
        params[tableName + "__rows"] = count;
        log.debug(
          "\n\n TABLE =" +
            tableName +
            " COUNT==" +
            count +
            " final query=" +
            JSON.stringify(finalQry) +
            " Err==" +
            err +
            "\n\n"
        );
      });

      Promise.all(biPromises).then((res) => {
        table
          .find(finalQry, fields, callback)
          .sort(sortStr)
          .skip((pageNo > 0 ? pageNo - 1 : 0) * pageLimit)
          .limit(pageLimit);
      });
    }
  };

  this.getNextSeq = function (name, callback) {
    this.getCounters().findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },

      callback
    );
  };
};

Intrface.Extend(MongoConnector, BaseConnector);

exports.MongoDBConnector = MongoConnector;
