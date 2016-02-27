"use strict";

var Storage = require("../lib/storage.js");
var Services = require("../lib/services.js");

var white, match, server;

var Proxy = {
  applyFilter: function (service, uri, proxy) {
    for (var i in Storage) {
      if (!(server = Storage[i].server.property) || !Storage[i].list.file) continue;

      if (white = Storage[i].list.pattern.white) {
        for (var i in white) {
          if (white[i].matches(uri)) {
            return proxy;
          }
        }
      }

      if (match = Storage[i].list.pattern.match) {
        for (var x in match) {
          if (match[x].matches(uri)) {
            return server;
          }
        }
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
