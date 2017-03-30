"use strict";

var Cc = Components.classes, Ci = Components.interfaces, Cu = Components.utils, Cr = Components.results;
var {TextDecoder, OS} = Cu.import("resource://gre/modules/osfile.jsm", {});
var {Downloads} = Cu.import("resource://gre/modules/Downloads.jsm", {});

var Storage;

var Services = {
  obs: Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
  pps: Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(Ci.nsIProtocolProxyService),
  prefs: Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch),
  wm: Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator)
};

var FileIO = {
  folder: OS.Path.join(OS.Constants.Path.profileDir, "SimpleProxy"),
  joinPath: function (base, addon) {
    return OS.Path.join(base, addon);
  },
  makeFolder: function (path) {
    OS.File.makeDir(path);
  },
  moveFile: function (object, target) {
    OS.File.move(object, target);
  },
  pathFileName: function (path) {
    var data = OS.Path.split(Storage[i].list).components;
    return data[data.length - 1];
  },
  uriFileName: function (uri) {
    var data = uri.split("/");
    return data[data.length - 1];
  },
  fileInfo: function (storage, callback) {
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
  },
  loadFromFile: function (storage, callback) {
    OS.File.read(storage.file).then(
      function onSuccess(stream) {
        var decoder = new TextDecoder();
        storage.buffer = decoder.decode(stream);
        callback(storage);
      }
    );
  },
  saveToFile: function (file, stream) {
    OS.File.writeAtomic(file, stream, {encoding: "utf-8"}).then(
      function onSuccess() {
        var nsIFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        nsIFile.initWithPath(file);
        nsIFile.reveal();
      }
    );
  }
};

var Preferences = {
  prefs: Services.prefs.getBranch("extensions.simpleproxy."),
  option: [],
  observe: function (subject, topic, data) {
    if (topic == "nsPref:changed") {
      Preferences.option.forEach(function (element, index, array) {
        element();
      });
    }
  },
  getValue: function (branch) {
    if (branch.type == "boolean") {
      return Preferences.prefs.getBoolPref(branch.name);
    } else if (branch.type == "integer") {
      return Preferences.prefs.getIntPref(branch.name);
    } else if (branch.type == "string") {
      return Preferences.prefs.getComplexValue(branch.name, Ci.nsISupportsString).data;
    }
  },
  setValue: function (branch, value) {
    if (branch.type == "boolean") {
      Preferences.prefs.setBoolPref(branch.name, value);
    } else if (branch.type == "integer") {
      Preferences.prefs.setIntPref(branch.name, value);
    } else if (branch.type == "string") {
      var character = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
      character.data = value;
      Preferences.prefs.setComplexValue(branch.name, Ci.nsISupportsString, character);
    }
  },
  resetValue: function (branch) {
    Preferences.setValue(branch, branch.value);
  },
  on: function (data, branch) {
    Preferences.option.push(branch);
    Preferences.prefs.addObserver(data, Preferences, false);
  },
  off: function (data, branch) {
    Preferences.option = [];
    Preferences.prefs.removeObserver(data, Preferences);
  }
};

var Pattern = {
  encode: function (string) {
    if (string.startsWith("||")) {
      var pattern = string.replace(/\./g, "\\.").replace(/\*/g, ".*").replace("^", "$").replace("||", "^https?://([^\\/^\\.]+\\.)*");
    } else if (string.startsWith("|")) {
      var pattern = string.replace(/\./g, "\\.").replace(/\*/g, ".*").replace("^", "$").replace("|", "^");
    } else if (string.startsWith("/") && string.endsWith("/")) {
      var pattern = string.substring(1, string.length - 1);
    } else {
      var pattern = string.replace(/\./g, "\\.").replace(/\*/g, ".*").replace("^", "$");
    }
    return new RegExp(pattern);
  }
};

var Synchronize = {
  fetch: function (storage, callback, probe) {
    probe = probe || 0;
    if (probe > 3) return;
    probe ++;

    probe ++;
    var temp = storage.file + "_sp";
    Downloads.fetch(storage.list, temp, {isPrivate: true}).then(
      function onSuccess() {
        FileIO.moveFile(temp, storage.file);
        callback(storage);
      },
      function onFailure() {
        Synchronize.fetch(storage, callback, probe);
      }
    );
  }
};

var Core = {
  subscription: function (storage) {
    if (storage.fetch || storage.date + 4 * 86400000 < Date.now()) {
      Synchronize.fetch(storage, Core.listData);
    } else {
      Core.listData(storage);
    }
  },
  listData: function (storage) {
    FileIO.loadFromFile(storage, Core.listArray);
  },
  listArray: function (storage) {
    storage.white = [], storage.match = [];

    try {
      var window = Services.wm.getMostRecentWindow("navigator:browser");
      var list = window.atob(storage.buffer).split(/[\r\n]+/);
    } catch (e) {
      var list = storage.buffer.split(/[\r\n]+/);
    }

    list.forEach(function (element, index, array) {
      if (element.startsWith("!") || element.startsWith("[") || element == "") return;
      if (element.startsWith("@@")) {
        storage.white.push(Pattern.encode(element.substr(2)));
      } else {
        storage.match.push(Pattern.encode(element));
      }
    });
  }
};

