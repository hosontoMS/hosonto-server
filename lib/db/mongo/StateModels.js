"use strict";

let commUtils = require("../../util/common.js");
let mongoose = require("mongoose");

var stateModels = function () {
  var Schema = mongoose.Schema;
  var counterSchema, sessionParameterSchema, counters, sessionParameterTable;

  counterSchema = sessionParameterSchema = counters = sessionParameterTable = {};
  counterSchema = new Schema({
    _id: String,
    seq: Number,
  });
  sessionParameterSchema = new Schema({
    __SessionId: {
      type: Number,
      index: 1,
      required: true,
      security: commUtils.dbSecurity.PUBLIC,
    },
    key: {
      type: String,
      required: true,
      security: commUtils.dbSecurity.PUBLIC,
    },
    subKey: { type: String, security: commUtils.dbSecurity.PUBLIC },
    rowId: { type: Number, security: commUtils.dbSecurity.PUBLIC },
    value: { type: String, security: commUtils.dbSecurity.PUBLIC },
    time_stamp: {
      type: Date,
      default: Date.now,
      security: commUtils.dbSecurity.PROTECTED,
    },
    _owner_id: {
      type: Schema.Types.ObjectId,
      security: commUtils.dbSecurity.RESTRICTED,
    },
    _shared_ids: {
      type: [Schema.Types.ObjectId],
      security: commUtils.dbSecurity.RESTRICTED,
    },
  });
  counters =
    mongoose.models.counters || mongoose.model("counters", counterSchema);
  sessionParameterTable =
    mongoose.models.sessionparameters ||
    mongoose.model("sessionparameters", sessionParameterSchema);
  return { sessionParameterTable, counters };
};

module.exports = stateModels;
