/**
 * Gathers config items from an incident in groups
 * and enables copying their names to the clipboard
 */
addPlugin('MainPage', 'complete', function() {
    const cmp = (a, b) => (a > b) - (a < b); // Number comparator: a > b ? 1 : a < b ? -1 : 0
    const exists = function(obj, ...keys) { // Checks if object has key tree in its properties
        return keys.reduce((a, b) => (a || {})[b], obj) !== undefined;
    };

    const unknownAG = '(unknown AG)';

    // Retrieves the CI map of the incident in groups
    const getCiMap = function(tab, win) {
        tab = tab || top.cwc.getActiveTab();
        win = win || tab.getDetailFrameWindow() || tab.getFrameWindow();

        const ciMap = new Map();
        let ciName, adminGroup;

        if (win.tpz_viewType == 'list') {
            const pushCi = function(ciName) {
                if (ciName && /^\S+\s+\(\S+\)$/.test(ciName)) {
                    if (exists(SMweb, 'cache', ciName, 'portfolio', 0)) {
                        adminGroup = SMweb.cache[ciName].portfolio[0]['IncidentAG.Name'];
                    } else {
                        adminGroup = unknownAG;
                    }
                    if (!ciMap.has(adminGroup)) ciMap.set(adminGroup, []);
                    ciMap.get(adminGroup).push(ciName);
                }
            };

            SMweb.getRecordListJson().filter(x => x['_SELECTED_'] || x['_FOCUSED_']).forEach(x => {
                ['tsi_ci_name', 'tsi_ci_name_old', 'tsi_cilist'].forEach(f => {
                    if (typeof x[f] === 'string') {
                        pushCi(x[f]);
                    } else if (typeof x[f] === 'object' && Array.isArray(x[f][f])) {
                        x[f][f].forEach(x => pushCi(x));
                    }
                });
            });
        } else if (win.tpz_scForm === 'configurationItem') {
            ciName = SMweb.getFieldValue('instance/file.device/ci.name');
            adminGroup = SMweb.getFieldValue('instance/file.device/assignment');
            // BUGFIX only specific cases where CI is stored in different instance, e.g. IM0022805060
            if (!ciName) {
                ciName = SMweb.getFieldValue('instance/ci.name');
                adminGroup = SMweb.getFieldValue('instance/assignment');
            }
            ciMap.set(adminGroup, [ciName]);
        } else {
            if ([
                'tsi.ChM.rfc.initialization',
                'tsi.ChM.rfc.analysis',
                'tsi.ChM.chg.planning',
                'tsi.ChM.chg.approval',
                'tsi.ChM.chg.implementation',
                'tsi.ChM.rfc.close',
                'tsi.ChM.task'
            ].includes(win.tpz_scForm)) {
                const ciNames = SMweb.getAllFieldValues('instance/tsi.ci.name/tsi.ci.name');
                const adminGroups = SMweb.getAllFieldValues('instance/tsi.ci.admin.group/tsi.ci.admin.group');

                const sizeOfCIlist = ciNames.size;
                for (let i = 1; i <= sizeOfCIlist; i++) {
                    if (
                        ciNames.get('instance/tsi.ci.name/tsi.ci.name[' + i + ']')
                        && ciNames.get('instance/tsi.ci.name/tsi.ci.name[' + i + ']') !== 'DUMMYCI'
                    ) {
                        if (!ciMap.has(adminGroups.get('instance/tsi.ci.admin.group/tsi.ci.admin.group[' + i + ']'))) {
                            ciMap.set(adminGroups.get('instance/tsi.ci.admin.group/tsi.ci.admin.group[' + i + ']'), []);
                        }

                        ciMap
                            .get(adminGroups.get('instance/tsi.ci.admin.group/tsi.ci.admin.group[' + i + ']'))
                            .push(ciNames.get('instance/tsi.ci.name/tsi.ci.name[' + i + ']'));
                    }
                }
            } else if ([
                'tsi.IM.open.incident',
                'tsi.IM.update.incident',
                'tsi.IM.close.incident',
                'tsi.PM.problem'
            ].includes(win.tpz_scForm)) {
                const ciNames = SMweb.getAllFieldValues('instance/tsi.cilist/tsi.cilist');

                const CIs = SMweb.getAllFieldValues('instance/tsi.cilist/tsi.cilist');
                let i = 0;
                do {
                    i++;

                    if (exists(SMweb, 'cache', ciNames.get('instance/tsi.cilist/tsi.cilist[' + i + ']/tsi.list.ci.name'), 'portfolio', 0)) {
                        adminGroup = SMweb.cache[ciNames.get('instance/tsi.cilist/tsi.cilist[' + i + ']/tsi.list.ci.name')].portfolio[0]['IncidentAG.Name'];
                    } else {
                        adminGroup = SMweb.getFieldValue('instance/assignment');
                    }

                    if (
                        ciNames.get('instance/tsi.cilist/tsi.cilist[' + i + ']/tsi.list.ci.name') &&
                        ciNames.get('instance/tsi.cilist/tsi.cilist[' + i + ']/tsi.list.ci.name') !== 'DUMMYCI'
                    ) {
                        if (!ciMap.has(adminGroup)) {
                            ciMap.set(adminGroup, []);
                        }

                        ciMap
                            .get(adminGroup)
                            .push(ciNames.get('instance/tsi.cilist/tsi.cilist[' + i + ']/tsi.list.ci.name'));
                    }
                    if (i === 1000) {
                        break;
                    }
                } while (CIs.get('instance/tsi.cilist/tsi.cilist[' + i + ']/tsi.list.ci.name') !== '');
            }
        }

        Array.from(ciMap.keys()).forEach(group => {
            ciMap.set(
                group,
                Array.from(new Set(ciMap.get(group))).sort((a, b) =>
                    cmp(a.toLowerCase(), b.toLowerCase())
                )
            );
        });

        return new Map([...ciMap].sort((a, b) => cmp(a[0], b[0])));
    };

    // Removes actions form CI menu
    const removeActions = function(ciActions, ciActionsContent) {
        while (ciActionsContent.firstChild) ciActionsContent.removeChild(ciActionsContent.firstChild);
    };

    // Creates actions in CI menu
    const fillActions = async function(ciActions, ciActionsContent, ciListLength, ciMap) {
        const tab = top.cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        if (dt === 'detail' || dt === 'listdetail' || dt === 'list') {

            let template = top.document.createElement('template');
            template.innerHTML = '<[ collect data ]>';
            ciActionsContent.appendChild(template.content);

            let html = '<[ no data ]>';
            if (ciListLength > 0) {
                html = `
                    <div class="action-group">
                        <div class="cilist_copybtn" title="Click to copy all CIs">Copy all CIs (${ ciListLength })</div>
                    </div>
                    <div class="action-group">
                        <div id="ciList">
                        <table id="citable" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
                            <colgroup><col class="hostName"></colgroup>
                            <tbody>
                        </div>`;

                Array.from(ciMap.keys()).sort().forEach(group => {
                    const ciList = ciMap.get(group);
                    //html += '<div class="action_group">';
                    if (group !== '') {
                        html += `<tr><td colspan="2" class="groupName" title="Copy CIs belonging to this group">${group} (${ciList.length})</td></tr>`;
                    }

                    const hostReg = new RegExp('^(\\S+)(?:\\s+\\(([^)]+)\\))?$'); // S... APPL... A...
                    let hostName;
                    html += ciList.reduce((h, ci) => {
                        [, hostName, ] = hostReg.exec(ci) || [];

                        if (typeof hostName === 'undefined') {
                            const tempCIname = ci.substring(0, ci.lastIndexOf('('));

                            if (tempCIname.length === 0) {
                                hostName = 'not valid CI';
                            } else {
                                hostName = ci.substring(0, ci.lastIndexOf('('));
                            }
                        }
                        h += `
                            <tr>
                                <td class="hostName" amGroup="${group}">
                                    <a href="https://t-rep.t-systems.com/2/search/!${hostName}" target="_blank" title="Lookup in T-REP">${hostName}</a>
                                </td>
                                <td class="auditServer">
                                    <a href="https://auditserver.telekom.de/SarahEE-war/faces/asrv/audit2.jsp?aagtId=11&aaiName=${group}&nodefilter=${hostName}" target="_blank" title="Lookup on Auditserver">Auditserver</a>
                                </td>
                            </tr>`;
                        //h += '</div>';

                        return h;
                    }, '');
                });

                html += '</tbody></table></div>';
            }

            template = top.document.createElement('template');
            template.innerHTML = html;
            ciActionsContent.appendChild(template.content);
            ciActionsContent.firstChild.remove();

            const fixedCells = function() {
                const left = this.scrollLeft + 'px';
                const top = this.scrollTop + 'px';

                const table = document.querySelector('#ciList table');
                const cols = +table.getAttribute('fixedCols') || 0;
                const rows = +table.getAttribute('fixedRows') || 0;

                this.querySelectorAll('#ciList > table > * > tr > td').forEach(el => {

                    if (el.parentElement.rowIndex < rows && el.cellIndex < cols) {
                        el.style.transform = `translate( ${left}, ${top} )`;
                    } else if (el.parentElement.rowIndex < rows) {
                        el.style.transform = `translate( 0      , ${top} )`;
                    } else if (el.cellIndex < cols) {
                        el.style.transform = `translate( ${left}, 0      )`;
                    }

                    el.style.position = 'relative';
                    el.style.zIndex = 2 * (el.parentElement.rowIndex < rows) + (el.cellIndex < cols);

                    el.classList.toggle('bottomBorder', el.parentElement.rowIndex + el.rowSpan === rows);
                    el.classList.toggle('rightBorder', el.cellIndex + el.colSpan === cols);
                });
            };

            template = document.getElementById('ciList');
            if (template) {
                fixedCells.call(template);
                template.addEventListener('scroll', fixedCells);
            }
        }
    };

    // Copies text in parameter to clipboard
    async function copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    // Copies CI list for group
    function copyCiList(groupName) {
        let selector = '#ciList td.hostName';
        if (groupName) selector += `[amGroup="${groupName}"]`;

        const hostNames = Array.from(top.document.querySelectorAll(selector));

        hostNames.map(x => x.classList.add('activate'));
        setTimeout(() => hostNames.map(x => x.classList.remove('activate')), 500);

        copyTextToClipboard(hostNames.map(x => x.innerText).join('\n'));
    }

    // Checks if CIs are present in ciMap
    function checkIfTheresAnyCI() {
        return new Promise((resolve, reject) => {
            const returnValues = [];
            if (SMweb.isDetailOrListDetailPage()) {
                const ciMap = getCiMap(),
                    allCIName = [];
                Array.from(ciMap.keys()).forEach(group => {
                    ciMap.get(group).forEach(ci => allCIName.push(ci));
                });

                const ciListLength = allCIName.length;

                if (ciListLength > 0) {
                    returnValues.push(ciListLength);
                    returnValues.push(ciMap);
                    resolve(returnValues);
                } else {
                    reject();
                }
            }
        });
    }

    // Makes CI actions clickable
    function enableCIActions(enable){
        const actions = document.getElementById('ciActions');
        enable = enable && !SMweb.actionRunner.isActionInProgress();
        actions.classList.toggle('inactive', !enable);
    }

    // Adds the CI dropdown button and menu to the extension header
    SMweb.createDropdown({
        id: 'ciActions',
        title: 'Config Item',

        view: function() {},
        hide: function() {},
        continuous: function(ciActions, ciActionsContent) {
            ciActions.className = 'cmdbarbuttons inactive';

            const wrapperTemp = document.getElementById('ciActions-wrapper');
            wrapperTemp.title = 'Activate this menu by opening a ticket';

            checkIfTheresAnyCI().then((sum) => {
                removeActions(ciActions, ciActionsContent);
                fillActions(ciActions, ciActionsContent, sum[0], sum[1]);
                enableCIActions(true);
                wrapperTemp.title = '';
            }).catch(() => {
                enableCIActions(false);
            });
        },

        clickHandler: function(ciActions, ciActionsContent, ev) {
            ev.srcElement.classList.add('activate');
            setTimeout(() => ev.srcElement.classList.remove('activate'), 500);

            if (ev.srcElement.classList.contains('groupName')) {
                const regMatch = /^(\S+)/.exec(ev.srcElement.innerText);
                const groupName = regMatch ? regMatch[1] : undefined;
                copyCiList(groupName);
                ev.preventDefault();
                ev.stopPropagation();
            } else if (ev.srcElement.classList.contains('cilist_copybtn')) {
                copyCiList();
            }

            return true;
        }
    });


    // Listens for starting actions. We don't need to listen to ticketActionEnd because 'continuous()' above will be called again.
    document.documentElement.addEventListener('ticketActionStart', function(){
        enableCIActions(false);
    });
});


