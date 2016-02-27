"use strict";

var Storage = require("../lib/storage.js");
var Services = require("../lib/services.js");

var white, match;

var Proxy = {
  applyFilter: function (service, uri, proxy) {
    for (var i in Storage) {
      if (!Storage[i].server.property || !Storage[i].list.file) continue;

      if (white = Storage[i].list.pattern.white) {
        white.forEach(function (element, index, array) {
          if (element.matches(uri)) {
            return proxy;
          }
        });
      }

      if (match = Storage[i].list.pattern.match) {
        match.forEach(function (element, index, array) {
          if (element.matches(uri)) {
            return server;
          }
        });
      }
    }
    return proxy;
  }
}

exports.addListener = function () {
  Services.pps.registerFilter(Proxy, 3);
};
exports.removeListener = function () {
  Services.pps.unregisterFilter(Proxy);
};
