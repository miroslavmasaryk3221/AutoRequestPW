/**
 * Tab switching handler
 */
addPlugin('all', 'complete', function() {
    if (top.SMweb){
        top.SMweb.switchTabs = function(forward = true) {
            const tabBar = top.Ext.getCmp(top.cwc.centerPanelId);
            if (tabBar && tabBar.items && tabBar.items.items) {
                const tabs = tabBar.items.items;
                let tabIndex = tabs.indexOf(tabBar.activeTab);
                if (tabIndex !== -1) {
                    if (forward) {
                        tabIndex = (tabIndex + 1) % tabs.length;
                    } else {
                        tabIndex = tabIndex - 1;
                        if (tabIndex < 0) {
                            tabIndex = tabs.length - 1;
                        }
                    }

                    tabBar.setActiveTab(tabIndex);
                }
            }
        };

        document.documentElement.addEventListener('keyup', function(event) {
            if (event.altKey) {
                if (event.code === 'Backquote') {
                    top.SMweb.switchTabs(false);
                } else if (event.code === 'Digit1') {
                    top.SMweb.switchTabs(true);
                }
            }
        });
    }
});
