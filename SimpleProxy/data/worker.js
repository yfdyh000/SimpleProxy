"use strict";

var Window = require("sdk/window/utils").getMostRecentBrowserWindow("navigator:browser");
var Storage = require("../lib/storage.js");
var Preference = require("../lib/pref-utils.js");
var FileIO = require("../lib/file-io.js");
var Pattern = require("../lib/makepattern.js");
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
  FileIO.fileToStream(storage, listToPattern);
}

function listToPattern(storage) {
  storage.pattern = {white: new Array(), match: new Array()};
  try {
    var list = Window.atob(storage.buffer).split(/[\r\n]+/);
  } catch (e) {
    var list = storage.buffer.split(/[\r\n]+/);
  }

  list.forEach(function (element, index, array) {
    if (element.startsWith("#!")) {
      var pattern = Pattern.fromString(element.substr(2));
      storage.pattern.white.push(pattern);
    } else if (element.startsWith("#")) {
      var pattern = Pattern.fromString(element.substr(1));
      storage.pattern.match.push(pattern);
    }
  });
}

exports.prefToServer = function (name) {
  var profile = "profile" + name.split("_")[0];
  var server = Storage[profile].server;
  server.pref = Preference.getValue(name);
  if (server.pref.match(/^(http|socks|socks4)::(\w+\.)*\w+::\d{1,5}$/i)) {
    var array = server.pref.split("::");
    server.property =Services.pps.newProxyInfo(array[0], array[1], array[2], 1, 0, null);
  } else {
    return;
  }
};
exports.prefToList = function (name) {
  var profile = "profile" + name.split("_")[0], date = name.split("_")[0] + '_date';
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
