"use strict";

var {Cc, Ci} = require("chrome");

exports.pps = Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(Ci.nsIProtocolProxyService);
