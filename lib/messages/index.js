let server_import = require("./server_messages");
let http_msgs = require("./http_messages");
let auth_msgs = require("./auth_messages");

const Messages = {
  auth_messages: auth_msgs,
  server_messages: server_import,
  http_messages: http_msgs,
  general_error: "<h3>There are some errors, please try again.</h3>",
};

module.exports = Messages;
