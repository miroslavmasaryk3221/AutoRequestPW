/* global Sortable */
'use strict';

const t = document.querySelector('template');
const noapp = document.getElementById('no-app');

document.addEventListener('click', e => {
  const parent = e.target.closest('.grid-item');
  const ce = e.target.closest('[data-cmd]');
  if (!ce) {
    return;
  }
  const cmd = ce.dataset.cmd;
  console.log(parent, cmd, e.target);
  if (cmd === 'open-settings') {
    chrome.tabs.create({
      url: parent.dataset.settingsurl
    });
  }
  if (cmd === 'open-home') {
    chrome.tabs.create({
      url: parent.dataset.homeurl
    });
  }
  if (cmd === 'open-app') {
    chrome.management.launchApp(parent.dataset.id, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        alert(lastError.message);
      }
    });
  }
}, false);

const number = () => {
  let n = 1;
  [...document.querySelectorAll('.grid-item')].forEach(e => {
    const s = e.querySelector('.number');

    if (e.getBoundingClientRect().top > 0 && n < 10) {
      s.textContent = '#' + n;
      s.dataset.number = n;
      if (n === 1) {
        const a = document.querySelector(':focus');
        if (!a || a.getBoundingClientRect().top < 0 || a.getBoundingClientRect().top > document.body.offsetHeight) {
          e.focus();
        }
      }
      n += 1;
    }
    else {
      s.textContent = '';
      delete s.dataset.number;
    }
  });
};
const observer = new IntersectionObserver(() => {
  clearTimeout(number.id);
  number.id = setTimeout(number, 300);
}, {
});

chrome.storage.local.get({
  mode: 'app'
}, prefs => {
  chrome.management.getAll(extensions => {
    extensions = extensions.filter(e => e.enabled);
    if (prefs.mode === 'app') {
      extensions = extensions.filter(e => e.type.endsWith('app') && e.enabled);
    }
    if (extensions.length) {
      chrome.storage.local.get('ids', prefs => {
        const ids = prefs.ids || [];
        extensions.sort((e1, e2) => {
          const i = ids.indexOf(e1.id);
          const j = ids.indexOf(e2.id);
          return i !== -1 && j !== -1 ? i - j : 0;
        }).forEach(app => {
          const div = document.importNode(t.content, true).querySelector('div');
          const icon = app.icons.sort((a, b) => b.size - a.size)[0] || {
            url: './addon.svg'
          };
          if (app.type === 'packaged_app') {
            div.style.backgroundImage = `url("${icon.url}")`;
          }
          else {
            div.style.backgroundImage = `url("${icon.url}"), url('circle.svg')`;
            div.style.backgroundSize = '32px, 80px';
          }
          div.dataset.type = app.type;
          div.querySelector('.title').textContent = div.title = app.name;
          div.dataset.id = app.id;
          div.dataset.name = app.name.toLowerCase();
          if (app.optionsUrl) {
            div.dataset.settingsurl = app.optionsUrl;
          }
          if (app.homepageUrl) {
            div.dataset.homeurl = app.homepageUrl;
          }
          observer.observe(div);
          document.body.insertBefore(div, noapp);
        });
        // iso
        new Sortable(document.body, {
          animation: 150,
          draggable: '.grid-item',
          filter: '.ignore-elements',
          store: {
            set(sortable) {
              chrome.storage.local.set({
                ids: sortable.toArray()
              });
            }
          }
        });
      });
    }
  });
});

document.addEventListener('keypress', e => {
  const cmd = e.target.dataset.cmd;
  if (cmd && e.code === 'Enter') {
    e.target.click();
  }
  else if (e.code.startsWith('Numpad') || e.code.startsWith('Digit')) {
    const n = document.querySelector(`[data-number="${e.key}"]`);
    if (n) {
      n.closest('.grid-item').focus();
    }
  }
  else if (e.code.startsWith('Key')) {
    const n = document.querySelector(`:focus ~ [data-name^="${e.key}"]`);
    if (n) {
      return n.focus();
    }
    else {
      const n = document.querySelector(`[data-name^="${e.key}"]`);
      if (n) {
        return n.focus();
      }
    }
    const m = document.querySelector(`:focus ~ [data-name*="${e.key}"]`);
    if (m) {
      return m.focus();
    }
    else {
      const m = document.querySelector(`[data-name^="${e.key}"]`);
      if (m) {
        return m.focus();
      }
    }
  }
});
