"use strict";

var Storage = require("../lib/storage.js");
var Services = require("../lib/services.js");

var Proxy = {
  applyFilter: function (service, uri, proxy) {
    for (var i in Storage) {
      if (!Storage[i].server.property || !Storage[i].list.file) continue;

      var white = Storage[i].list.pattern.white;
      var match = Storage[i].list.pattern.match;

      if (white.length > 0) {
        white.forEach(function (element, index, array) {
          if (element.matches(uri)) {
            return proxy;
          }
        });
      }

      if (match.length > 0) {
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
