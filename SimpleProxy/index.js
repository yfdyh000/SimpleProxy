"use strict";

var Events = require("./data/events.js");
var SimpleProxy = require("./data/proxy.js");

exports.main = function (options, callbacks) {
  Events.startup();
  SimpleProxy.addListener();
};

exports.onUnload = function (reason) {
  Events.shutdown();
  SimpleProxy.removeListener();
};
