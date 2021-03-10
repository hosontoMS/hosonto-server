let mongoose = require("mongoose");
let { dbSecurity } = require("../../../lib/util/common.js");

function TestModel(mongoose) {
  Schema = mongoose.Schema;
  var UserSchema = new Schema();
  UserSchema.add({
    __SessionId: String,
    username: {
      type: String, // actually email of the user
      security: dbSecurity.PRIVATE,
    },
    firstname: {
      type: String,
      security: dbSecurity.PUBLIC,
    },
    lastname: {
      type: String,
      security: dbSecurity.PUBLIC,
    },
    password: {
      type: String,
      required: true,
      security: dbSecurity.PRIVATE,
    },

    about: { type: String, security: dbSecurity.PROTECTED },
    dt_joined: {
      type: Date,
      default: Date.now,
      security: dbSecurity.PUBLIC,
    },
    avatar: { type: String, security: dbSecurity.PUBLIC },
    role: { type: String, security: dbSecurity.RESTRICTED },
    status: {
      type: String, // temporary, emailverified, emailphoneverified, paymentverified,
      security: dbSecurity.ADMIN,
    },
    _owner_id: Schema.Types.ObjectId,
    _shared_ids: [Schema.Types.ObjectId],
    _shared_roles: [Schema.Types.ObjectId],
  });
  mongoose.model("sys_users", UserSchema);

  return this;
}

module.exports = TestModel;
