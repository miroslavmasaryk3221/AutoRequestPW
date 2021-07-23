chrome.runtime.onMessageExternal.addListener(processMessage);
chrome.runtime.onMessage.addListener(processMessage);

let updateInstalled = false;

const loadedScripts = {
    urls: {},
    add: function(tabId, urls) {
        if (!this.urls[tabId]) return;

        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        for (const url of urls) {
            this.urls[tabId].add(getExtensionURL(url));
        }
    },
    has: function(tabId, url) {
        if (!tabId || !url || !this.urls[tabId]) {
            return false;
        }
        return this.urls[tabId].has(url);
    },
    createTabSession: function(tabId) {
        this.urls[tabId] = new Set();
    },
    endTabSession: function(tabId) {
        delete this.urls[tabId];
    }
};

/**
 * Remove tab session on tab close to free memory
 */
chrome.tabs.onRemoved.addListener(function (tabId) {
    if (Util.hasProp(loadedScripts.urls, tabId)) {
        loadedScripts.endTabSession[tabId];
    }
});

/**
 * Fetches a document and all styles and scripts within it.
 *
 * @param {string} src the url of the document to fetch
 * @param {string} tabId the id of the tab that sent the request, which is
 * required in order to avoid duplicate loading
 * @returns {string} the html code of the loaded elements
 */
async function createComponentFromHTML(src, tabId) {
    const content = await loadFile(src);
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(content.text, 'text/html');

    //fetch all scripts present in the input file
    const scriptElements = htmlDoc.head.querySelectorAll('script, style, link');
    const scripts = await loadElementsAsHTML(Array.from(scriptElements), tabId);

    return scripts + htmlDoc.body.innerHTML;
}

/**
 * Creates a HTML string from an array of HTMLElements. Each element with a
 * *src* or *href* attribute will be fetched first.
 * @param {HTMLElement[]} elements
 * @param {string} tabId the id of the tab that sent the request, which is
 * required in order to avoid duplicate loading
 */
function loadElementsAsHTML(elements, tabId) {
    return elements.reduce(async (prevPromise, el) => {
        const accumulator = await prevPromise;
        const url = el.src || el.href;
        if (!url) {
            return accumulator + el.outerHTML;
        }
        // If script is already loaded, we skip it
        if (loadedScripts.has(tabId, url)) {
            return accumulator;
        }

        const tagName = el.tagName === 'LINK' ? 'style' : el.tagName;
        const loadedElement = document.createElement(tagName);

        const content = await loadFile(url);
        loadedElement.textContent = content.text;
        loadedScripts.add(tabId, content.src);

        // Might need some generalizing here if more attributes are needed
        if (el.type) {
            loadedElement.type = el.type;
        }
        return accumulator + loadedElement.outerHTML;
    }, Promise.resolve(''));
}

/**
 * Load the file specified by the given path.
 * @param {string} src the url of the file to load
 */
async function loadFile(src) {
    const content = await fetch(src);
    const text = await content.text();
    return {
        text: text,
        src: src
    };
}

/**
 * Generates a URL for the given component.
 * @param {string} name the name of the component to load
 */
function getComponentURL(name) {
    return getExtensionURL(`common/components/${name}/${name}.html`);
}

/**
 * Returns `chrome.runtime.getURL(url)` unless the url already has the
 * chrome-extension:// protocol. This fixes a bug where the prefix would be
 * added multiple times in Chrome.
 * @param {string} url
 */
function getExtensionURL(url) {
    return url.startsWith('chrome-extension://') ? url : chrome.runtime.getURL(url);
}

/**
 * Communication handling between background page and plugins
 *
 * @param {{request: string, autoRefresh: number, Rules: object}} message
 * The request
 * @param {MessageSender} sender the source of the message
 * @param {function} sendResponse Callback for sending the response
 *
 * @returns true if the response will be sent asynchronously.
 */
