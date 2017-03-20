"use strict";

var Events = require("./data/events.js");
var SimpleProxy = require("./data/proxy.js");

exports.main = function (options, callbacks) {
  Events.on();
  SimpleProxy.on();
};

exports.onUnload = function (reason) {
  Events.off();
  SimpleProxy.off();
};
