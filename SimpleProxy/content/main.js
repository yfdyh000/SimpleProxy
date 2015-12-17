'use strict';

var ChromeWindow = require('sdk/window/utils').getMostRecentBrowserWindow('navigator:browser');
var SimplePrefs = require('sdk/simple-prefs');
var Locales = require("sdk/l10n").get;
var {Cc, Ci, Cu} = require('chrome');
var {Downloads} = Cu.import('resource://gre/modules/Downloads.jsm', {});
var {TextDecoder, TextEncoder, OS} = Cu.import('resource://gre/modules/osfile.jsm', {});
var ProxyService = Cc['@mozilla.org/network/protocol-proxy-service;1'].getService(Ci.nsIProtocolProxyService);

var Directories = {
  profile: OS.Path.join(OS.Constants.Path.profileDir, 'SimpleProxy'),
  firefox: OS.Path.join(OS.Constants.Path.libDir, 'browser', 'SimpleProxy'),
  winuser: OS.Path.join(OS.Constants.Path.homeDir, 'SimpleProxy'),
  addFolder: function () {
    OS.File.makeDir(this.profile);
  },
  delFolder: function () {
    OS.File.removeDir(this.profile);
  },
};

var Profiles = new Object();

var Preferences = {
  pending: function () {
    for (var i = 0; i < 5; i ++) {
      Profiles[i] = { debug: 'inProfile' + i };

      this.manifest('proxy_' + i + '_server', Profiles[i], 'server');
      this.manifest('proxy_' + i + '_list', Profiles[i], 'list');

      this.onClick(i);
    }

    SimplePrefs.on('', Preferences.onPrefChange);
  },
  onClick: function (number) {
    SimplePrefs.on('edit_list_' + number, function () {
      Execution.editor(Profiles[number]);
    });

    SimplePrefs.on('clear_proxy_' + number, function () {
      SimplePrefs.prefs['proxy_' + number + '_server'] = '';
      SimplePrefs.prefs['proxy_' + number + '_list'] = '';
    });
  },
  onPrefChange: function (name) {
    var array = name.split('_');
    Preferences.manifest(name, Profiles[array[1]], array[2]);
  },
  manifest: function (name, profile, pref) {
    profile[pref] = SimplePrefs.prefs[name];

    if (pref == 'server') {
      Execution.proxy(profile);
    }

    if (pref == 'list') {
      Execution.predict(profile);
    }
  },
};

var Feeds = {
  analyze: function (profile) {
    OS.File.stat(profile.file).then(function onSuccess(data) {
      if (Date.parse(data.lastModificationDate) + 4 * 86400000 < Date.now()) {
        Feeds.fetch(profile);
      } else {
        Execution.scan(profile);
      }
    }, function onFailure(reason) {
      if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
        Feeds.fetch(profile);
      }
    });
  },
  fetch: function (profile, probe) {
    if (probe == undefined) probe = 0;
    if (probe > 3) return ChromeWindow.console.log(Locales('fetchFailed') + '\r\n' + Locales(profile.debug));
    probe = probe + 1;

    var temp = profile.file + '_sp';
    Downloads.fetch(profile.list, temp, {isPrivate: true}).then(function onSuccess() {
      OS.File.move(temp, profile.file);
      Execution.scan(profile);
    }, function onFailure() {
      Directories.addFolder();
      Feeds.fetch(profile, probe);
    });
  },
};

