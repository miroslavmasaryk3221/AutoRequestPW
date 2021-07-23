/**
 * Initiate autoRefresh as disabled
 */
addPlugin('MainPage', 'loading', function() {
    top.SMweb.autoRefresh = 0;
    top.SMweb.nextRefresh = null;

    const getSelectedTickets = function(){
        const tab = top.cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        const lf = dt === 'list' ? tab.getFrameWindow() : dt === 'listdetail' ? tab.getListFrameWindow() : null;
        const rl = lf.Ext.getCmp('recordListGrid');

        return rl.getSelectionModel().getSelections().map(row => row.data.number);
    };

    const selectTickets = function(idList){
        let idSet;
        if (idList.length === 0){
            return false;
        }
        if (!(idList instanceof Set)){
            idSet = new Set(idList);
        }

        const tab = top.cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        const lf = dt === 'list' ? tab.getFrameWindow() : dt === 'listdetail' ? tab.getListFrameWindow() : null;
        const rl = lf.Ext.getCmp('recordListGrid');
        const selModel = rl.getSelectionModel();

        const records = top.SMweb.getRecordListData();
        for (let i = 0; i < records.length; i++){
            if (idSet.has(records[i]['_KEY_'])){
                selModel.selectRow(i, true);
            }
        }
        return true;
    };

    // Refreshes the page, keeping the ticket selection intact
    const refresh = async function() {
        const cp = Ext.getCmp(top.cwc.centerPanelId);
        const tab = cp.activeTab;
        if (tab === cp.activeTab && tab.title.includes('Queue')) {
            const selection = getSelectedTickets();
            top.SMweb.topToolbarClick('Refresh', tab);
            await top.SMweb.waitForEvent('forceUnmaskWindow');
            selectTickets(selection);
        }
        top.SMweb.scheduleRefresh();
    };

    /**
     * TODO: Instead of using resource-heavy setTimeouts and clearTimeouts,
     * we should only store a time value (in ms) and let the SMartEase event loop
     * handle it. 0 would be no refresh.
     */
    top.SMweb.clearNextRefresh = function(){
        if (top.SMweb.nextRefresh) clearTimeout(top.SMweb.nextRefresh);
    };

    top.SMweb.scheduleRefresh = async function() {
        top.SMweb.clearNextRefresh();
        const autoRefresh = top.SMweb.autoRefresh || 0;
        top.SMweb.nextRefresh = autoRefresh > 0 ? setTimeout(refresh, autoRefresh * 1000) : null;
    };
});

/**
 * Reads and gets the autoRefresh value from the extension's options.
 * Makes sure that while a ticket action is in progress, autoRefresh is disabled.
 */
addPlugin('MainPage', 'complete', function() {
    chrome.runtime.sendMessage(top.SMweb.extensionId, {
        request: 'storage.get',
        autoRefresh: null
    }, function(options){
        top.SMweb.autoRefresh = options.autoRefresh;
    });

    /**
     * TODO: does the refresh run all addPlugins on the page, or should this listener
     * be re-enabled once the ticket action is closed?
     */
    top.document.documentElement.addEventListener('ticketActionStart', function(){
        top.SMweb.clearNextRefresh();
        top.SMweb.waitForEvent('ticketActionEnd').then(top.SMweb.scheduleRefresh);
    });
});

/**
 * If the script runs on the root page (not iframe), set
 * autoRefresh timeout starting after last mouse movement
 */
addPlugin('all', 'complete', function() {
    addEventListener('mousemove', function() {
        if (top.SMweb && top.SMweb.scheduleRefresh) top.SMweb.scheduleRefresh();
    });
});

