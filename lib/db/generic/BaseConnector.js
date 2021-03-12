"use strict";

let util = require("util");
let commUtils = require("../../util/common.js");
let log = require("../../log")(module);

function BaseConnector(myConnector, dbHelper) {
  this.connector = myConnector;
  this.dbHelper = dbHelper;
  this.accessAdvisorCache = {};
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
    qry = await context.dbHelper.decodeFields(
      qry1,
      params["session_user"] && params["session_user"]._id,
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
        _owner_id: user_id,
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
    var promises = [];
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
          params["__Error"] = err;
          if (cback) cback({ code: 520, message: err }, params);
          log.debug("Error occurred inside getAccessAdvisor: " + err);
          return;
        }

        let userAccessAdvisor = {};

        userAccessAdvisor = await me.getAccessAdvisor(
          (params["session_user"] && params["session_user"]._id) || null
        );
        var isAppendPage = params[tableName + "__appendPage"];
        let [
          filteredFields,
          idFields,
          sharedFields,
          ownerFields,
          hiddenFields,
        ] = await me.dbHelper.getPermittedFields(tableName, {
          accessLevel: commUtils.dbSecurity.PROTECTED,
        });

        if (filteredFields) {
          log.debug(
            "Baseconnector.LoadAutotable::" +
              "filtered Fields" +
              JSON.stringify(filteredFields)
          );
          try {
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
              idFields || ["_id"],
              sharedFields || ["_shared_ids"],
              ownerFields || ["_id"],
              hiddenFields || []
            );

            log.debug(
              " Table::" +
                tableName +
                " found::" +
                foundResponse +
                " typeof ::" +
                typeof foundResponse +
                "\n filtered ::" +
                filteredResponse
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
          } catch (err) {
            log.debug(
              "\n\n *** ERROR occurred in promise::" + util.inspect(err)
            );
            params["__Error"] = err;
            if (cback) cback({ code: 520, message: err }, params);
          }
        }
      }
    }

    log.debug("\n\n *** promises success");
    if (cback) cback(null, params);
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
      } catch (err) {
        log.trace("\nloadAutoParams:: err: " + util.inspect(err));
        //   if (callback)
        //     callback({ status: 500, message: "Cannot get next SessionId" }, null);
      }
    }
    BaseConnector.prototype.loadParamsForValidSessionId.call(
      this,
      params,
      callback
    );
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

  saveAutoParams: function (params, callbackSaveAutoParams) {
    var me = this;
    var __SessionId = "0";

    me.callback = callbackSaveAutoParams;

    if (params["readOnly"] === true) {
      callbackSaveAutoParams(null, params);
      return;
    }

    me.connector.findSessionParam(
      me.connector,
      {
        __SessionId: params["__SessionId"],
      },
      ((callB, params, connector) => {
        return function (err, res) {
          __SessionId = params["__SessionId"];
          if (!__SessionId && res && res[0])
            __SessionId = res[0]["__SessionId"];

          // log.debug("\n\n\n saveAutoParams:: Found SessionId" + __SessionId);
          if (err || !__SessionId) {
            connector.getNextSeq(
              "__SessionId",
              ((callB, params) => {
                return function (err, nextSeq) {
                  if (err) {
                  } else {
                    __SessionId = nextSeq["seq"];

                    log.debug(
                      `\n\n\nsaveAutoParams:: Next SessionID ${nextSeq["seq"]}`
                    );
                    params["__SessionId"] = nextSeq["seq"];
                    BaseConnector.prototype.saveParamsForValidSessionId.call(
                      connector,
                      nextSeq["seq"],
                      params,
                      callB
                    );
                  }
                };
              })(callB, params)
            );
          } else {
            log.debug("\n\n\n saveAutoParams:: Found SessionId" + __SessionId);
            params["__SessionId"] = __SessionId;
            BaseConnector.prototype.saveParamsForValidSessionId.call(
              connector,
              __SessionId,
              params,
              callB
            );
          }
        };
      })(me.callback, params, me.connector)
    );
  },

  saveParamsForValidSessionId(__SessionId, params, callback) {
    const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n);

    let me = this;
    log.debug(
      `\n\n\n saveParamsForValidSessionId:: for SessionId : ${__SessionId}`
    );
    log.trace(` params::${util.inspect(params)}`);
    params.__SessionId = __SessionId;

    const promises = [];
    const callUpdate = (
      that,
      qryParam,
      updParam,
      table,
      majorindex,
      minorindex
    ) => {
      let context = that;
      promises.push(
        new Promise(async (resolve, reject) => {
          let qry = {};
          let upd = {};
          log.trace(
            `\n\n\n Table :: ${String(table)} Major Index :: ${String(
              majorindex
            )} Minor index:: ${String(minorindex)} Query :: ${JSON.stringify(
              qryParam
            )} Update :: ${JSON.stringify(upd)}`
          );
          if (table) {
            qry = await me.dbHelper.decodeFields(
              qryParam,
              params["session_user"] && params["session_user"]._id,
              ["_id", "_owner_id", "_shared_ids"]
            );

            log.trace("Received Qry" + JSON.stringify(qry));
            upd = updParam;
            if (upd._id) {
              updParam._id = qry._id;
            }
            // upd = await me.dbHelper.decodeIds(
            //   updParam,
            //   params["session_user"] && params["session_user"]._id
            // );
            if (upd.isDeleted) {
              context.connector.delete(table, qry, true, (err, res) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(res);
                }
              });
            } else {
              // tableName, query, update isMulti, callback
              context.connector.update(table, qry, upd, true, (err, res) => {
                log.trace(
                  "\n\nUpdate Results ::" +
                    util.inspect(qry) +
                    util.inspect(upd)
                );
                if (err) {
                  reject(err);
                } else {
                  resolve(res);
                }
              });
            }
          } else {
            log.trace(
              "\n\nUpdate else Results ::" +
                util.inspect(qryParam) +
                util.inspect(updParam)
            );
            context.connector.updateSessionparamTable(
              qryParam,
              updParam,
              (err, res) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(res);
                }
              }
            );
            // resolve([]);
          }
        })
      );
    };

    Object.keys(params).forEach((p) => {
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
        value:
          typeof params[p] === "string"
            ? params[p]
            : p.includes("http")
            ? params[p]
            : JSON.stringify(params[p]),
      };

      ((that, q, u, t, index, subindex) => {
        callUpdate(that, q, u, t, index, subindex);
      })(me, qrySession, updSession, "sessionparameters", p, null);

      if (arr.length > 1 && !arr[1]) {
        if (
          params[arr[0] + "__permission"] &&
          params[arr[0] + "__permission"] < 2
        )
          return;

        log.debug(
          `Save table:: ${
            arr[0]
          } __SessionId:: ${__SessionId} params = ${JSON.stringify(params[p])}`
        ); // qry = ${JSON.stringify(upd)}`);
        let qry;
        let upd;

        // It comes as numeric indexed object so array
        //  (Array.isArray or constructor==Array) testing does not work
        if (typeof params[p] === "object" && params[p][0]) {
          log.debug(`param::array ${JSON.stringify(params[p])}`);
          let isNumericIndex = true;

          const keys = Object.keys(params[p]);
          for (let i = 0; i < keys.length; i++) {
            const idx = keys[i];
            log.trace(`param::idx${idx} =${JSON.stringify(params[p][idx])}`);

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
              qry.__SessionId = __SessionId; // + ':' + (Math.random() * 100 + 1); }
            }

            ((that, q, u, t, index, subindex) => {
              callUpdate(that, q, u, t, index, subindex);
            })(me, qry, upd, arr[0], p, idx);
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

            ((that, q, u, t, index, subindex) => {
              callUpdate(that, q, u, t, index, subindex);
            })(me, qry, upd, arr[0], p, null);
          }
        } else if (!p.startsWith("http")) {
          log.debug(`param::no idx${JSON.stringify(params[p])}`);

          qry = {};
          upd = {};

          if (params[p]._id) {
            qry._id = params[p]._id;
          } else {
            qry.__SessionId = __SessionId;
          }

          upd = params[p];

          ((that, q, u, t, index, subindex) => {
            callUpdate(that, q, u, t, index, subindex);
          })(me, qry, upd, arr[0], p, null);
        }
      } else if (!p.startsWith("http")) {
        log.debug(`** SAVE ${p} val ${params[p]}`);
        // The following might be needed for SQL databases
        // noSQL databases can store array straight
        /* if (params[p].constructor == Array) {
         for (idx in params[p]) {
         for (q in params[p][idx]) {
         //params[p][idx][q] = res[p][idx][q];
         this.connector.update(this.connector,
         {__SessionId: __SessionId, key: p, subkey:q, rowId:idx},
          {__SessionId: __SessionId, key: p,
          subkey:q, rowId:idx,value: JSON.stringify(params[p][idx][q])});
         }
         }
         //callback(null, sessionId);
         }*/
        ((that, q, u) => {
          callUpdate(that, q, u);
        })(
          me,
          {
            __SessionId,
            key: p,
          },
          {
            __SessionId,
            key: p,
            value: JSON.stringify(params[p]),
          }
        );
      }
      return;
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
      ((callback, params, connector) => {
        return function (err, res) {
          __SessionId = res["__SessionId"];
          if (
            err ||
            res["__SessionId"] == "" ||
            res["__SessionId"] == undefined
          ) {
            log.debug("saveAutoTable::NULL");
            connector.getNextSeq(
              "__SessionId",
              ((that, callB, params) => {
                return function (err, nextSeq) {
                  __SessionId = nextSeq["seq"];
                  if (err) {
                  } else {
                    log.debug("saveAutoTable::NULL" + nextSeq["seq"]);
                    params["__SessionId"] = nextSeq["seq"];
                    BaseConnector.prototype.saveParamsForValidSessionId.call(
                      that,
                      nextSeq["seq"],
                      params,
                      callB
                    );
                  }
                };
              })(this, callback, params)
            );
          } else {
            log.debug("saveAutoTable::" + res["__SessionId"]);
            params["__SessionId"] = res["__SessionId"];
            BaseConnector.prototype.saveParamsForValidSessionId.call(
              this,
              res["__SessionId"],
              params,
              callback
            );
          }
        };
      })(me.callback, params, me.connector)
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