var Execution = {
  proxy: function (profile) {
    if (!profile.server) return profile.proxy = undefined;

    if (profile.server.match(/^(http|socks|socks4)::(\w+\.)*\w+::\d{1,5}$/i)) {
      var array = profile.server.split('::');
      profile.proxy = ProxyService.newProxyInfo(array[0], array[1], array[2], 1, 0, null);
    } else {
      ChromeWindow.console.log(Locales('invalidServer') + ' ' + profile.profile);
    }
  },
  predict: function (profile) {
    if (!profile.list) return profile.file = undefined;

    if (profile.list.match(/^https?:\/\/([^\/]+\/)+[^\\\?\/\*\|<>:"]+\.[a-z]+$/i)) {
      profile.file = OS.Path.join(Directories.profile, profile.list.split('/')[profile.list.split('/').length - 1]);
      profile.noedit = true;
      Feeds.analyze(profile);
    } else if (profile.list.match(/^\w:\\([^\\]+\\)*[^\\\?\/\*\|<>:"]+\.[a-z]+$/i)) {
      profile.file = profile.list;
      this.scan(profile);
    } else if (profile.list.match(/^[^\\\?\/\*\|<>:"]+\.[a-z]+@(profile|firefox|winuser)$/i)) {
      var folder = profile.list.split('@')[1];
      var listname = profile.list.split('@')[0];
      if (folder == 'profile') {
        profile.file = OS.Path.join(Directories.profile, listname);
      } else if (folder == 'firefox') {
        profile.file = OS.Path.join(Directories.firefox, listname);
      } else if (folder == 'winuser') {
        profile.file = OS.Path.join(Directories.winuser, listname);
      }
      this.scan(profile);
    } else {
      return ChromeWindow.console.log(Locales('invalidRulelist') + '\r\n' + Locales(profile.debug));
    }
  },
  scan: function (profile) {
    OS.File.read(profile.file).then(function onSuccess(array) {
      var decoder = new TextDecoder();
      var data = decoder.decode(array);
      profile.white = { regexp: new Array(), string: new Array() };
      profile.match = { regexp: new Array(), string: new Array() };

      try {
        var list = ChromeWindow.atob(data).split(/[\r\n]+/);
      } catch (e) {
        var list = data.split(/[\r\n]+/);
      }

      for (var i in list) {
        if (list[i].startsWith('@@')) {
          Execution.normalize(profile.white, list[i].substr(2))
        } else {
          Execution.normalize(profile.match, list[i])
        }
      }
    }, function onFailure(reason) {
      if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
        ChromeWindow.console.log(Locales('fileNotExsit') + '\r\n' + Locales(profile.debug));
      }
    });
  },
  normalize: function (proxy, rule) {
    if (rule.startsWith('||')) {
	  var regexp = new RegExp(rule.replace(/\./gi, '\\.').replace(/\*/gi, '.*').replace('^', '').replace('||', '^https?://([^\\/]+\\.)*'), 'i');
      proxy.regexp.push(regexp);
    } else if (rule.startsWith('|')) {
      var regexp = new RegExp(rule.replace(/\./gi, '\\.').replace(/\*/gi, '.*').replace('|', '^'), 'i');
      proxy.regexp.push(regexp);
    } else if (rule.startsWith('/')) {
      var regexp = new RegExp(rule.substring(1, rule.length - 1), 'i');
      proxy.regexp.push(regexp);
    } else if (rule.match(/^[\w\.\/]/i)) {
      if (rule.includes('*')) {
        var regexp = new RegExp(rule.replace(/\./gi, '\\.').replace(/\*/gi, '.*'), 'i');
        proxy.regexp.push(regexp);
      } else {
        proxy.string.push(rule);
      }
    } else {
      return;
    }
  },
  editor: function (profile) {
    if (profile.noedit || !profile.file) return;

    OS.File.read(profile.file).then(function onSuccess(array) {
      var decoder = new TextDecoder();
      var data = decoder.decode(array);

      var ScratchpadManager = ChromeWindow.Scratchpad.ScratchpadManager;
      ScratchpadManager.openScratchpad({
        'filename': profile.file,
        'text': data,
        'saved': true,
      }).addEventListener('click', function click(event) {
        if (event.target.id == 'sp-toolbar-save') {
          event.target.ownerDocument.defaultView.addEventListener('close', function close(event) {
            Execution.scan(profile);
          }, false);
        }
      }, false);
    }, function onFailure(reason) {
      if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
        return ChromeWindow.console.log(Locales('fileNotExsit') + '\r\n' + Locales(profile.debug));
      }
    });
  },
};

var SimpleProxy = {
  judge: function (method, rule, url) {
    if (method == 'regexp' && rule.array.test(url.spec)) {
      rule.proxy = true;
    } else if (method == 'string' && url.spec.includes(rule.array)) {
      rule.proxy = true;
    } else {
      rule.proxy = false;
    }
  },
  applyFilter: function (service, uri, proxy) {
    for (var i in Profiles) {
      if (!Profiles[i].proxy) continue;

      var white = Profiles[i].white;
      var match = Profiles[i].match;

      for (var x in white) {
        if (white[x].length == 0) continue;

        for (var r in white[x]) {
          var _rule = { array: white[x][r] };
          this.judge(x, _rule, uri);

          if (_rule.proxy) {
            return proxy;
          }
        }
      }

      for (var y in match) {
        if (match[y].length == 0) continue;

        for (var s in match[y]) {
          var rule = { array: match[y][s] };
          this.judge(y, rule, uri);

          if (rule.proxy) {
            return Profiles[i].proxy;
          }
        }
      }
    }
    return proxy;
  },
}

exports.main = function (options, callbacks) {
  SimplePrefs.prefs['description'] = Locales('Simple Proxy');
  Preferences.pending();
  ProxyService.registerFilter(SimpleProxy, 3);
};

exports.onUnload = function (reason) {
  ProxyService.unregisterFilter(SimpleProxy);
};
