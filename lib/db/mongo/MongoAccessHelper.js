const AbstractAccessHelper = require("../security/AbstractAccessHelper");
const Intrface = require("../../util/Intrface");
let { dbSecurity } = require("../../util/common.js");
let log = require("../../log/")(module);
let mongoose = require("mongoose");

/**
 * @param {object} advisorRole
 * @param {object} config
 * @returns {none}
 */
var MongoAccessHelper = function (advisorRole, config) {
  AbstractAccessHelper.apply(this, [this, advisorRole, config]);
  /**
   *
   * @param {string} tableName
   * @param {Object} userAdvisor object specifying security parameters
   * @returns {Array} Array of {fields Object} that are infact not permitted for the user,
   */
  this.getPermittedFields = async function (tableName, userAdvisor) {
    tblSchema = mongoose.model(tableName).schema;
    let fields = {},
      accessLevel = userAdvisor.accessLevel || this.accessLevel;
    let idFields = [],
      sharedFields = [],
      ownerFields = [],
      hiddenFields = [];
    Object.keys(tblSchema.paths).forEach((p) => {
      // log.debug("\n COL." + p + "SEC" + tblSchema.paths[p].options.security);
      if (tblSchema.paths[p].options) {
        if (
          (tblSchema.paths[p].options.security !== null ||
            tblSchema.paths[p].options.security !== undefined) &&
          tblSchema.paths[p].options.security < dbSecurity.PUBLIC
        ) {
          switch (tblSchema.paths[p].options.security) {
            case dbSecurity.RESTRICTED:
              if (!userAdvisor.isSuperadmin) fields[p] = 0;
              break;
            case dbSecurity.ADMIN:
              if (!userAdvisor.isAdmin) fields[p] = 0;
              break;
            case dbSecurity.PRIVATE:
            case dbSecurity.PROTECTED:
            case dbSecurity.PUBLIC:
              break; // to be included in results for finally filter Columns based on row specific outcomes
            default:
              // nothing specified, default block the field
              fields[p] = 0;
          }
        }
        if (tblSchema.paths[p].options.isIdField) {
          idFields.push(p);
        }
        if (tblSchema.paths[p].options.isSharedField) {
          sharedFields.push(p);
        }
        if (tblSchema.paths[p].options.isOwnerField) {
          ownerFields.push(p);
        }
        if (tblSchema.paths[p].options.isHiddenField) {
          hiddenFields.push(p);
        }
      }
      return;
    });

    return [fields, idFields, sharedFields, ownerFields, hiddenFields];
  };

  /**
   *
   * @param {string} tableName
   * @param {Object[]} rows - the actual data
   * @param {Object} userAdvisor - the security advisor object
   * @param {string} ownerField - the name of the owner field in the rows
   * @param {string} sharedField - the name of the sharedField in the rows (for PROTECTED identification)
   * @param {String[]} idFields - the name of the Id fields that will be masked
   * @param {String[]} toBeHiddenFields - Fields that will be removed from clients
   */
  this.filterColumns = async function (
    tableName,
    rows,
    userAdvisor,
    ownerField,
    sharedField,
    idFields,
    toBeHiddenFields
  ) {
    tblSchema = mongoose.model(tableName).schema;
    let response = rows;
    accessLevel = userAdvisor.accessLevel || this.accessLevel;
    Object.keys(tblSchema.paths).forEach((p) => {
      if (
        tblSchema.paths[p].options &&
        tblSchema.paths[p].options.security &&
        tblSchema.paths[p].options.security < dbSecurity.PUBLIC
      ) {
        //   fields[p] = 1;
        // no need to include, unless excluded it will be projected
        switch (tblSchema.paths[p].options.security) {
          case dbSecurity.PRIVATE:
            // row level security owner is the user

            response = response.map((elem) => {
              elem = JSON.parse(JSON.stringify(elem));

              if (elem[p] && elem[ownerField] != userAdvisor._owner_id) {
                log.debug(
                  "\n\n\nRemoving private col. " +
                    p +
                    " from " +
                    elem +
                    ", with col. value " +
                    elem[p] +
                    ", having owner: " +
                    elem[ownerField] +
                    ", for requested owner " +
                    userAdvisor._owner_id
                );
                delete elem[p];
              }
              return elem;
            });
            break;
          case dbSecurity.PROTECTED:
            response = response.map((elem) => {
              elem = JSON.parse(JSON.stringify(elem));

              if (
                elem[p] &&
                elem[ownerField] != userAdvisor._owner_id &&
                !(
                  elem[sharedField] &&
                  elem[sharedField].some((val) => userAdvisor._owner_id === val)
                )
              ) {
                log.debug(
                  "\nRemoving protected col. " +
                    p +
                    " from " +
                    elem +
                    " with col. value " +
                    elem[p]
                );
                delete elem[p];
              }
              return elem;
            });
            break;
        }
      }
      // no need to force exclude, controlled by the access row iDs
    });

    // remove the to be hidden fields
    return response.map((elem) =>
      this.maskFields(elem, ownerField, idFields, toBeHiddenFields)
    );
  };
};
Intrface.Extend(MongoAccessHelper, AbstractAccessHelper);

exports.MongoAccessHelper = MongoAccessHelper;
