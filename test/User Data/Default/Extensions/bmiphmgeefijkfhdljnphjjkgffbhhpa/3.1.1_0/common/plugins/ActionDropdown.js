addPlugin('MainPage', 'complete', function () {
    const TicketSelectionReminder = 'Please select one or more tickets.';
    // const InvalidSelectionError = 'This action cannot be run on the selected ticket.';
    const InvalidListError = 'This action cannot be run on any tickets in the current list.';

    // Make hasOwnProperty checks more readable
    const hasProperty = (obj, property) => Object.prototype.hasOwnProperty.call(obj, property);

    let actionScripts = new Map();
    let encoder;

    const encodeHTML = function (string) {
        if (!encoder) {
            encoder = document.createElement('div');
        }
        encoder.textContent = string;
        const result = encoder.innerHTML;
        encoder.textContent = '';

        return result;
    };

    const copyTextToClipboard = async function (text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error(err);
        }
    };

    const addIncidentActions = async function () {
        const groups = [];
        if (SMweb.isDetailOrListDetailPage()) {
            const ticketId = SMweb.getFieldValue('instance/number');
            const ticketTitle = SMweb.getFieldValue('instance/brief.description');
            const headerObj = {
                title: ticketId + ' – ' + encodeHTML(ticketTitle),
                className: 'title',
                callback: function (element) {
                    element.addEventListener('click', function () {
                        copyTextToClipboard(element.title);
                        element.classList.toggle('activate', true);
                        setTimeout(() => element.classList.toggle('activate', false), 500);
                    });
                }
            };
            // scripts.set(headerTitle, headerObj);
            groups.push([headerObj]);

            const returnToSender = {
                title: 'Return to sender: (seeking AG...)',
                className: 'inactive',
                noPopup: true,
                action: null,
                callback: element => {
                    SMweb.waitUntil(function() {
                        const tab = top.cwc.getActiveTab();
                        const win = tab.getDetailFrameWindow() || tab.getFrameWindow();
                        // This comes from SenderAGWorker.js
                        if (!hasProperty(win, 'senderAG')) {
                            return false;
                        }
                        if (win.senderAG) {
                            const title = 'Return to sender: ' + win.senderAG;
                            returnToSender.action = new Action(title);
                            returnToSender.action.addOperation(new AssignOperation(win.senderAG));
                            element.textContent = title;
                            element.classList.remove('inactive');
                            actionScripts.set(title, returnToSender);
                        } else {
                            const actionGroup = element.parentElement;
                            element.remove();
                            if (actionGroup.children.length === 0){
                                actionGroup.remove();
                            }
                        }
                        return true;
                    });
                }
            };
            groups.push([returnToSender]);
        } else {
            const acceptAllOpen = {
                ignoreSelection: true,
                noPopup: true,
                action: new Action('ACCEPT: all open IMs')
            };
            const acceptOp = new StatusUpdateOperation(Operation.TicketStatus.Accepted);
            acceptAllOpen.action.addOperation(acceptOp);
            acceptAllOpen.action.setAllowedStates([Operation.TicketStatus.Open]);
            actionScripts.set(acceptAllOpen.action.title, acceptAllOpen);
            groups.push([acceptAllOpen]);
        }

        const savedGroup = await addSavedActions();
        if (savedGroup.length) {
            groups.push(savedGroup);
        }

        const addText = '<span class="icon_plus">+</span>Ticket Action Wizard';
        const openActionWizard = {
            title: addText,
            action: new Action(),
        };
        actionScripts.set(addText, openActionWizard);
        groups.push([openActionWizard]);
        return groups;
    };

    const addSavedActions = async function () {
        const actionGroup = [];
        const actions = await SMweb.getActions();
        actions.forEach(action => {
            const actionWrapper = {
                action: Action.from(action)
            };
            actionScripts.set(encodeHTML(action.title), actionWrapper);
            actionGroup.push(actionWrapper);
        });

        return actionGroup;
    };

    const removeActions = function (detailActions, detailActionsContent) {
        actionScripts = new Map();
        while (detailActionsContent.firstChild) {
            detailActionsContent.removeChild(detailActionsContent.firstChild);
        }
    };

    const fillActions = function (dropdownContent, actionGroups) {
        const callbacks = [];
        const actionGroupDiv = document.createElement('div');
        actionGroupDiv.className = 'action-group';

        actionGroups.forEach((group, i) => {
            const container = actionGroupDiv.cloneNode();
            callbacks.push(...addActionGroup(group, container));
            dropdownContent.appendChild(container);
            if (i < actionGroups.length) {
                // add separator
            }
        });

        document.getElementById('detailActions-wrapper').title = '';
        cropHeaderText(dropdownContent);
        for (let i = 0; i < callbacks.length; i++) {
            callbacks[i]();
        }
    };

    const addActionGroup = function (actionGroup, container) {
        const callbacks = [];
        actionGroup.forEach(actionWrapper => {
            const divElement = document.createElement('div');
            divElement.innerHTML = actionWrapper.title || actionWrapper.action.title;
            if (actionWrapper.className) {
                divElement.className = actionWrapper.className;
            }
            const callback = actionWrapper.callback;
            if (callback && typeof callback === 'function') {
                callbacks.push(callback.bind(actionWrapper, divElement));
            }
            container.appendChild(divElement);
        });

        return callbacks;
    };

    /**
     * Crop the dropdown header's text until it's shorter than the longest
     * action title.
     */
    const cropHeaderText = function (dropdownContent) {
        if (!SMweb.isDetailOrListDetailPage()) {
            return;
        }
        const actionGroupDivs = dropdownContent.children;
        const header = actionGroupDivs[0].children[0];
        let text = header.textContent;
        let width = header.offsetWidth;
        let maxWidth = 0;
        header.textContent = '';
        maxWidth = actionGroupDivs[1].children[0].offsetWidth;
        header.title = text;
        if (width <= maxWidth) {
            header.textContent = text;
        } else {
            while (text.length > 0 && width > maxWidth) {
                text = text.substr(0, text.length - 1);
                header.textContent = text + '…';
                width = header.offsetWidth;
            }
        }
    };

    const isIncidentClosed = function () {
        return SMweb.getFieldValue('instance/problem.status') === 'Closed';
    };

    const enableTicketActionsIfNeeded = function () {
        if (!SMweb.isIncidentPage() || isIncidentClosed()) {
            return;
        }

        if (SMweb.isDetailOrListDetailPage()) {
            SMweb.enableTicketActions(true);
        } else if (SMweb.isListOrListDetailPage()) {
            const lf = top.cwc.getActiveTab().getFrameWindow();
            if (isIncidentVisibleOnPage()) {
                SMweb.enableTicketActions(true);
            }

            const rl = lf.Ext.getCmp('recordListGrid');
            const view = rl.getView();
            // On queue load groupcollapsed event is not populated. This way
            // we prevent adding redundant listeners
            if (!(view.events.groupcollapsed instanceof lf.Ext.util.Event)) {
                view.events.refresh.addListener(() => {
                    if (isIncidentVisibleOnPage()) {
                        SMweb.enableTicketActions(true);
                    }
                });
                view.events.groupcollapsed = new lf.Ext.util.Event(view, 'groupcollapsed');
                view.events.groupcollapsed.addListener(
                    () => SMweb.enableTicketActions(false)
                );

                view.events.groupexpanded = new lf.Ext.util.Event(view, 'groupexpanded');
                view.events.groupexpanded.addListener(expandedGroupNode => {
                    if (expandedGroupNode.firstChild.attributes.rec.data.isLeaf) {
                        SMweb.enableTicketActions(true);
                    }
                });
            }
        }
    };

    const getExpandedTicketGroups = function () {
        const tab = top.cwc.getActiveTab();
        const rl = tab.getFrameWindow().Ext.getCmp('recordListGrid');

        let groupIds;
        if (rl && rl.view.expandedGroupNode) {
            groupIds = [{
                id: rl.view.expandedGroupNode.attributes.rec.data.groupId,
                value: rl.view.expandedGroupNode.attributes.rec.data.groupValue
            }];
            let parent = rl.view.expandedGroupNode.parentNode;
            while (parent.id !== 'root') {
                groupIds.push({
                    id: parent.attributes.rec.data.groupId,
                    value: parent.attributes.rec.data.groupValue
                });
                parent = parent.parentNode;
            }
        }

        return groupIds;
    };

    const getSelectedRecords = function (actionObj) {
        let selectedRecords;
        if (SMweb.isDetailOrListDetailPage()) {
            selectedRecords = [{
                number: SMweb.getFieldValue('instance/number'),
                brief_description: SMweb.getFieldValue('instance/brief.description'),
                problem_status: SMweb.getFieldValue('instance/problem.status'),
                // Add more fields as needed
            }];
        } else {
            const groups = getExpandedTicketGroups();
            selectedRecords = SMweb.getRecordListData();
            selectedRecords = selectedRecords.filter(function (item) {
                // True if not a group record
                if (item && !item.isLeafGroup) {
                    // True if the record has no parent (not on a groupView)
                    // or its parent is expanded (the user is working on it)
                    const isVisibleOnPage = !item.parentKey ||
                        selectedRecords.find(x => item.parentKey === x._ID_).isExpanded;

                    if (!isVisibleOnPage) {
                        return false;
                    }
                    if (actionObj.ignoreSelection || item._SELECTED_) {
                        item.groups = groups;

                        // When we skip the popup we need to filter status
                        if (actionObj.noPopup) {
                            return actionObj.action.isTicketStatusValid(item) === Action.Validity.Valid;
                        }
                        return true;
                    }
                }
                return false;
            });
        }

        return selectedRecords;
    };

    const getTicketsById = function (ticketIds) {
        const obj = {
            ignoreSelection: true
        };
        return getSelectedRecords(obj)
            .filter(ticket => ticketIds.includes(ticket.number));
    };

    /**
     * Returns true if there's at least one incident visible on page.
     */
    const isIncidentVisibleOnPage = function () {
        const obj = {
            ignoreSelection: true
        };
        return getSelectedRecords(obj).length > 0;
    };

    const showSelectionError = function (text, x, y) {
        let reminder = document.getElementById('detailActions-error');
        if (!reminder) {
            reminder = document.createElement('div');
            reminder.id = 'detailActions-error';
            reminder.className = 'menu floating-error';
            document.body.appendChild(reminder);
        }

        reminder.textContent = text;
        reminder.style.left = x + 18 + 'px';
        reminder.style.top = y - 33 + 'px';
        reminder.style.display = 'block';

        // Avoid multiple timers running, causing flickering on rapid clicks
        clearTimeout(reminder.getAttribute('displayTimer'));
        const timer = setTimeout(() => {
            reminder.style.display = 'none';
        }, 1666);
        reminder.setAttribute('displayTimer', timer);
    };

    SMweb.createDropdown({
        id: 'detailActions',
        title: 'Ticket Actions',

        view: async function (detailActions, detailActionsContent) {
            removeActions(detailActions, detailActionsContent);
            let actionGroups;
            if (SMweb.isIncidentPage()) {
                actionGroups = await addIncidentActions();
            }
            fillActions(detailActionsContent, actionGroups);
        },
        hide: function() {},
        continuous: async function() {
            const temp = document.getElementById('detailActions');
            temp.className = 'cmdbarbuttons inactive';

            const wrapperTemp = document.getElementById('detailActions-wrapper');
            wrapperTemp.title = 'Activate this menu by opening an Incident Ticket or Incident Queue';

            try {
                await SMweb.waitUntil(() => top.cwc && top.cwc.centerPanelId && Ext.getCmp(top.cwc.centerPanelId), 30000);
            } catch (err) {
                if (err.message !== CancellationToken.CANCELLED) {
                    console.error(err);
                }
            }
            await enableTicketActionsIfNeeded();
        },

        clickHandler: async function (detailActions, detailActionsContent, ev) {
            const title = ev.target.value || ev.target.innerHTML;
            const actionObj = actionScripts.get(title);
            if (!actionObj) {
                return;
            }

            const selectedRecords = getSelectedRecords(actionObj);
            if (actionObj.noPopup) {
                if (selectedRecords.length > 0) {
                    SMweb.actionRunner.run(actionObj.action, selectedRecords);
                } else {
                    if (actionObj.ignoreSelection) {
                        showSelectionError(InvalidListError, ev.clientX, ev.clientY);
                    } else {
                        showSelectionError(TicketSelectionReminder, ev.clientX, ev.clientY);
                    }
                }
            } else {
                SMweb.actionPopup.show(actionObj.action, selectedRecords);
            }
            setTimeout(() => {
                detailActionsContent.classList.remove('hover');
            }, 10);
        }
    });

    document.documentElement.addEventListener('ticketActionStart', function () {
        SMweb.enableTicketActions(false);
    });
    document.documentElement.addEventListener('ticketActionEnd', function () {
        SMweb.enableTicketActions(true);
    });

    setTimeout(() => SMweb.actionPopup.setTicketGetter(getTicketsById), 200);
});
