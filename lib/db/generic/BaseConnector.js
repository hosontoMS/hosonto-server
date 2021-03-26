"use strict";

let util = require("util");
let commUtils = require("../../util/common.js");
var log;

/**
 * @date 2021-03-22
 * @param {object ref} myConnector  actual concrete DB connector reference
 * @param {object} dbHelper - reference security helper object
 * @param {any} config - global configuration
 * @returns {any}
 */
function BaseConnector(myConnector, dbHelper, config) {
  this.dbHelper = dbHelper;
  this.accessAdvisorCache = {};
  log = this.log = require("../../log/")(module, config);
}

let buildQuery = async (context, tableName, params) => {
  var qry1 = {};
  var qry = {};

  if (params[tableName + "_FIELD_"] && params[tableName + "_FIELD_"] != "") {
    if (typeof params[tableName + "_FIELD_"] === "object") {
      qry1 = params[tableName + "_FIELD_"];
    } else {
      try {
        qry1 = JSON.parse(params[tableName + "_FIELD_"]);
      } catch (e) {
        qry1 = params[tableName + "_FIELD_"];
      }
    }
    qry = await context.dbHelper.unmaskFields(
      qry1,
      params["__SessionUser"] && params["__SessionUser"]._id,
      ["_id", "_shared_ids"]
    );
  }

  log.debug(
    "Baseconnector.LoadAutotable: Table name:" +
      tableName +
      " Orig qry=" +
      JSON.stringify(qry1) +
      " decoded qry=" +
      JSON.stringify(qry)
  );

  return qry;
};

/**
 *
 */

const updateSessionparam = async function (context, qryParam, updParam) {
  log.trace(
    "\n\nUpdate else Results ::" +
      util.inspect(qryParam) +
      util.inspect(updParam)
  );
  context.updateSessionparamTablePromise = util.promisify(
    context.updateSessionparamTable
  );
  return await context.updateSessionparamTablePromise(qryParam, updParam);
};

const updateParam = async function (
  context,
  qryParam,
  updParam,
  table,
  user_id
) {
  let qry = {};
  let upd = {};
  log.trace(
    `\n\n\n Table :: ${String(table)} Query :: ${JSON.stringify(
      qryParam
    )} Update :: ${JSON.stringify(upd)}`
  );
  if (table) {
    try {
      qry = await context.dbHelper.unmaskFields(qryParam, user_id, [
        "_id",
        "_owner_id",
        "_shared_ids",
      ]);

      log.debug("\nReceived Qry" + JSON.stringify(qry));
      // upd = updParam;
      // if (upd._id) {
      //   updParam._id = qry._id;
      // }
      upd = await context.dbHelper.unmaskFields(updParam, user_id, [
        "_id",
        "_owner_id",
        "_shared_ids",
      ]);
      if (upd.isDeleted) {
        context.connector.deletePromise = util.promisify(
          context.connector.delete
        );
        return await context.connector.deletePromise(table, qry, true);
      } else {
        context.connector.updatePromise = util.promisify(
          context.connector.update
        );

        log.trace("\n\nUpdate ::" + util.inspect(qry) + util.inspect(upd));

        // tableName, query, update isMulti, callback
        let res = await context.connector.updatePromise(table, qry, upd, true);
        log.trace("\n\nUpdate Results ::" + util.inspect(res));

        return res;
      }
    } catch (err) {
      log.debug("Error occurred." + util.inspect(err));
    }
  } else {
    updateSessionparam(context, qryParam, updParam);
  }
};

