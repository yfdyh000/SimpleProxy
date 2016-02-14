"use strict";

var FileIO = require("./file-io.js");
var {Cu} = require("chrome");
var {Downloads} = Cu.import("resource://gre/modules/Downloads.jsm", {});

function fetch(storage, callback, probe) {
  probe = probe || 0;
  if (probe > 3) return;
  probe ++;

  probe ++;
  var temp = storage.file + "_sotemp";
  Downloads.fetch(storage.pref, temp, {isPrivate: true}).then(
    function onSuccess() {
      FileIO.copyFile(temp, storage.file);
      callback(storage);
    },
    function onFailure() {
      FileIO.makeFolder(FileIO.folder);
      fetch(storage, callback, probe);
    }
  );
}

exports.fetch = fetch;
