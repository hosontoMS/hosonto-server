"use strict";
var jwt = require("jsonwebtoken");
const util = require("util");
let { dbSecurity } = require("../../util/common.js");
let jwtVerify = util.promisify(jwt.verify);

let log, config;

/**
 * @date 2021-03-22
 * @param {object} concreteHelper
 * @param {number} accessLevel
 * @param {object} serverConfig
 * @returns {any}
 */
function AbstractAccessHelper(concreteHelper, accessLevel, serverConfig) {
  // All of the normal singleton code goes here.
  this.context = concreteHelper;
  this.accessLevel = accessLevel || dbSecurity.PUBLIC;
  config = this.config = serverConfig;
  log = this.log = require("../../log")(module, config);
}

AbstractAccessHelper.prototype = {
  getUserAccessAdvisor: function (userRow, idField, ownerField, sharedIdField) {
    let userAccessAdvisor = {};
    userAccessAdvisor.isUser = userRow && userRow[idField];
    userAccessAdvisor._shared_ids = (userRow && userRow[sharedIdField]) || null;

    userAccessAdvisor.isAdmin = (userRow && userRow.role === "admin") || false;
    userAccessAdvisor.isSuperadmin =
      (userRow && userRow.role === "superadmin") || false;

    if (userRow) {
      if (userRow[ownerField])
        userAccessAdvisor._owner_id = userRow[ownerField];
      switch (userRow.role) {
        case "admin":
          userAccessAdvisor.isAdmin = true;
          break;
        case "superadmin":
          userAccessAdvisor.isSuperadmin = true;
          break;
      }
    }
    userAccessAdvisor._owner_id = userRow[idField];
    userAccessAdvisor._shared_ids = userRow[sharedIdField];
    return userAccessAdvisor;
  },

  getPermittedFields: async function (tableName, userAdvisor) {
    return (
      this.context && this.context.getPermittedFields(tableName, userAdvisor)
    );
  },

  filterColumns: async function (
    tableName,
    results,
    userAdvisor,
    ownerField,
    sharedField,
    idFields,
    toBeHiddenFields
  ) {
    return (
      this.context &&
      this.context.filterColumns(
        tableName,
        results,
        userAdvisor,
        ownerField,
        sharedField,
        idFields,
        toBeHiddenFields
      )
    );
  },

  /**
   * @date 2021-03-22
   * @param {array[Object]} row
   * @param {any} ownerField
   * @param {any} idFields
   * @param {any} fieldsToBeHidden
   * @returns {any}
   */
  maskFields: function (row, ownerField, idFields, fieldsToBeHidden) {
    let elem = JSON.parse(JSON.stringify(row));

    log.trace("Jwt signing: " + `${ownerField} ${idFields} ${row}`);
    try {
      if (elem[ownerField]) {
        idFields.forEach((idField) => {
          if (elem[idField]) {
            let objId = {};
            objId[idField] = elem[idField];

            let jwSigned = jwt.sign(
              objId,
              config.get("jwt-secret") + String(elem[ownerField])
            );
            elem[idField] = jwSigned;
            log.trace(
              "Jwt sign 1: " +
                `${idField} ${objId[idField]} ${elem[idField]}` +
                ", for owner id: " +
                elem[ownerField]
            );
          }
        });
      } else {
        idFields.forEach((idField) => {
          if (elem[idField]) {
            let objId = {};
            objId[idField] = elem[idField];

            let jwSigned = jwt.sign(objId, config.get("jwt-secret"));
            elem[idField] = jwSigned;
            log.trace(
              "Jwt sign 2: " +
                `${idField} ${objId[idField]} ${elem[idField]}` +
                ", for owner id: " +
                elem[ownerField]
            );
          }
        });
      }
    } catch (err) {
      log.debug(
        "Jwt sign: Error occurred " +
          err +
          ", for owner id: " +
          elem[ownerField]
      );
    }
    fieldsToBeHidden.forEach((hideMe) => {
      log.trace("Hiding field:  " + hideMe + ", " + elem[hideMe]);
      delete elem[hideMe];
    });

    return elem;
  },

  decodeFields: async function (decodeElement, ownerToDecrypt, fieldsToDecode) {
    log.trace(
      `\n\nDecoding ${JSON.stringify(decodeElement)} of ${typeof decodeElement}`
    );
    if (Array.isArray(decodeElement)) {
      return decodeElement.map((elem) => {
        return this.decodeFields(elem);
      });
    } else if (typeof decodeElement === "object") {
      try {
        fieldsToDecode.forEach(async (field) => {
          if (decodeElement[field]) {
            try {
              let decoded = await jwtVerify(
                decodeElement[field],
                config.get("jwt-secret") +
                  (ownerToDecrypt ? String(ownerToDecrypt) : "")
              );

              decodeElement[field] = decoded[field];
            } catch (err) {
              log.debug("\n\nDecodeID 1: Error occurred " + err);
            }
          }
        });
        return decodeElement;
      } catch (err) {
        log.debug("\nDecodeId 2: Error occurred" + err);
      }
    }
  },
};

module.exports = exports = AbstractAccessHelper;