BaseConnector.prototype = {
  getAccessAdvisor: async function (user_id) {
    if (this.accessAdvisorCache[user_id]) {
      log.trace(
        "\n Found userAccessInfo in Cache: \n" +
          JSON.stringify(this.accessAdvisorCache[user_id])
      );

      return this.accessAdvisorCache[user_id];
    }
    let findPromise = util.promisify(this.connector.findUser);

    if (user_id) {
      try {
        let response = await findPromise({ _id: user_id });

        log.trace("\n Found userAccess Row:\n " + JSON.stringify(response));

        this.accessAdvisorCache[user_id] = {
          isUser: true,
          _owner_id: user_id,
          _shared_ids:
            (response && response[0] && response[0]._shared_ids) || null,
          isSuperadmin:
            (response && response[0] && response[0].role == "superadmin") ||
            false,
          isAdmin:
            (response && response[0] && response[0].role == "admin") || false,
        };
        if (this.accessAdvisorCache[user_id].isSuperadmin)
          this.accessLevel = commUtils.dbSecurity.RESTRICTED;
        else if (this.accessAdvisorCache[user_id].isAdmin)
          this.accessLevel = commUtils.dbSecurity.ADMIN;
        else this.accessLevel = commUtils.dbSecurity.PROTECTED;

        return this.accessAdvisorCache[user_id];
      } catch (err) {
        log.trace(
          "\n\n\n Error in userAccess Row \n\n\n\n" + JSON.stringify(err)
        );
        return null;
      }
    } else {
      this.accessAdvisorCache[0] = {
        isUser: true,
        _owner_id: null,
        _shared_ids: null,
        isSuperadmin: false,
        isAdmin: false,
      };
      return this.accessAdvisorCache[0];
    }
  },

  loadAutoTable: async function (params, cback) {
    var me = this;
    var __SessionId = "0";

    var currentParam;
    try {
      for (currentParam in params) {
        // {
        var splitTABLE = currentParam.split(new RegExp("_TABLE"));
        log.trace(
          "\nBaseconnector.loadAutoTable:: parameter: " +
            currentParam +
            " with value: " +
            util.inspect(params[currentParam])
        );

        // we intend to load only table here so if it is referring to
        // fields we are not doing anything
        if (splitTABLE.length > 1 && !splitTABLE[1]) {
          let tableName = splitTABLE[0];
          let qry;
          try {
            qry = await buildQuery(me, tableName, params);
          } catch (err) {
            params["__Error"] = "An exception occurred.";
            if (cback) cback({ code: 520, message: err }, params);
            log.debug("Error occurred, " + err);
            return;
          }

          let userAccessAdvisor = {};

          userAccessAdvisor = await me.getAccessAdvisor(
            (params["__SessionUser"] && params["__SessionUser"]._id) || null
          );
          var isAppendPage = params[tableName + "__appendPage"];
          let [
            filteredFields,
            idFields,
            sharedFields,
            ownerFields,
            hiddenFields,
          ] = await me.dbHelper.getPermittedFields(
            tableName,
            userAccessAdvisor
          );

          if (filteredFields) {
            log.debug(
              "Baseconnector.LoadAutotable::" +
                "filtered Fields" +
                JSON.stringify(filteredFields)
            );
            me.connector.findPromisify = util.promisify(me.connector.find);
            // tableName, query, isMulti, callback

            let foundResponse = await me.connector.findPromisify(
              tableName,
              qry,
              filteredFields,
              true,
              params
            );

            let filteredResponse = await me.dbHelper.filterColumns(
              tableName,
              foundResponse,
              userAccessAdvisor,
              [...new Set([...ownerFields, "_id"])],
              [...new Set([...sharedFields, "_shared_ids"])],
              [...new Set([...idFields, "_id"])],
              hiddenFields || []
            );

            log.trace(
              " Table::" +
                tableName +
                " found::" +
                JSON.stringify(foundResponse) +
                " typeof ::" +
                typeof foundResponse +
                "\n filtered ::" +
                JSON.stringify(filteredResponse)
            );

            if (!isAppendPage || isAppendPage == 0) {
              if (typeof filteredResponse === "string") {
                params[currentParam] = filteredResponse.replace(
                  /^\"+|\"+$/gm,
                  ""
                ); // JSON.stringify(returnObj);
              } else {
                params[currentParam] = filteredResponse;
              }
            } else {
              if (!params[currentParam]) {
                params[currentParam] = [];
              }

              if (typeof filteredResponse === "string") {
                params[currentParam] = params[currentParam].concat(
                  filteredResponse.replace(/^\"+|\"+$/gm, "")
                );
              } else if (Array.isArray(params[currentParam])) {
                params[currentParam] = params[currentParam].concat(
                  filteredResponse
                );
              } else {
                params[currentParam] = filteredResponse;
              }
            }
          }
        }
      }

      if (cback) cback(null, params);
    } catch (err) {
      log.debug(
        "\n\n *** ERROR occurred in loadAutoTable:: " + util.inspect(err)
      );
      params["__Error"] = "Error occurred.";
      if (cback) cback({ code: 520, message: err }, params);
    }
  },

  loadAutoParams: async function (params, callback) {
    if (
      !params.__SessionId ||
      params.__SessionId === 0 ||
      params.__SessionId === "" ||
      params.__SessionId === undefined
    ) {
      try {
        this.connector.getNextSeqPromise = util.promisify(
          this.connector.getNextSeq
        );
        let nextSeq = await this.connector.getNextSeqPromise("__SessionId");
        log.trace("\nloadAutoParams:: Next SessionID" + util.inspect(nextSeq));
        params.__SessionId = nextSeq.seq;
        BaseConnector.prototype.loadParamsForValidSessionId.call(
          this,
          params,
          callback
        );
      } catch (err) {
        log.trace("\nloadAutoParams:: err: " + util.inspect(err));
        //   if (callback)
        //     callback({ status: 500, message: "Cannot get next SessionId" }, null);
      }
    } else {
      log.trace(
        "\nloadAutoParams:: SessionID" + util.inspect(params.__SessionId)
      );
      BaseConnector.prototype.loadParamsForValidSessionId.call(
        this,
        params,
        callback
      );
    }
  },

  loadParamsForValidSessionId: async function (params, callback) {
    log.debug("\nInside loadAutoParamsForValidSessionId:");
    log.trace("params :: " + util.inspect(params));

    if (
      !params.__SessionId ||
      params.__SessionId === "" ||
      params.__SessionId === undefined
    ) {
      if (callback)
        callback({ status: 500, message: "Session Id missing." }, null);
      return;
    }

    this.connector.findDefaultPromise = util.promisify(
      this.connector.findDefault
    );
    try {
      let res = await this.connector.findDefaultPromise(this.connector, {
        __SessionId: params.__SessionId,
      });
      log.debug(
        "\n loadParamsForValidSessionId:: SUCCESS  " + util.inspect(res)
      );

      for (var i = 0, j = 0; i < res.length; i++) {
        log.trace("Key:" + res[i].key + "Value:" + res[i].value);

        if (
          res[i].subKey == null ||
          res[i].subKey == "" ||
          res[i].subKey == undefined
        ) {
          if (typeof res[i].value === "string") {
            params[res[i].key] = res[i].value.replace(/^\"+|\"+$/gm, "");
          } else {
            params[res[i].key] = res[i].value;
          }
          j = 0;
        } else {
          j++;
          if (typeof res[i].value === "string") {
            params[res[i].key][res[i].subKey][j] = res[i].value.replace(
              /^\"+|\"+$/gm,
              ""
            );
          } else {
            params[res[i].key][res[i].subKey][j] = res[i].value;
          }
        }
      }
    } catch (err) {
      log.debug("\n loadParamsForValidSessionId:: ERROR " + util.inspect(err));
    }
    BaseConnector.prototype.loadAutoTable.call(this, params, callback);
  },

  saveAutoParams: async function (context, params, callbackSaveAutoParams) {
    var me = context;
    var __SessionId = "0";

    if (!params) params = {};

    me.callback = callbackSaveAutoParams;
    // log.trace("\n\n saveAutoParams:: context " + util.inspect(me));
    if (params["readOnly"] === true) {
      callbackSaveAutoParams(null, params);
      return;
    }

    try {
      me.findSessionParamPromise = util.promisify(me.findSessionParam);
      let res = await me.findSessionParamPromise(me.connector, {
        __SessionId: params["__SessionId"],
      });

      log.debug("\n\n saveAutoParams:: findSeesionID " + util.inspect(res));
      __SessionId = params["__SessionId"];
      if (!__SessionId && res && res[0]) __SessionId = res[0]["__SessionId"];
      if (!__SessionId) {
        log.debug("\n\n saveAutoParams:: SessionId Not Found " + __SessionId);
        throw { code: -1, message: "Error: No SessionId" };
      } else {
        log.debug("\n\n saveAutoParams:: Found SessionId " + __SessionId);
        params["__SessionId"] = __SessionId;
        BaseConnector.prototype.saveParamsForValidSessionId.call(
          me,
          __SessionId,
          params,
          me.callback
        );
      }
    } catch (err) {
      log.debug("\n\nCatch in SaveAutoParams, err: " + util.inspect(err));
      me.getNextSeqPromise = util.promisify(me.getNextSeq);
      try {
        let nextSeq = await me.getNextSeqPromise("__SessionId");
        log.trace(
          "\n\nCatch in SaveAutoParams, apply session ID: " + nextSeq["seq"]
        );

        params["__SessionId"] = nextSeq["seq"];
        BaseConnector.prototype.saveParamsForValidSessionId.call(
          me,
          nextSeq["seq"],
          params,
          me.callback
        );
      } catch (err) {
        me.callback(err, params);
      }
    }
  },

  saveParamsForValidSessionId: function (__SessionId, params, callback) {
    const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);

    let me = this;
    log.debug(
      `\n\n\n saveParamsForValidSessionId:: for SessionId : ${__SessionId}`
    );
    log.trace(` params::${util.inspect(params)}`);
    params.__SessionId = __SessionId;

    const user_id = params["__SessionUser"] && params["__SessionUser"]._id;

    let promises = Object.keys(params).map((p) => {
      me = this;
      if (params[p] && params[p].readOnly) return;
      const arr = p.split("_TABLE");
      log.trace(
        `@@ SAVEPARAMS${p} val ${util.inspect(params[p])} Arr=${util.inspect(
          arr
        )} length=${arr.length}`
      );

      const qrySession = {
        __SessionId,
        key: p,
      };
      const updSession = {
        __SessionId,
        key: p,
        value:
          // JSON.stringify(params[p]).trim("\"'"),
          typeof params[p] === "string"
            ? params[p]
            : // :
              // p.includes("http")
              // ? params[p]
              JSON.stringify(params[p]),
      };

      updateParam(me, qrySession, updSession, "sessionparameters", user_id);

      if (arr.length > 1 && !arr[1]) {
        // updateParam(me, qrySession, updSession, "sessionparameters", user_id);
        if (
          params[arr[0] + "__permission"] &&
          params[arr[0] + "__permission"] < 2
        )
          return;

        log.debug(`Save table:: ${arr[0]} __SessionId:: ${__SessionId} `);
        log.trace(`\nvalues = ${JSON.stringify(params[p])}`); // qry = ${JSON.stringify(upd)}`);
        let qry;
        let upd;

        // It comes as numeric indexed object so array
        //  (Array.isArray or constructor==Array) testing does not work
        if (typeof params[p] === "object" && params[p][0]) {
          log.trace(`param::array ${JSON.stringify(params[p])}`);
          let isNumericIndex = true;

          const keys = Object.keys(params[p]);
          for (let i = 0; i < keys.length; i++) {
            const idx = keys[i];
            log.trace(
              `parameter:: index${idx}: value: ${JSON.stringify(
                params[p][idx]
              )}`
            );

            if (!isNumeric(idx)) {
              isNumericIndex = false;
              break;
            }
            qry = {};
            upd = {};

            // if there is an _id property use it as key to update
            if (params[p][idx]._id) {
              qry._id = params[p][idx]._id;
            }
            // else there is no _id property for the table
            //      try update as it is

            upd = JSON.parse(JSON.stringify(params[p][idx]));

            if (!qry._id) {
              qry.__SessionId = __SessionId;
            }

            updateParam(me, qry, upd, arr[0], user_id);
          }

          if (!isNumericIndex) {
            qry = {};
            upd = {};

            if (params[p]._id) {
              qry._id = params[p]._id;
            } else {
              qry.__SessionId = __SessionId;
            }

            upd = params[p];

            updateParam(me, qry, upd, arr[0], user_id);
          }
        } else if (!p.startsWith("http")) {
          log.trace(`param::no idx${JSON.stringify(params[p])}`);

          qry = {};
          upd = {};

          if (params[p]._id) {
            qry._id = params[p]._id;
          } else {
            qry.__SessionId = __SessionId;
          }

          upd = params[p];

          updateParam(me, qry, upd, arr[0], user_id);
        }
      }
      /* else if (!p.startsWith("http")) {
        log.trace(`** SAVE ${p} val ${params[p]}`);
        // noSQL databases can store array straight

        // updateSessionparam(
        //   me,
        //   {
        //     __SessionId,
        //     key: p,
        //   },
        //   {
        //     __SessionId,
        //     key: p,
        //     value: JSON.stringify(params[p]),
        //   }
        // );
        // updateParam(me, qrySession, updSession, "sessionparameters", user_id);
        updateParam(
          me,
          {
            __SessionId,
            key: p,
          },
          {
            __SessionId,
            key: p,
            value: JSON.stringify(params[p]),
          },
          "sessionparameters",
          user_id
        );
      }*/
      return p;
    });

    Promise.all(promises)
      .then((values) => {
        log.debug("saveParamsForValidSessionId promises success");
        log.trace(`values::${util.inspect(values)}`);

        if (callback) callback(null, params);
      })
      .catch((err) => {
        log.debug(`saveParamsForValidSessionId promise error${err}`);
        log.trace(`promise detail::${util.inspect(promises[0])}`);
        if (callback) callback(err, params);
      });
  },

  saveAutoTable: function (params, callbackSaveAutoTable) {
    var me = this;
    var __SessionId = "0";

    me.callback = callbackSaveAutoTable;

    me.connector.findSessionParam(
      me.connector,
      {
        __SessionId: params["__SessionId"],
      },
      (err, results) => {
        __SessionId = results["__SessionId"];
        if (
          err ||
          results["__SessionId"] == "" ||
          results["__SessionId"] == undefined
        ) {
          log.debug("saveAutoTable::NULL");
          me.connector.getNextSeq("__SessionId", (err, nextSeq) => {
            __SessionId = nextSeq["seq"];
            if (err) {
            } else {
              log.debug("saveAutoTable::NULL" + nextSeq["seq"]);
              params["__SessionId"] = nextSeq["seq"];
              BaseConnector.prototype.saveParamsForValidSessionId.call(
                me,
                nextSeq["seq"],
                params,
                me.callback
              );
            }
          });
        } else {
          log.debug("saveAutoTable::" + res["__SessionId"]);
          params["__SessionId"] = res["__SessionId"];
          BaseConnector.prototype.saveParamsForValidSessionId.call(
            me,
            results["__SessionId"],
            params,
            me.callback
          );
        }
      }
    );
  },

  getParameter: function (__SessionId, key, subKey, callback) {
    var query = {
      __SessionId: __SessionId,
    };
    if (key !== null && key !== "") {
      query.key = key;
    }
    if (subKey !== null && subKey !== "") {
      query.subKey = subKey;
    }

    log.debug("getParameter:" + arguments[1] + ":" + JSON.stringify(query));

    this.connector.findSessionParam(this.connector, query, function (err, res) {
      log.trace(
        "getParameter::0:" +
          key +
          ":" +
          subKey +
          ": " +
          __SessionId +
          ":err " +
          err +
          ":res " +
          JSON.stringify(res)
      );
      callback(err, res);
    });
  },

  setParameter: function (__SessionId, key, subKey, param, callback) {
    //  tableName, query, upd, isMulti, callback
    this.connector.update(
      {
        __SessionId: __SessionId,
        key: key,
        subKey: subKey,
      },
      {
        __SessionId: __SessionId,
        key: key,
        subKey: subKey,
        value: param,
      },
      function (err, res) {
        if (err) {
        }
        log.trace(
          "setParameter:" + JSON.stringify(err) + "resp:" + JSON.stringify(res)
        );
        callback(err, res);
      }
    );
  },
};

module.exports = exports = BaseConnector;
