"use strict";

var Window = require("sdk/window/utils").getMostRecentBrowserWindow("navigator:browser");
var Storage = require("../lib/storage.js");
var Preference = require("../lib/pref-utils.js");
var FileIO = require("../lib/file-io.js");
var Services = require("../lib/services.js");
var Synchronize = require("../lib/sync.js");

function getSubscription(storage, date) {
  var buffer = storage.pref.split("/");
  storage.file = FileIO.folder + "\\" + buffer[buffer.length - 1];
  FileIO.fileData(storage, getFile);
}

function getFile(storage) {
  if (storage.fetch || storage.date + 4 * 86400000 < Date.now()) {
    Synchronize.fetch(storage, readList);
  } else {
    readList(storage);
  }
}

function readList(storage) {
  FileIO.fileToStream(storage, listSplitter);
}

function listSplitter(storage) {
  storage.white = { regexp: new Array(), string: new Array() };
  storage.match = { regexp: new Array(), string: new Array() };
  try {
    var list = Window.atob(storage.buffer).split(/[\r\n]+/);
  } catch (e) {
    var list = storage.buffer.split(/[\r\n]+/);
  }

  list.forEach(function (element, index, array) {
    if (element.startsWith("@@")) {
      patternMaker(storage.white, element.substr(2));
    } else {
      patternMaker(storage.match, element);
    }
  });
}

function patternMaker(group, rule) {
  if (rule.startsWith("||")) {
    var regexp = new RegExp(rule.replace(/\./g, "\\.").replace(/\*/g, ".*").replace("^", "").replace("||", "^https?://([^\\/]+\\.)*"));
    group.regexp.push(regexp);
  } else if (rule.startsWith("|")) {
    var regexp = new RegExp(rule.replace(/\./g, "\\.").replace(/\*/g, ".*").replace("|", "^"));
    group.regexp.push(regexp);
  } else if (rule.startsWith("/") && rule.endsWith("/")) {
    var regexp = new RegExp(rule.substring(1, rule.length - 1));
    group.regexp.push(regexp);
  } else if (rule.match(/^[\w\.\/]/)) {
    if (rule.includes("*")) {
      var regexp = new RegExp(rule.replace(/\./g, "\\.").replace(/\*/g, ".*"));
      group.regexp.push(regexp);
    } else {
      group.string.push(rule);
    }
  }
}

exports.prefToServer = function (name) {
  var profile = "profile" + name.split("_")[0];
  var server = Storage[profile].server;
  server.pref = Preference.getValue(name);
  if (server.pref.match(/^(http|socks|socks4)::(\w+\.)*\w+::\d{1,5}$/i)) {
    var array = server.pref.split("::");
    server.property = Services.pps.newProxyInfo(array[0], array[1], array[2], 1, 0, null);
  } else {
    return;
  }
};
exports.prefToList = function (name) {
  var profile = "profile" + name.split("_")[0], date = name.split("_")[0] + "_date";
  var list = Storage[profile].list;
  list.pref = Preference.getValue(name);
  if (list.pref.match(/^https?:\/\/([^\/]+\/)+[^\\\?\/\*\|<>:"]+\.[a-z]+$/i)) {
    getSubscription(list, date);
  } else if (list.pref.match(/^\w:\\([^\\]+\\)*[^\\\?\/\*\|<>:"]+\.[a-z]+$/i)) {
    list.file = list.pref;
    readList(list);
  } else if (list.pref.match(/^[^\\\?\/\*\|<>:"]+\.[a-z]+$/i)) {
    list.file = FileIO.folder + "\\" + list.pref;
    readList(list);
  } else {
    return;
  }
};
exports.readList = readList;
