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

let jwtSign = (element, idField, secretKey) => {
  if (element[idField]) {
    let objId = {};
    objId[idField] = element[idField];

    let jwSigned = jwt.sign(objId, secretKey);
    element[idField] = jwSigned;
    log.trace(
      "Jwt signing 1: " +
        `${idField} ${objId[idField]} ${element[idField]} ${secretKey}`
    );
  }
  return;
};

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
   * @param {any} owner
   * @param {any} idFields
   * @param {any} fieldsToBeHidden
   * @returns {any}
   */
  maskFields: function (row, owner, idFields, fieldsToBeHidden) {
    let elem = JSON.parse(JSON.stringify(row));

    log.trace("Jwt signing: " + `${owner} ${idFields} ${JSON.stringify(row)}`);
    try {
      if (owner) {
        idFields.forEach((idField) => {
          jwtSign(elem, idField, config.get("jwt-secret") + String(owner));
        });
      } else {
        idFields.forEach((idField) => {
          jwtSign(elem, idField, config.get("jwt-secret"));
        });
      }
    } catch (err) {
      log.debug("Jwt sign: Error occurred " + err + ", for owner id: " + owner);
    }
    fieldsToBeHidden.forEach((hideMe) => {
      log.trace("Hiding field:  " + hideMe + ", " + elem[hideMe]);
      delete elem[hideMe];
    });

    return elem;
  },

  unmaskFields: async function (maskedElement, unmaskForUser, fieldsToUnmask) {
    if (Array.isArray(maskedElement)) {
      return maskedElement.map((elem) => {
        return this.unmaskFields(elem, unmaskForUser, fieldsToUnmask);
      });
    } else if (typeof maskedElement === "object") {
      log.trace(
        `\n\nUnmasking ${JSON.stringify(
          maskedElement
        )} for ${unmaskForUser} fields ${fieldsToUnmask}`
      );
      try {
        fieldsToUnmask.forEach(async (field) => {
          if (maskedElement[field]) {
            try {
              let unmasked = await jwtVerify(
                maskedElement[field],
                config.get("jwt-secret") +
                  (unmaskForUser ? String(unmaskForUser) : "")
              );

              maskedElement[field] = unmasked[field];
              log.trace(`\n\nUnmasked: input: ${maskedElement[field]}  `);
            } catch (err) {
              log.debug(
                `\n\nUnmask 1: input: ${maskedElement[field]} Error occurred ` +
                  err
              );

              maskedElement[field] = null;
            }
          }
        });
        return maskedElement;
      } catch (err) {
        log.debug(
          `\nUnmask 3: input: ${maskedElement[field]} Error occurred` + err
        );
        maskedElement = null;
      }
    }
    return maskedElement;
  },
};

module.exports = exports = AbstractAccessHelper;