function processMessage(message, sender, sendResponse) {
    const INPROGRESS = true;
    const PROCESSED = false;
    // Checks whether there's a valid callback
    const sendResponseValid = sendResponse && typeof sendResponse === 'function';

    const request = message.request;
    delete message.request;


    if (request === 'new.session') {
        loadedScripts.createTabSession(sender.tab.id);
        if (message.loadedScripts) {
            loadedScripts.add(sender.tab.id, message.loadedScripts);
        }
        return PROCESSED;
    }

    if (request === 'get.actions') {
        chrome.storage.sync.get('Rules', function (result) {
            if (sendResponseValid) {
                sendResponse(result.Rules);
            }
        });

        return INPROGRESS;
    }

    if (request === 'load.component') {
        /**
         * The runtime.onMessage listener cannot return Promise in Chrome
         * so we create an async wrapper for readability.
         */
        (async function () {
            if (sendResponseValid && message.name) {
                const url = getComponentURL(message.name);
                sendResponse(await createComponentFromHTML(url, sender.tab.id));
            }
        })();

        return INPROGRESS;
    }

    if (request === 'storage.set') {
        if (message.Rules && message.Rules.sort) {
            message.Rules.sort((action, action2) => {
                const a = action.title.trim().toUpperCase();
                const b = action2.title.trim().toUpperCase();
                return a < b ? -1 : 1;
            });
        }
        chrome.storage.sync.set(message, () => {
            message.lastError = chrome.runtime.lastError || null;
            if (sendResponseValid) {
                sendResponse(message);
            }
        });
        return INPROGRESS;
    } else if (request === 'storage.get') {
        chrome.storage.sync.get(Object.getOwnPropertyNames(message), (items) => {
            Object.assign(message, items);
            message.lastError = chrome.runtime.lastError || null;
            if (sendResponseValid) {
                sendResponse(message);
            }
        });

        return INPROGRESS;
    } else if (request === 'openOptions') {
        chrome.runtime.openOptionsPage();
        return PROCESSED;
    } else if (request === 'wasExtensionUpdated') {
        if (sendResponseValid) {
            sendResponse(updateInstalled);
            updateInstalled = false;
            return INPROGRESS;
        }
    }


    if (sendResponseValid) {
        sendResponse(message);
    }

    return PROCESSED;
}

/**
 * Onclick event for the plugin button
 * Open SM9 if it's not open, focus on it otherwise
 */
chrome.browserAction.onClicked.addListener(function () {
    const sm9 = {
        url: 'https://smweb.telekom.de/sm-prod/index.do'
    };

    chrome.tabs.query({
        url: sm9.url + '*'
    }, function (sm9Tabs) {
        chrome.tabs.query({
            'windowId': chrome.windows.WINDOW_ID_CURRENT,
            'active': true,
        }, function (activeTab) {
            if (sm9Tabs.length === 0) {
                const newTabUrls = ['chrome://newtab/', 'about:newtab'];
                if (newTabUrls.includes(activeTab[0].url)) {
                    // If we are on the default chrome newtab, navigate to SM9
                    chrome.tabs.update(activeTab[0].id, sm9);
                } else {
                    // Otherwise create a new tab
                    chrome.tabs.create(sm9);
                }
            } else {
                if (!activeTab[0].url.startsWith(sm9.url)) {
                    // Select the SM9 tab and activate its window
                    chrome.tabs.highlight({
                        'windowId': sm9Tabs[0].windowId,
                        'tabs': sm9Tabs[0].index
                    });
                    chrome.windows.update(sm9Tabs[0].windowId, {
                        'focused': true
                    });
                }
            }
        });
    });
});

/**
 * "About" contextmenu item
 */
chrome.contextMenus.create({
    title: 'About SMartease',
    contexts: ['browser_action'],
    onclick: function () {
        chrome.tabs.create({
            url: 'https://yam.telekom.de/groups/smartease'
        });
    }
});

/**
 * Returns true if obj === {}
 * @param {*} obj
 */
