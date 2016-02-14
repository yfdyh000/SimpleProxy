"use strict";

var {Cu} = require("chrome");
var {TextDecoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});

exports.folder = OS.Path.join(OS.Constants.Path.profileDir, "SimpleProxy");
exports.fileData = function (storage, callback) {
  OS.File.stat(storage.file).then(
    function onSuccess(data) {
      storage.date = Date.parse(data.lastModificationDate), storage.fetch = false;
      callback(storage);
    },
    function onFailure(reason) {
      if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
        storage.fetch = true;
        callback(storage);
      }
    }
  );
};
exports.fileToStream = function (storage, callback) {
  OS.File.read(storage.file).then(
    function onSuccess(stream) {
      var decoder = new TextDecoder();
      storage.buffer = decoder.decode(stream);
      callback(storage);
    }
  );
};
exports.copyFile = function (object, target) {
  OS.File.move(object, target);
};
exports.makeFolder = function (folder) {
  OS.File.makeDir(folder);
};
exports.deleteFolder = function (folder) {
  OS.File.removeDir(folder);
};