var Events = {
  pendingOption: function () {
    Storage = [];
    try {
      Preferences.getValue( { name: "number", type: "integer" } );
    } catch (e) {
      Preferences.resetValue( { name: "number", type: "integer", value: 1 } );
    } finally {
      var num = Preferences.getValue( { name: "number", type: "integer" } );
      if (num > 9) {
        num = 9;
        Preferences.setValue( { name: "number", type: "integer" } , 9);
      } else if (num < 1) {
        num = 1;
        Preferences.setValue( { name: "number", type: "integer" } , 1);
      }
    }
    for (var i = 0; i < num; i ++) {
      try {
        Preferences.getValue( { name: "list." + i, type: "string" } );
        Preferences.getValue( { name: "server." + i, type: "string" } );
      } catch (e) {
        Preferences.resetValue( { name: "list." + i, type: "string", value: "" } );
        Preferences.resetValue( { name: "server." + i, type: "string", value: "" } );
      } finally {
        Storage[i]= { list: Preferences.getValue( { name: "list." + i, type: "string" } ), server: Preferences.getValue( { name: "server." + i, type: "string" } ) };
        Events.pendingData(Storage[i]);
      }
    }
    Events.pendingAddon();
  },
  pendingData: function (storage) {
    Events.getServer(storage);
    Events.getPattern(storage);
  },
  pendingAddon: function () {
    FileIO.makeFolder(FileIO.folder);
  },
  getServer: function (storage) {
    if (storage.server.match(/^(http|socks|socks4)::(\w+\.)*\w+::\d{1,5}$/i)) {
      var array = storage.server.split("::");
      storage.host = array[1] + ":" + array[2];
      storage.proxy = Services.pps.newProxyInfo(array[0], array[1], array[2], 1, 0, null);
    } else {
      return;
    }
  },
  getPattern: function (storage) {
    if (storage.list.match(/^https?:\/\/([^\/]+\/)+[^\\\?\/\*\|<>:"]+\.(txt|ini)$/i)) {
      storage.file = FileIO.joinPath(FileIO.folder, FileIO.uriFileName(storage.list));
      FileIO.fileInfo(storage, Core.subscription);
    } else if (storage.list.match(/^\w:\\([^\\]+\\)*[^\\\?\/\*\|<>:"]+\.(txt|ini)$/i)) {
      storage.file = storage.list;
      Core.listData(storage);
    } else if (storage.list.match(/^[^\\\?\/\*\|<>:"]+\.(txt|ini)$/i)) {
      storage.file = FileIO.joinPath(FileIO.folder, storage.list);
      Core.listData(storage);
    } else {
      return;
    }
  },
  on: function () {
    Events.pendingOption();
    Preferences.on("", Events.pendingOption);
  },
  off: function () {
    Preferences.off("", Events.pendingOption);
  }
};

var Proxy = {
  applyFilter: function (service, uri, proxy) {
    for (var i in Storage) {
      if (Storage[i].proxy == undefined || Storage[i].file == undefined) continue;

      var white = Storage[i].white, match = Storage[i].match, server = Storage[i].proxy;

      if (white != undefined) {
        for (var x in white) {
          var rule = white[x];
          if (rule.test(uri.spec)) {
            return proxy;
          }
        }
      }

      if (match != undefined) {
        for (var y in match) {
          var _rule = match[y];
          if (_rule.test(uri.spec)) {
            return server;
          }
        }
      }
    }

    return proxy;
  },
  on: function () {
    Services.pps.registerFilter(Proxy, 3);
  },
  off: function () {
    Services.pps.unregisterFilter(Proxy);
  }
};

function FindProxyForURL(url, host) {
  if (host == '127.0.0.1' || host == 'localhost') return 'DIRECT';
  for (var i in ProxyRule) {
    var white = ProxyRule[i].white, match = ProxyRule[i].match, proxy = ProxyRule[i].proxy;
    if (proxy == undefined) continue;
    if (white != undefined) {
      for (var x in white) {
        var rule = white[x];
        if (rule.test(url)) {
          return 'DIRECT';
        }
      }
    }
    if (match != undefined) {
      for (var y in match) {
        var _rule = match[y];
        if (_rule.test(url)) {
          return proxy;
        }
      }
    }
  }
  return 'DIRECT';
}
var PAC = {
  generate: function () {
    var content = "", num = Preferences.getValue( { name: "number", type: "integer" } ) - 1;

    for (var i in Storage) {
      var match = Storage[i].match, white = Storage[i].white, host = Storage[i].host;

      if (match != undefined) {
        var _match = "    match: [\r\n      " + match.toString().replace(/\,/g, ",\r\n      ") + "\r\n    ],"
      } else {
        var _match = "    match: undefined,";
      }

      if (white != undefined) {
        var _white = "    white: [\r\n      " + white.toString().replace(/\,/g, ",\r\n      ") + "\r\n    ],"
      } else {
        var _white = "    white: undefined,";
      }

      if (host != undefined) {
        var _host = "    proxy: 'PROXY " + host + "'";
      } else {
        var _host = "    proxy: undefined";
      }

      if (i < num) {
        var comma = ",";
      } else {
        var comma = "";
      }

      content = content + "  " + i + ": {\r\n" + _white + "\r\n" + _match + "\r\n" + _host + "\r\n  }" + comma + "\r\n";
    }

    return "var ProxyRule = {\r\n" + content + "}\r\n" + FindProxyForURL.toString();
  }
};

var Editor = {
  open: function (storage) {
    if (!storage.file) return;
    var window = Services.wm.getMostRecentWindow("navigator:browser");
    var ScratchpadManager = window.Scratchpad.ScratchpadManager;

    ScratchpadManager.openScratchpad({
      "filename": storage.file,
      "text": storage.buffer,
      "saved": true
    }).addEventListener(
      "click",
      function (event) {
        if (event.target.id == "sp-toolbar-save") {
          Core.listData(storage);
        }
      },
      false
    );
  }
};

var Worker = {
  reset: function (event) {
    var id = event.target.id;
    var i = id.split("."), i = i[1];
    Preferences.resetValue( { name: "list." + i, type: "string", value: "" } );
    Preferences.resetValue( { name: "server." + i, type: "string", value: "" } );
  },
  editor: function (event) {
    var id = event.target.id;
    var i = id.split("."), i = i[1];
    Editor.open(Storage[i]);
  },
  pac: function () {
    var file = FileIO.joinPath(FileIO.folder, "SimpleProxy.pac"), buffer = PAC.generate();
    FileIO.saveToFile(file, buffer);
  }
};

var Configuration = {
  observe: function (subject, topic, data) {
    var document = subject.QueryInterface(Ci.nsIDOMDocument);

    if (topic == "addon-options-displayed" && data == "simpleproxy@jc3213.github") {
      Configuration.enable(document);
    } else {
      Configuration.disable(document);
    }
  },
  enable: function (document) {
    document.getElementById("simpleproxy-pac").addEventListener("command", Worker["pac"]);
    var num = Preferences.getValue( { name: "number", type: "integer" } );
    for (var i = 0; i < 9; i ++) {
      document.getElementById("simpleproxy-reset." + i).addEventListener("command", Worker["reset"]);
      document.getElementById("simpleproxy-editor." + i).addEventListener("command", Worker["editor"]);
      if (i < num) {
        document.getElementById("simpleproxy-list_" + i).removeAttribute("disabled");
        document.getElementById("simpleproxy-list." + i).removeAttribute("disabled");
        document.getElementById("simpleproxy-editor." + i).removeAttribute("disabled");
        document.getElementById("simpleproxy-server." + i).removeAttribute("disabled");
        document.getElementById("simpleproxy-reset." + i).removeAttribute("disabled");
      } else {
        document.getElementById("simpleproxy-list_" + i).setAttribute("disabled", true);
        document.getElementById("simpleproxy-list." + i).setAttribute("disabled", true);
        document.getElementById("simpleproxy-editor." + i).setAttribute("disabled", true);
        document.getElementById("simpleproxy-server." + i).setAttribute("disabled", true);
        document.getElementById("simpleproxy-reset." + i).setAttribute("disabled", true);
      }
    }
  },
  disable: function (document) {
    document.getElementById("simpleproxy-pac").removeEventListener("command", Worker["pac"]);
    for (var i = 0; i < 9; i ++) {
      document.getElementById("simpleproxy-clear." + i).removeEventListener("command", Worker["clear"]);
      document.getElementById("simpleproxy-editor." + i).removeEventListener("command", Worker["editor"]);
    }
  },
  on: function () {
    Services.obs.addObserver(Configuration, "addon-options-displayed", false);
  },
  off: function () {
    Services.obs.removeObserver(Configuration, "addon-options-displayed", false);
  }
};

function startup(data, reason) {
  Events.on();
  Proxy.on();
  Configuration.on();
}

function shutdown(data, reason) {
  Events.off();
  Proxy.off();
  Configuration.off();
}

function install(data, reason) {
}

function uninstall(data, reason) {
}
