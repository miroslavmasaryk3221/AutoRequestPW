'use strict';

{
  const map = {
    'chrome-extensions': 'https://chrome.google.com/webstore/category/extensions'
  };
  const onStartup = () => {
    chrome.contextMenus.create({
      title: 'Open Chrome Web Store',
      id: 'chrome-extensions',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      title: 'Create Shortcut for This Page',
      id: 'make-app',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      title: 'Open Apps',
      contexts: ['browser_action'],
      id: 'apps'
    });
    chrome.contextMenus.create({
      title: 'Display all Extensions',
      id: 'mode-all',
      contexts: ['browser_action'],
      type: 'radio'
    });
    chrome.contextMenus.create({
      title: 'Display only Apps',
      id: 'mode-app',
      contexts: ['browser_action'],
      type: 'radio'
    });
    {
      const parentId = chrome.contextMenus.create({
        title: 'Chrome Internals',
        contexts: ['browser_action'],
        id: 'chrome-flags'
      });
      [
        'chrome://about', 'chrome://accessibility', 'chrome://appcache-internals', 'chrome://blob-internals',
        'chrome://bluetooth-internals', 'chrome://bookmarks', 'chrome://chrome', 'chrome://chrome-urls', 'chrome://components',
        'chrome://crashes', 'chrome://credits', 'chrome://device-log', 'chrome://devices', 'chrome://dino', 'chrome://discards',
        'chrome://download-internals', 'chrome://downloads', 'chrome://extensions', 'chrome://flags', 'chrome://gcm-internals',
        'chrome://gpu', 'chrome://help', 'chrome://histograms', 'chrome://history', 'chrome://indexeddb-internals',
        'chrome://inspect', 'chrome://interstitials', 'chrome://interventions-internals', 'chrome://invalidations',
        'chrome://local-state', 'chrome://management', 'chrome://media-engagement', 'chrome://media-internals', 'chrome://nacl',
        'chrome://net-export', 'chrome://net-internals', 'chrome://network-error', 'chrome://network-errors', 'chrome://newtab',
        'chrome://ntp-tiles-internals', 'chrome://omnibox', 'chrome://password-manager-internals', 'chrome://policy',
        'chrome://predictors', 'chrome://print', 'chrome://process-internals', 'chrome://quota-internals', 'chrome://safe-browsing',
        'chrome://serviceworker-internals', 'chrome://settings', 'chrome://signin-internals', 'chrome://site-engagement',
        'chrome://suggestions', 'chrome://supervised-user-internals', 'chrome://sync-internals', 'chrome://system',
        'chrome://terms', 'chrome://thumbnails', 'chrome://tracing', 'chrome://translate-internals', 'chrome://usb-internals',
        'chrome://user-actions', 'chrome://version', 'chrome://webrtc-internals', 'chrome://webrtc-logs'
      ].forEach(title => chrome.contextMenus.create({
        title,
        id: title.replace('chrome://', ''),
        contexts: ['browser_action'],
        parentId
      }));
      chrome.storage.local.get({
        mode: 'app'
      }, prefs => chrome.contextMenus.update('mode-' + prefs.mode, {
        checked: true
      }));
    }
  };
  chrome.runtime.onInstalled.addListener(onStartup);
  chrome.runtime.onStartup.addListener(onStartup);
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'mode-all' || info.menuItemId === 'mode-app') {
      return chrome.storage.local.set({
        mode: info.menuItemId.replace('mode-', '')
      });
    }
    else if (info.menuItemId === 'make-app') {
      chrome.management.generateAppForLink(tab.url, tab.title);
    }
    else {
      const url = map[info.menuItemId] || ('chrome://' + info.menuItemId);
      chrome.tabs.create({
        url
      });
    }
  });
}

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
