"use strict";

var Storage = require("../lib/storage.js");
var Services = require("../lib/services.js");

var server;

var Proxy = {
  applyFilter: function (service, uri, proxy) {
    for (var i in Storage) {
      if (!(server = Storage[i].server.property) || !Storage[i].list.file) continue;

      var white = Storage[i].list.white;
      var match = Storage[i].list.match;

      for (var x in white) {
        if (white[x].length == 0) continue;

        for (var r in white[x]) {
          var _rule = white[x][r];

          if (Proxy.isMatched(x, _rule, uri)) {
            return proxy;
          }
        }
      }

      for (var y in match) {
        if (match[y].length == 0) continue;

        for (var s in match[y]) {
          var rule = match[y][s];

          if (Proxy.isMatched(y, rule, uri)) {
            return server;
          }
        }
      }
    }
    return proxy;
  },
  isMatched: function (method, rule, uri) {
    if (method == 'regexp' && rule.test(uri.spec)) {
      return true;
    } else if (method == 'string' && uri.spec.includes(rule)) {
      return true;
    }
  }
}

exports.on = function () {
  Services.pps.registerFilter(Proxy, 3);
};
exports.off = function () {
  Services.pps.unregisterFilter(Proxy);
};
