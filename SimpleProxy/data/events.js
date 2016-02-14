"use strict";

var Storage = require("../lib/storage.js");
var Preference = require("../lib/pref-utils.js");
var Services = require("../lib/services.js");
var Worker = require("./worker.js");
var Window = require("sdk/window/utils").getMostRecentBrowserWindow("navigator:browser");

var prefOption = [
  ["0_list", "0_server", "0_edit", "0_clear"],
  ["1_list", "1_server", "1_edit", "1_clear"],
  ["2_list", "2_server", "2_edit", "2_clear"]
];

function spawnEditor(storage) {
  if (!storage.list.file) return;

  var ScratchpadManager = Window.Scratchpad.ScratchpadManager;
  ScratchpadManager.openScratchpad({
    "filename": storage.list.file,
    "text": storage.list.buffer,
    "saved": true
  }).addEventListener(
    "click",
    function (event) {
      if (event.target.id == "sp-toolbar-save") {
        event.target.ownerDocument.defaultView.addEventListener(
         "close",
          function (event) {
            Worker.readList(storage.list);
          },
          false
        );
      }
    },
    false
  );
}

function manageListener(method, name, number) {
  if (method = "add") {
    if (name.includes("clear")) {
      Preference.addListener(name, function () {
        Preference.setValue(number + "_list", "");
        Preference.setValue(number + "_server", "");
      });
    } else if (name.includes("edit")) {
      Preference.addListener(name, function () {
        var storage = Storage["profile" + number];
        spawnEditor(storage);
      });
    }
  } else {
    if (name.includes("clear")) {
      Preference.removeListener(name, function () {
        Preference.setValue(number + "_list", "");
        Preference.setValue(number + "_server", "");
      });
    } else if (name.includes("edit")) {
      Preference.removeListener(name, function () {
        var storage = Storage["profile" + number];
        spawnEditor(storage);
      });
    }
  }
}

function pending(name) {
  if (name.includes("list")) {
    Worker.prefToList(name);
  } else if (name.includes("server")) {
    Worker.prefToServer(name);
  }
}

exports.startup = function () {
  prefOption.forEach(function (element, index, array) {
    var list = element[0], server = element[1], edit = element[2], clear = element[3];
    Worker.prefToList(list);
    Worker.prefToServer(server);
    manageListener("add", edit, index);
    manageListener("add", clear, index);
  });
  Preference.addListener("", pending);
};
exports.shutdown = function () {
  prefOption.forEach(function (element, index, array) {
    var edit = element[2], clear = element[3];
    manageListener("remove", edit, index);
    manageListener("remove", clear, index);
  });
  Preference.removeListener("", pending);
}
