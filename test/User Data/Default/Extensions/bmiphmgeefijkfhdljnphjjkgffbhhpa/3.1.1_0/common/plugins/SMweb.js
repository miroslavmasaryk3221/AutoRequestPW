/**
 * Create SMweb object and add it to the top window
 */
addPlugin('MainPage', 'loading', `top.SMweb = top.SMweb || {}; top.SMweb.extensionId="${chrome.runtime.id}";`);

/**
 * Construct the SMweb object
 */
addPlugin('MainPage', 'loading', function() {
    // Used in CloseTabs.js
    SMweb.clickedTabId = '';
    SMweb.actionCancellationToken;
    SMweb.actionRunner;

    /**
     * Creates a copy of the given element. This function is used for script
     * and link tags, we copy only the bare minimum needed for those elements.
     *
     * Cloning a HTMLScriptElement with cloneNode does not run the script so it
     * must be cloned manually.
     * @param {HTMLElement} element the element to clone
     * @param {Document} targetDocument the document where the script will exist
     */
    const cloneLoadedElement = function(element, targetDocument = document) {
        const clone = targetDocument.createElement(element.tagName);
        clone.textContent = element.textContent;
        if (element.type) {
            clone.type = element.type;
        }
        if (element.rel) {
            clone.rel = element.rel;
        }

        return clone;
    };

    // Allows you to reject a promise after a given timeout in ms
    SMweb.setPromiseTimeout = function(reject, timeout, callback) {
        return setTimeout(function() {
            if (callback && typeof callback === 'function') {
                callback();
            }
            if (reject && typeof reject === 'function') {
                reject(new Error('Timeout after ' + timeout + ' ms.'));
            }
        }, timeout);
    };

    /**
     * Waits and continues retrying the passed function until it returns a
     * truthy value.
     */
    SMweb.waitUntil = function(callback, timeout = 30000) {
        return new Promise(function(resolve, reject) {
            if (callback && typeof callback !== 'function') {
                reject(new Error('Invalid callback.'));
            }
            var retryTimeout;
            var continueRetrying = true;
            var promiseTimeout = SMweb.setPromiseTimeout(reject, timeout, function() {
                clearTimeout(retryTimeout);
                continueRetrying = false;
            });

            (function retry() {
                if (SMweb.actionCancellationToken) {
                    SMweb.actionCancellationToken.throwIfCancelled();
                }

                const result = callback();
                if (result) {
                    clearTimeout(promiseTimeout);
                    resolve(result);
                } else if (continueRetrying) {
                    retryTimeout = setTimeout(retry, 250);
                }
            })();
        });
    };

    SMweb.waitForEvent = function (event, element) {
        return new Promise(resolve => {
            element = element || top.document.documentElement;
            element.addEventListener(event, (ev) => resolve(ev), {
                once: true
            });
        });
    };

    /**
     * Requests background.js to load a html document and all its
     * styles and scripts as a component.
     * The style and script tags are then appended to targetDocument.head
     * and the component's body is wrapped into a div.
     * This div is NOT added to the DOM by this function.
     *
     * @param {string} name The name of the component to load
     * @param {Document} targetDocument The document where the component
     *  will be inserted. Defaults to top.document.
     *
     * @returns {HTMLDivElement} A div containing the component's body.
     */
    SMweb.loadComponent = function (name, targetDocument = document) {
        return new Promise(resolve => {
            chrome.runtime.sendMessage(this.extensionId, {
                request: 'load.component',
                name: name
            }, response => {
                const container = targetDocument.createElement('div');
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(response, 'text/html');
                // Clone the script tags, they are not executed via cloneNode
                for (const node of htmlDoc.head.children) {
                    const clone = cloneLoadedElement(node, targetDocument);
                    if (clone) {
                        targetDocument.head.appendChild(clone);
                    }
                }
                container.innerHTML = htmlDoc.body.innerHTML;
                resolve(container);
            });
        });
    };

    SMweb.getActions = function () {
        return new Promise((resolve, reject) => {
            try {
                chrome.runtime.sendMessage(
                    SMweb.extensionId,
                    {
                        request: 'get.actions'
                    },
                    actions => {
                        actions = actions || [];
                        actions = actions
                            .filter(action => action !== undefined)
                            .map(action => Action.from(action));
                        resolve(actions);
                    }
                );
            } catch (error) {
                reject (error);
            }
        });
    };

    SMweb.enableTicketActions = function (enable) {
        const actions = document.getElementById('detailActions');
        let actionInProgress = false;
        if (SMweb.actionRunner) {
            actionInProgress = SMweb.actionRunner.isActionInProgress();
        }
        const shouldSetInactive = !enable || actionInProgress;
        actions.classList.toggle('inactive', shouldSetInactive);

    };

    SMweb.getListFrameWindow = function (tab = cwc.getActiveTab()) {
        const displayType = tab.dataStore.displayType;
        switch (displayType) {
            case 'list':
                return tab.getFrameWindow();
            case 'listdetail':
                return tab.getListFrameWindow();
            default:
                throw new Error('Not a listPage: ' + displayType);
        }
    };

    SMweb.getDetailFrameWindow = function (tab = cwc.getActiveTab()) {
        const displayType = tab.dataStore.displayType;
        switch (displayType) {
            case 'detail':
                return tab.getFrameWindow();
            case 'listdetail':
                return tab.getDetailFrameWindow();
            default:
                throw new Error('Not a detailPage: ' + displayType);
        }
    };

    SMweb.isIncidentPage = function (tab, win) {
        tab = tab || top.cwc.getActiveTab();
        win = win || tab.getDetailFrameWindow() || tab.getFrameWindow();
        return win.tpz_scForm === 'tsi.IM.update.incident'
            || win.tpz_scForm === 'sc.manage.problem.g'
            || win.tpz_scForm === 'tsi.IM.close.incident';
    };

    function doesDisplayTypeMatch(tab, ...displayTypes) {
        tab = tab || top.cwc.getActiveTab();
        return displayTypes.includes(tab.dataStore.displayType);
    }

    SMweb.isDetailPage = function (tab) {
        return doesDisplayTypeMatch(tab, 'detail');
    };

    SMweb.isListPage = function (tab) {
        return doesDisplayTypeMatch(tab, 'list');
    };

    SMweb.isListDetailPage = function (tab) {
        return doesDisplayTypeMatch(tab, 'listdetail');
    };

    SMweb.isDetailOrListDetailPage = function (tab) {
        return doesDisplayTypeMatch(tab, 'detail', 'listdetail');
    };

    SMweb.isListOrListDetailPage = function (tab) {
        return doesDisplayTypeMatch(tab, 'list', 'listdetail');
    };

    SMweb.openOptions = function(){
        chrome.runtime.sendMessage(SMweb.extensionId, { request: 'openOptions' });
    };

    SMweb.topToolbarFind = function(text, tab) {
        tab = tab || top.cwc.getActiveTab();
        // 'list', 'detail'
        const tb = tab.dataStore.displayType !== 'listdetail' ?
            tab.items.map['mif'].topToolbar
        // 'cwcListFrame'
            :
            tab.getFrameWindow().Ext.ComponentMgr.all.map['cwcDetailFrame'].topToolbar;

        const path = text.split('/');
        let item = tb.findBy(x => x.text === path[0])[0];

        path.shift();
        while (path.length > 0 && (item && item.menu && item.menu.items && Array.isArray(item.menu.items.items))) {
            item = item.menu.items.items.find(x => x.text === path[0]);
            path.shift();
        }
        return item;
    };

    SMweb.topToolbarClick = function(text, tab, click = true) {
        tab = tab || top.cwc.getActiveTab();
        const button = top.SMweb.topToolbarFind(text, tab);
        if (button) {
            if (button.handler) {
                if (click) button.handler(new MouseEvent('click'));
                return true;
            } else if (button.el && button.el.dom && button.el.dom.click) {
                if (click) button.el.dom.click();
                return true;
            }
        }
        return false;
    };


    SMweb.getAllFieldValues = function(prefix = '', tab, win) {
        tab = tab || top.cwc.getActiveTab();
        win = win || tab.getDetailFrameWindow() || tab.getFrameWindow();
        const doc = win.document;

        const m = new Map();
        doc.querySelectorAll('[scripttype], [sctype]').forEach(function(f) {
            const fName = f.getAttribute('alias') || f.getAttribute('ref') || f.getAttribute('name') || f.getAttribute('title');
            const fValue = f.value || f.innerText;

            if (fName && fName.startsWith(prefix)) m.set(fName, fValue);
        });
        const cmp = (a, b) => (a > b) - (a < b);
        return new Map([...m].sort((a, b) => cmp(a[0].toLowerCase(), b[0].toLowerCase())));
    };

    const getRecordList = function(group, tab, fr, rl, sm) {
        const result = [];

        if (!['data', 'json'].includes(group)) return result;

        if (!tab) {
            tab = top.cwc.getActiveTab();
        }
        if (!fr) {
            const popup = top.cwc.getActivePopup();
            if (popup) {
                fr = popup.getWindow();
            } else {
                const dt = tab.dataStore.displayType;
                fr = dt === 'list' ? tab.getFrameWindow() : dt === 'listdetail' ? tab.getListFrameWindow() : null;
            }
            if (!fr) return result;
        }
        if (!rl) {
            rl = fr.Ext.getCmp('recordListGrid');
            if (!rl) return result;
        }
        if (fr.listConfig.count === 0) { //when the list is empty
            return result;
        }
        if (!sm) {
            sm = rl.selModel; // rl.getSelectionModel();
        }

        const keys = fr.listConfig.keys.split('@@');
        const key = keys.slice(-1)[0].replace(/\./g, '_');

        const selected = new Set(rl.selModel.selections.items.map(x => x.id)); // rl.selModel.lastFocus
        const dateReg = new RegExp('^(\\d+)' + fr.tpz_dateseparator + '(\\d+)' + fr.tpz_dateseparator + '(\\d+)( \\d+:\\d+:\\d+)?$');

        // Turn whatever date format the user is using into a format digestible by Date.parse()
        // This traverses the input object and all child objects recursively so performance issues are possible
        const fixDateFormats = function(object) {
            if (typeof object === 'string') {
                const match = object.match(dateReg);
                if (match) {
                    switch (fr.tpz_dateformat) {
                        case '1': /*  mm/dd/yy   */  object = (2000+parseInt(match[3]))+'-'+match[1]+'-'+match[2]; break;
                        case '2': /*  dd/mm/yy   */  object = (2000+parseInt(match[3]))+'-'+match[2]+'-'+match[1]; break;
                        case '3': /*  yy/mm/dd   */  object = (2000+parseInt(match[1]))+'-'+match[2]+'-'+match[3]; break;
                        case '4': /*  mm/dd/yyyy */  object =                match[3]  +'-'+match[1]+'-'+match[2]; break;
                        case '5': /*  dd/mm/yyyy */  object =                match[3]  +'-'+match[2]+'-'+match[1]; break;
                        case '6': /*  yyyy/mm/dd */  object =                match[1]  +'-'+match[2]+'-'+match[3]; break;
                    }
                    object += match[4];
                }
            } else if (typeof object === 'object') {
                for (const key in object) {
                    object[key] = fixDateFormats(object[key]);
                }
            }

            return object;
        };

        rl.store.data.items.forEach(row => {
            const fields = {};
            fields['_FOCUSED_'] = (sm.lastFocus == row.id); // list=top.SMweb.getRecordListJson(); list.map( x => [ x['_FOCUSED_'], x['_SELECTED_'],  x ] );
            fields['_SELECTED_'] = selected.has(row.id);
            fields['_KEY_'] = row.data[key];
            fields['_ID_'] = row.id;


            for (const prop in row[group]) {
                fields[prop] = fixDateFormats(row[group][prop]);
            }

            fields['_STATUS_'] = fields['problem_status'] || fields['status'] || '';
            fields['_GROUP_'] = fields['group'] || fields['assignment'] || '';
            fields['_DESCRIPTION_'] = fields['description'] || fields['brief_description'] || '';

            result.push(fields);
        });
        return result;
    };

    // TODO remove these, no difference between them, use getRecordList directly
    SMweb.getRecordListData = (tab, fr, rl) => getRecordList('data', tab, fr, rl);
    SMweb.getRecordListJson = (tab, fr, rl) => getRecordList('json', tab, fr, rl);
    const attributes = ['id', 'alias', 'ref', 'name', 'title'];
    SMweb.getField = function(name, tab, win) {
        win = win || SMweb.getDetailFrameWindow(tab);

        const selectors = [];
        // Restore scripttype, sctype if anything breaks
        // ['scripttype', 'sctype'].forEach(s => attributes.forEach
        // f => selector.push(`[${s}][${f}="${name}"]`)
        attributes.forEach(attr => selectors.push(`[${attr}="${name}"]`));
        let el = win.document.querySelector(selectors.join(', '));

        if (!el) {
            const labels = Util.getAll('label');
            const label = labels.find(label => label.textContent.includes(name));
            if (label) {
                el = win.document.getElementById(label.getAttribute('for'));
            }
        }

        return el;
    };


    SMweb.getFieldValue = function(name, tab, win) {
        tab = tab || top.cwc.getActiveTab();
        win = win || tab.getDetailFrameWindow() || tab.getFrameWindow();

        const field = top.SMweb.getField(name, tab, win);

        if (!field) {
            return win[name];
        }

        const widget = win.hpsm.getWidget(field);
        if (widget) {
            const value = (typeof widget.getValue === 'function') ? widget.getValue() :
                (typeof widget.elem.getValue === 'function') ? widget.elem.getValue() : win.dvdGetFieldValue(field);
            return value;
        } else {
            return field.value || field.innerText;
        }
    };


    SMweb.setFieldValue = function(name, value, tab, win) {
        tab = tab || top.cwc.getActiveTab();
        win = win || tab.getDetailFrameWindow() || tab.getFrameWindow();
        value = value || '';
        const widget = win.hpsm.getWidget(top.SMweb.getField(name, tab, win));
        widget.setValue(value);
    };

    SMweb.setComboValue = function(fieldName, value, tab, win) {
        tab = tab || top.cwc.getActiveTab();
        win = win || tab.getDetailFrameWindow() || tab.getFrameWindow();

        const field = top.SMweb.getField(fieldName, tab, win);
        if (field.value === value) {
            return;
        }
        win.hpsm.widgets.Combo.togglePopup(field.id);
        const popup = win.hpsm.widgets.Combo.findPopup(field.id);
        const items = win.hpsm.widgets.Combo.getPopupListItems(popup);
        const itemId = Array.from(items).find(x => x.textContent == value).id;
        if (itemId) {
            const evt = new MouseEvent('click');
            win.document.getElementById(itemId).dispatchEvent(evt);
        }
        win.hpsm.widgets.Combo.togglePopup(field.id);
    };
});