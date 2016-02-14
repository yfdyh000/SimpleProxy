"use strict";

var SimplePrefs = require("sdk/simple-prefs");

exports.getValue = function (name) {
  return SimplePrefs.prefs[name];
};
exports.setValue = function (name, value) {
  SimplePrefs.prefs[name] = value;
};
exports.addListener = function (name, callback) {
  SimplePrefs.on(name, callback);
};
exports.removeListener = function (name, callback) {
  SimplePrefs.off(name, callback);
};
