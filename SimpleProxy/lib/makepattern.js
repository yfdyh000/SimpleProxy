"use strict";

var {Cu} = require("chrome");
var {MatchPattern} = Cu.import("resource://gre/modules/MatchPattern.jsm", {});

exports.fromString = function (string) {
  return new MatchPattern(string);
};
