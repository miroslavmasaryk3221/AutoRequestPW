if (window === top) {
    const scripts = [
        'common/classes/EventEmitter.js',
        'common/classes/Operation.js',
        'common/classes/Action.js',
        'common/classes/Util.js',
        'common/classes/Notifier.js',
        'common/classes/SmartInsertTextarea.js',
        'common/classes/CancellationToken.js',
        'common/plugins/OperationImplementations.js',
    ];
    for (const script of scripts) {
        addPlugin('MainPage', 'loading', script);
    }
    addPlugin('MainPage', 'interactive', 'common/plugins/ActionRunner.js');
    chrome.runtime.sendMessage({
        request: 'new.session',
        loadedScripts: scripts
    });
}
