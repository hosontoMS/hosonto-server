"use strict";

if (typeof define !== "function") {
  var define = require("amdefine")(module);
}

define(function (require, exports) {
  var uniqueInstance; // Private attribute that holds the single instance.

  function Utils() {
    // All of the normal singleton code goes here.
  }

  Utils.prototype = {
    // defined by the bit map
    // 0 - PRIVATE i.e. <= 1 means private
    // 1 - SUPER_RESTRICTED  <= 3 means SUPER user/Owner only
    // 2 - USER_ONLY <= 4 means general users allowed
    // 3 - PUBLIC < = 8 means public allowed
    apiSecurity: { PRIVATE: 1, SUPER_RESTRICTED: 2, RESTRICTED: 4, PUBLIC: 8 },
    // {'total':0, 'approve':1, 'reject':2, 'like':3, 'cool':4, 'dislike':5, 'sad': 6, 'angry':7, 'read':8, 'comment':9, 'share': 10, 'update':11, 'new':12, 'flag':13};
    dbSecurity: {
      RESTRICTED: 0, //'super admin only'
      PRIVATE: 10, //'record_creator_owner_access_only',
      ADMIN: 11, //'_creator_dbowner_access_only',
      PROTECTED: 15, //'access_with_permission_token',
      PUBLIC: 32, //'public',
    },
    ratingKeys: {
      total: 0,
      approve: 1,
      reject: 2,
      like: 3,
      cool: 4,
      dislike: 5,
      sad: 6,
      angry: 7,
      read: 8,
      comment: 9,
      share: 10,
      update: 11,
      new: 12,
      flag: 13,
    },
    ACTION_TYPE: {
      na: 0,
      signout: 1,
      signin: 2,
      beginbreak: 3,
      endbreak: 4,
    },
  };

  Utils.getInstance = function () {
    if (!uniqueInstance) {
      // Instantiate only if the instance doesn't exist.
      uniqueInstance = new Utils();
    }
    return uniqueInstance;
  };
  return Utils.getInstance();
});