function isEmptyObject(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

/**
 * Returns whether chrome.storage.sync has any extension data saved.
 */
function isSyncStorageEmpty() {
    return new Promise(resolve => {
        chrome.storage.sync.get(null, syncData => {
            resolve(isEmptyObject(syncData));
        });
    });
}

/**
 * Move all extension settings from storage.local to storage.sync
 */
function moveLocalStorageToSync() {
    return new Promise(resolve => {
        // Get all settings from storage.local and copy to storage.sync
        chrome.storage.local.get(null, localData => {
            if (isEmptyObject(localData)) {
                resolve();
            }
            chrome.storage.sync.set(localData);
            chrome.storage.local.clear();
            resolve();
        });
    });
}

function getActions() {
    return new Promise(resolve => {
        processMessage({
            request: 'get.actions'
        }, null, resolve);
    });
}

function setActions(actions) {
    processMessage({
        request: 'storage.set',
        Rules: actions
    });
}

/**
 * This function modifies `op`'s type if it needs to be converted.
 * 
 * Relate and RelateIncident used to be one Operation with a conditional 
 * second parameter.
 * 
 * Resolve used to be a StatusUpdate Operation and it has received a couple of
 * optional parameters (downtimeEnd, resolutionCode, category1-4).
 * 
 * @param op legacy operation
 */
function convertLegacyOperationType(op) {
    if (op.type === Operation.Type.Relate && op.params.length === 2) {
        op.type = Operation.Type.RelateIncident;
    } else if (
        op.type === Operation.Type.StatusUpdate &&
        op.params[0] === Operation.TicketStatus.Resolved
    ) {
        op.type = Operation.Type.Resolve;
        op.params.splice(0, 1); // status parameter is no longer needed
        op.params.push(Operation.DowntimeEnd.Start);
        // Empty default values for resolution code and categories 1-4
        op.params.push('', '', '', '', '');
    }
}

/**
 * @param operations the legacy operation array
 *
 * @return `Operation[]`
 */
function convertOperations(operations) {
    if (!operations) {
        return undefined;
    }

    return operations.map(operation => {
        convertLegacyOperationType(operation);

        const config = Operation.paramConfigMap[operation.type];
        const newParams = {};
        operation.params.forEach((param, paramIndex) => {
            const paramNames = Object.keys(config);
            const paramName = paramNames[paramIndex];
            newParams[paramName] = param;
        });

        return Operation.from({
            type: operation.type,
            params: newParams
        });
    });
}

/**
 * Converts actions from the legacy structure to the current structure
 *
 * Compare:
 * asic_fileshare\UseCases\...\Testing\SMartease_actions_export_3.0.0.txt
 * asic_fileshare\UseCases\...\Testing\SMartease_actions_export_latest.txt
 *
 * @param actions legacy actions from storage
 *
 * @return `Action[]`
 */
function convertActions(actions) {
    const results = [];
    const overflownTitles = [];
    actions.forEach(action => {
        if (action.title.length > 50) {
            action.title = truncateTitle(action.title, overflownTitles);
            overflownTitles.push(action.title);
        }
        const operations = convertOperations(action.operations);
        if (operations) {
            results.push(new Action(action.title, operations));
        }
    });

    return results;
}

/**
 * Returns true if an action in `actions` has an array type `params` for one of
 * its operations. This signifies it's a legacy action as newer releases have
 * params objects.
 * @param actions 
 */
function hasLegacyActions(actions) {
    return actions.some((action) =>
        action && action.operations &&
        Array.isArray(action.operations[0].params)
    );
}

/**
 * Gets all current actions, converts them if needed to v3.1+ format and saves
 * them to storage.
 */
function migrateActions() {
    return new Promise(async resolve => {
        const actions = await getActions();
        if (!actions || !hasLegacyActions(actions)) {
            resolve();
            return;
        }

        /*
        * The toJSON call strips unnecessary properties from actions.
        * Objects are stringified when being passed with runtime.sendMessage
        * and we need to replicate this for the storage.set call below.
        */
        const result = convertActions(actions).map(action => action.toJSON());
        setActions(result);

        resolve();
    });
}

function truncateTitle(title, overflownTitles) {
    do {
        title = incrementTitle(title);
    } while (overflownTitles.includes(title));

    return title;
}

function incrementTitle(title) {
    const splitTitle = title.split('_');
    const index = splitTitle.length > 1
        ? parseInt(splitTitle[splitTitle.length -1])
        : -1;
    let newIndex, decimalPlaces;
    if (!index && index !== 0 || index < 0) {
        newIndex = 0;
        decimalPlaces = 1;
    } else {
        newIndex = index + 1;
        decimalPlaces = parseInt(Math.log10(newIndex)) + 1;
    }
    return title.substring(0, 50 - decimalPlaces - 1) + '_' + newIndex;
}

/**
 * Backwards compatibility, migrates old settings and actions to v3.1+.
 * Runs when SMartease is first installed, and when it or the browser updates.
 */
chrome.runtime.onInstalled.addListener(async function (details) {
    if (details.reason === 'update') {
        updateInstalled = true;
    }

    const isEmpty = await isSyncStorageEmpty();
    if (isEmpty) {
        await moveLocalStorageToSync();
    }

    migrateActions();
});
