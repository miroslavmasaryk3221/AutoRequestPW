/**
 * Only listen in the root window
 */
if (window === top) {
    chrome.runtime.onMessage.addListener((message) => {
        if (message.request === 'searchTicket') {
            const el = document.createElement('script');
            el.textContent = 'top.SMweb.searchTicket("' + message.id + '")';
            document.documentElement.insertBefore(el, document.documentElement.firstChild);
            el.remove();
        }
        return false;
    });
}

/**
 * Ticket search handler
 */
addPlugin('MainPage', 'complete', function() {
    const LONG_ERROR = 30000;
    const SHORT_ERROR = 10000;
    const IS_SIT = window.location.host === 'smweb-sit.telekom.de'; //SM9 test environment

    let pattern = `^(?:
        (?:\\s*
            ([gG][rR][eE][pP]|[eE][xX][tT]|[uU][sS][eE][rR]|[lL][nN])\\s+(.+)
        \\s*)
        |
        (?:\\s*
            (
                 [iI][mM]\\d{1,10}
                |[tT]\\d{1,10}
                |[cC]\\d{1,9}
                |[cC][mM][oO][dD]\\d{1,6}
                |[sS][dD]\\d{1,9}
                |[pP][mM]\\d{5}-\\d{0,3}
                |(?:[pP][mM]\\d{1,5})(?!-)
        ${IS_SIT ? `
                |[sS][iI][tT]\\d{1, 10}
                |[sS][iI][tT]-[tT]\\d{1, 10}
                |[sS][iI][tT]-[cC]\\d{1, 9}
                |[sS][tT]\\d{1, 9}
        ` : ''}
            )
        \\s*)
        |
        (
                (?:\\s*[iI][mM]\\d{10}[\\s,]*)+
            |(?:\\s*[tT]\\d{10}[\\s,]*)+
            |(?:\\s*
                (?:
                     [cC][mM][oO][dD]\\d{6}
                    |[cC]\\d{9}
                )
            [\\s,]*)+
            |(?:\\s*[sS][dD]\\d{9}[\\s,]*)+
            |(?:\\s*[pP][mM]\\d{5}-\\d{3}[\\s,]*)+
            |(?:\\s*(?:[pP][mM]\\d{5})(?!-)[\\s,]*)+
        ${IS_SIT ? `
            |(?:\\s*[sS][iI][tT]\\d{10}[\\s,]*)+
            |(?:\\s*[sS][iI][tT]-[tT]\\d{10}[\\s,]*)+
            |(?:\\s*[sS][iI][tT]-[cC]\\d{9}[\\s,]*)+
            |(?:\\s*[sS][tT]\\d{9}[\\s,]*)+
        ` : ''}
        )
    )$`;
    pattern = pattern.replace(/\s+/g, '');

    // Ip:      |(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)

    const temp = document.createElement('template');
    temp.innerHTML =
        `<div id="ticketsearch">
            <input id="searchTicket" type="text" value="" required pattern="${pattern}" placeholder="Search for Ticket, CI name and more" title="">
            <div id='searchTicketTooltip'>
                <span>Input Ticket ID or Config Item name and hit Enter</span>
                <br><br>
                <span><b>Tip</b>: You can use search operators<br>
                    <i>EXT</i> &ndash; External incident IDs<br>
                    <i>GREP</i> &ndash; Select items of a view<br>
                    <i>USER</i> &ndash; User ID or Name<br>
                    <i>LN</i> &ndash; Incident by reporter last name<br>
                    <i>*</i> &ndash; Config Item ID
                </span>
            </div>
        </div>`;

    const placeholder = top.document.getElementById('smweb-placeholder');
    if (placeholder && placeholder.remove){
        placeholder.remove();
    }

    // document.getElementById('smwebcmdbar').appendChild(temp.content);
    document.getElementById('smwebcmdbar').insertBefore(temp.content, document.getElementById('smartease-notifier'));

    /////

    const searchField = document.getElementById('searchTicket');
    searchField.addEventListener('keyup', ev => {
        if (ev.keyCode == 13) SMweb.searchTicket();
    });

    const originalPlaceholder = searchField.placeholder;
    let errorMsgTimeout = null;

    // Credit: https://stackoverflow.com/a/37580979
    const permute = function (permutation) {
        var length = permutation.length,
            result = [permutation.slice()],
            c = new Array(length).fill(0),
            i = 1, k, p;

        while (i < length) {
            if (c[i] < i) {
                k = i % 2 && c[i];
                p = permutation[i];
                permutation[i] = permutation[k];
                permutation[k] = p;
                ++c[i];
                i = 1;
                result.push(permutation.slice());
            } else {
                c[i] = 0;
                ++i;
            }
        }
        return result;
    };

    SMweb.getSelections = function() {
        const tab = top.cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        const lf = dt === 'list' ? tab.getFrameWindow() : null;
        if (lf){
            const rl = lf.Ext.getCmp('recordListGrid');
            const items = rl.getSelectionModel().selections.items;
            return lf.listConfig.groupedBy === '' ? items : items.filter(function(item){
                if (item && item.data){
                    const parentGroup = rl.groupModel.nodeTree.nodeHash[item.data.parentKey];
                    if (parentGroup && parentGroup.attributes && parentGroup.attributes.rec && parentGroup.attributes.rec.data){
                        return parentGroup.attributes.rec.data.isExpanded;
                    }
                }
                return false;
            });
        }

        return [];
    };

    SMweb.countSelected = function() {
        return SMweb.getSelections().length;
    };

    SMweb.openNewTabAndWait = function(url){
        return new Promise(resolve => {
            SMweb.waitForEvent('forceUnmaskWindow').then(resolve);

            top.cwc.openNewTabPanel({
                url: url,
                closable: true
            }, null, true /* preventHappyClick */);
        });
    };

    // Tries to find a Cancel or Back button on the currently active tab and resolves when the page is refreshed
    SMweb.closeTabAndWait = function(){
        return new Promise(resolve => {
            SMweb.waitForEvent('forceUnmaskWindow').then(resolve);

            let isButtonFound = SMweb.topToolbarClick('Cancel');
            if (!isButtonFound){
                isButtonFound = SMweb.topToolbarClick('Back');
            }
        });
    };

    // Show an error message
    // Duration is optional and is in ms
    SMweb.showErrorMessage = function(message, duration){
        clearTimeout(errorMsgTimeout);
        searchField.value = '';
        searchField.placeholder = message;
        searchField.classList.add('error');
        searchField.blur();

        if (duration){
            errorMsgTimeout = setTimeout(SMweb.clearSearchField, duration);
        }
    };

    SMweb.clearSearchField = function(){
        clearTimeout(errorMsgTimeout);
        searchField.placeholder = originalPlaceholder;
        searchField.classList.remove('error');
        searchField.value = '';
    };

    SMweb.grepList = function(callback) {
        const tab = top.cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        const lf = dt === 'list' ? tab.getFrameWindow() : null;
        if (lf){
            const rl = lf.Ext.getCmp('recordListGrid');
            let foundLegalTargets = false;
            SMweb.getRecordListData().forEach(function(item, i, records) {
                if (!item.isLeafGroup && (!item.parentKey || records.find(x => item.parentKey === x['_ID_']).isExpanded)){
                    foundLegalTargets = true;
                    if (typeof callback === 'function' && !!callback(item)){
                        rl.selModel.selectRow(i, true, false);  // SelectRow(row, [keepExisting], [preventViewNotify])
                        return;
                    }
                }
                rl.selModel.deselectRow(i, false); // DeselectRow(row, [preventViewNotify])
            });
            if (foundLegalTargets){
                SMweb.clearSearchField();
            } else {
                SMweb.showErrorMessage('No visible tickets in current view.', SHORT_ERROR);
            }
        } else {
            SMweb.showErrorMessage('Grep works only on lists.', SHORT_ERROR);
        }
    };

    SMweb.searchTicket = async function(text) {
        try {
            if (text) searchField.value = text;

            let isArchiveValid = !IS_SIT; // Archive search is not available in test
            let [fileName, fieldName] = ['device', 'ci.name'];
            let queryFilter;
            let queryLength = 1;
            const pattern = searchField.pattern;
            const ticket = searchField.value.trim().toUpperCase();
            const asterisksOnly = new RegExp('^\\*+$');
            searchField.value = ticket;

            if (!ticket) return;

            if (searchField.validity.valid) {
                const match = ticket.match(new RegExp(pattern));

                const cmd = match[1];
                if (cmd !== undefined) { // GREP, EXT or USER search
                    if (cmd === 'GREP'){
                        const args = match[2].trim();
                        let reg;
                        try {
                            reg = new RegExp(args, 'i');
                        } catch (e) {
                            SMweb.showErrorMessage(e.message, LONG_ERROR);
                            console.error(e.message);
                            return;
                        }

                        const IMmatch = (reg, val) =>
                            Array.isArray(val) ? val.some(x => IMmatch(reg, x)) :
                                typeof val === 'object' ? Object.getOwnPropertyNames(val).some(p => IMmatch(reg, val[p])) :
                                    reg.test(val);

                        const countSelected = SMweb.countSelected();
                        SMweb.grepList(x => (!countSelected || x['_SELECTED_']) && IMmatch(reg, x));

                        return;

                    } else if (cmd === 'EXT'){
                        [fileName, fieldName] = ['probsummary', 'tsi.ext.related.ids.search'];
                        let list = match[2].split(/[\s,]+/).filter(item => item !== '');
                        // Select uniques by converting to Set and then back to Array
                        list = [...new Set(list)].map(item => '"' + item + '"');

                        queryLength = list.length;
                        if (queryLength === 1){
                            list = list[0].substring(1, list[0].length - 1);
                            if (asterisksOnly.test(list)) { // The argument is * only
                                SMweb.showErrorMessage('Please add more input.');
                                return;
                            }
                            queryFilter = encodeURIComponent(fieldName + ' LIKE "*' + list + '*"');
                        } else {
                            queryFilter = encodeURIComponent(fieldName + ' ISIN {' + list.join(',') + '}');
                        }

                    } else if (cmd === 'USER'){
                        isArchiveValid = false;
                        let list = match[2].split(/[\s,]+/);

                        if (list.some(item => asterisksOnly.test(item))) {
                            SMweb.showErrorMessage('Please add more input.');
                            return;
                        }

                        queryLength = list.length;
                        if (queryLength === 1){
                            [fileName, fieldName] = ['contacts', 'user.id'];
                            list = list[0];
                            queryFilter = encodeURIComponent(fieldName + ' LIKE "*' + list + '*"');

                        } else if (queryLength <= 3){
                            [fileName, fieldName] = ['contacts', 'full.name'];
                            const permutations = permute(list).map(p => `"*${p.join('*')}*"`);
                            queryFilter = encodeURIComponent(fieldName + ' LIKE ' + permutations.join(' or ' + fieldName + ' LIKE '));

                        } else {
                            SMweb.showErrorMessage('Try with 3 or fewer arguments.', LONG_ERROR);
                            return;
                        }
                    } else if (cmd === 'LN'){ // Search incidents by reporter last name
                        isArchiveValid = false;
                        const name = match[2].trim();

                        if (name){
                            if (asterisksOnly.test(name.replace(/\s+/g, ''))) {
                                SMweb.showErrorMessage('Please add more input.');
                                return;
                            }
                            [fileName, fieldName] = ['probsummary', 'tsi.alternate.last.name'];
                            queryFilter = encodeURIComponent(fieldName + '#"' + name + '"'); // Starts with name
                        }
                    }

                } else {
                    // If not a command it's a ticket ID
                    if (ticket.startsWith('C') || ticket.startsWith('SIT-C')) [fileName, fieldName] = ['cm3r', 'number'];
                    else if (ticket.startsWith('T') || ticket.startsWith('SIT-T')) [fileName, fieldName] = ['cm3t', 'number'];
                    else if (ticket.startsWith('IM') || ticket.startsWith('SIT')) [fileName, fieldName] = ['probsummary', 'number'];
                    else if (ticket.startsWith('SD') || ticket.startsWith('ST')) [fileName, fieldName] = ['incidents', 'incident.id'];
                    else if (ticket.startsWith('PM')) { //problem tasks look like 'PMxxxxx-xxx'
                        [fileName, fieldName] = ticket.includes('-') ? ['rootcausetask', 'id'] : ['rootcause', 'id'];
                    }

                    if (match[4] !== undefined){ // Multi ticket search
                        // Split the list of tickets by the first character of their IDs: I, C, T, S OR P
                        // Because the regex does not enforce (only allows) space or comma delimiters
                        let list = match[4].split(ticket[0]).filter(item => item !== '').map(item => '"' + ticket[0] + item.replace(/[\s,]/g, '') + '"');
                        // Select uniques by converting to Set and then back to Array
                        list = [...new Set(list)];
                        queryLength = list.length;
                        queryFilter = encodeURIComponent(fieldName + ' ISIN {' + list.join(',') + '}');
                    } else {
                        queryFilter = encodeURIComponent(fieldName + '#"' + ticket + '"'); // =#(Starts with)   LIKE   isin {"AARON, JIM","ARMSTRONG, TRACY"}
                    }
                }
            } else { // Fallback to CI search
                if (asterisksOnly.test(ticket)) {
                    SMweb.showErrorMessage('Please add more input.');
                    return;
                }
                isArchiveValid = false;
                queryFilter = encodeURIComponent(fieldName + '#"' + ticket + '"');
            }

            // Normal search
            let url = top.cwc.toCSRFSafe('detail.do?ctx=docEngine&wflink=true&file=' + fileName + '&query=' + queryFilter);
            await SMweb.openNewTabAndWait(url);

            let newTab = cwc.getActiveTab();
            let win = newTab.getDetailFrameWindow() || newTab.getFrameWindow();
            // If we are still on the search page the search failed
            let recordsLength = SMweb.getRecordListData().length || 1;
            if (win.tpz_scForm === 'FilterAdvFind' || ((isArchiveValid || IS_SIT) && recordsLength && recordsLength < queryLength)) {
                if (win.tpz_scForm === 'FilterAdvFind'){
                    await SMweb.closeTabAndWait();
                }

                if (isArchiveValid){
                    // NOTE not sure what this is for exactly, does not seem to be the best solution
                    await new Promise(resolve => setTimeout(() => resolve(), 150));

                    // If we had a failed non-CI search we also try in the archive
                    url = top.cwc.toCSRFSafe('detail.do?ctx=docEngine&wflink=true&file=tsiarchive' + fileName + '&query=' + queryFilter);
                    await SMweb.openNewTabAndWait(url);

                    newTab = cwc.getActiveTab();
                    win = newTab.getDetailFrameWindow() || newTab.getFrameWindow();
                    recordsLength += SMweb.getRecordListData().length;
                    if (win.tpz_scForm === 'FilterAdvFind' || (recordsLength && recordsLength < queryLength)) {
                        SMweb.showErrorMessage('Not all terms have been found.', LONG_ERROR);
                        if (win.tpz_scForm === 'FilterAdvFind'){
                            await SMweb.closeTabAndWait();
                        }

                        return;
                    }
                } else {
                    SMweb.showErrorMessage('Not all terms have been found.', LONG_ERROR);
                    return;
                }
            }

            SMweb.clearSearchField();
        } catch (e) {
            SMweb.showErrorMessage('An unexpected error occured.', LONG_ERROR);
            top.cwc.unmaskWindow();
            throw e;
        }
    };
});
