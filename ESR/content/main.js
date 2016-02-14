'use strict';

var ChromeWindow = require('sdk/window/utils').getMostRecentBrowserWindow('navigator:browser');
var SimplePrefs = require('sdk/simple-prefs');
var Locales = require('sdk/l10n').get;
var {Cc, Ci, Cu} = require('chrome');
var {Downloads} = Cu.import('resource://gre/modules/Downloads.jsm', {});
var {TextDecoder, TextEncoder, OS} = Cu.import('resource://gre/modules/osfile.jsm', {});
var ProxyService = Cc['@mozilla.org/network/protocol-proxy-service;1'].getService(Ci.nsIProtocolProxyService);

var Directories = {
  profile: OS.Path.join(OS.Constants.Path.profileDir, 'SimpleProxy'),
  addFolder: function () {
    OS.File.makeDir(this.profile);
  }
};

var Profiles = new Object();

var Preferences = {
  pending: function () {
    for (var i = 0; i < 3; i ++) {
      Profiles[i] = { debug: 'inProfile' + i };

      this.manifest('proxy_' + i + '_server', Profiles[i], 'server');
      this.manifest('proxy_' + i + '_list', Profiles[i], 'list');

      this.onClick(i);
    }

    SimplePrefs.on('', function (name) {
      var number = name.split('_')[1];
      var pref = name.split('_')[2];
      Preferences.manifest(name, Profiles[number], pref);
    });
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
  manifest: function (name, profile, pref) {
    profile[pref] = SimplePrefs.prefs[name];

    if (pref == 'server') {
      Execution.server(profile);
    }

    if (pref == 'list') {
      Execution.predict(profile);
    }
  }
};

var Feeds = {
  analyze: function (profile) {
    OS.File.stat(profile.file).then(
      function onSuccess(data) {
        if (Date.parse(data.lastModificationDate) + 4 * 86400000 < Date.now()) {
          Feeds.fetch(profile);
        } else {
          Execution.scan(profile);
        }
      },
      function onFailure(reason) {
        if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
          Feeds.fetch(profile);
        }
      }
    );
  },
  fetch: function (profile, probe) {
    if (probe == undefined) probe = 0;
    if (probe > 3) return ChromeWindow.console.log(Locales('fetchFailed') + '\r\n' + Locales(profile.debug));

    probe ++;
    var temp = profile.file + '_sp';
    Downloads.fetch(profile.list, temp, {isPrivate: true}).then(
      function onSuccess() {
        OS.File.move(temp, profile.file);
        Execution.scan(profile);
      },
      function onFailure() {
        Directories.addFolder();
        Feeds.fetch(profile, probe);
      }
    );
  }
};

var Execution = {
  server: function (profile) {
    if (!profile.server) return profile.server = undefined;

    if (profile.server.match(/^(http|socks|socks4)::(\w+\.)*\w+::\d{1,5}$/i)) {
      var array = profile.server.split('::');
      profile.server = ProxyService.newProxyInfo(array[0], array[1], array[2], 1, 0, null);
    } else {
      ChromeWindow.console.log(Locales('invalidServer') + '\r\n' + Locales(profile.debug));
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
    } else if (profile.list.match(/^[^\\\?\/\*\|<>:"]+\.[a-z]$/i)) {
      profile.file = OS.Path.join(Directories.profile, profile.list);
      this.scan(profile);
    } else {
      return ChromeWindow.console.log(Locales('invalidRulelist') + '\r\n' + Locales(profile.debug));
    }
  },
  scan: function (profile) {
    OS.File.read(profile.file).then(
      function onSuccess(array) {
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
            Execution.normalize(profile.white, list[i].substr(2));
          } else {
            Execution.normalize(profile.match, list[i]);
          }
        }
      },
      function onFailure(reason) {
        if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
          ChromeWindow.console.log(Locales('fileNotExsit') + '\r\n' + Locales(profile.debug));
        }
      }
    );
  },
  normalize: function (proxy, rule) {
    if (rule.startsWith('||')) {
      var regexp = new RegExp(rule.replace(/\./g, '\\.').replace(/\*/g, '.*').replace('^', '').replace('||', '^https?://([^\\/]+\\.)*'));
      proxy.regexp.push(regexp);
    } else if (rule.startsWith('|')) {
      var regexp = new RegExp(rule.replace(/\./g, '\\.').replace(/\*/g, '.*').replace('|', '^'));
      proxy.regexp.push(regexp);
    } else if (rule.startsWith('/') && rule.endsWith('/')) {
      var regexp = new RegExp(rule.substring(1, rule.length - 1));
      proxy.regexp.push(regexp);
    } else if (rule.match(/^[\w\.\/]/)) {
      if (rule.includes('*')) {
        var regexp = new RegExp(rule.replace(/\./g, '\\.').replace(/\*/g, '.*'));
        proxy.regexp.push(regexp);
      } else {
        proxy.string.push(rule);
      }
    }
  },
  editor: function (profile) {
    if (profile.noedit || !profile.file) return;

    OS.File.read(profile.file).then(
      function onSuccess(array) {
        var decoder = new TextDecoder();
        var data = decoder.decode(array);

        var ScratchpadManager = ChromeWindow.Scratchpad.ScratchpadManager;
        ScratchpadManager.openScratchpad({
          'filename': profile.file,
          'text': data,
          'saved': true
        }).addEventListener(
          'click',
          function click(event) {
            if (event.target.id == 'sp-toolbar-save') {
              event.target.ownerDocument.defaultView.addEventListener(
                'close',
                function close(event) {
                  Execution.scan(profile);
                },
                false
              );
            }
          },
          false
        );
      },
      function onFailure(reason) {
        if (reason instanceof OS.File.Error && reason.becauseNoSuchFile) {
          return ChromeWindow.console.log(Locales('fileNotExsit') + '\r\n' + Locales(profile.debug));
        }
      }
    );
  }
};

var SimpleProxy = {
  match: function (method, rule, url) {
    if (method == 'regexp' && rule.test(url.spec)) {
      return true;
    } else if (method == 'string' && url.spec.includes(rule)) {
      return true;
    }
  },
  applyFilter: function (service, uri, proxy) {
    for (var i in Profiles) {
      if (!Profiles[i].server) continue;

      var white = Profiles[i].white;
      var match = Profiles[i].match;

      for (var x in white) {
        if (white[x].length == 0) continue;

        for (var r in white[x]) {
          var _rule = white[x][r];

          if (SimpleProxy.match(x, _rule, uri)) {
            return proxy;
          }
        }
      }

      for (var y in match) {
        if (match[y].length == 0) continue;

        for (var s in match[y]) {
          var rule = match[y][s];

          if (SimpleProxy.match(y, rule, uri)) {
            return Profiles[i].server;
          }
        }
      }
    }
    return proxy;
  }
}

exports.main = function (options, callbacks) {
  SimplePrefs.prefs['description'] = Locales('Simple Proxy');
  Preferences.pending();
  ProxyService.registerFilter(SimpleProxy, 3);
};

exports.onUnload = function (reason) {
  ProxyService.unregisterFilter(SimpleProxy);
};
