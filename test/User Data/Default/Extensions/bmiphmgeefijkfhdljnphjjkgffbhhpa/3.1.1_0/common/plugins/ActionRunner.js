class ActionRunner extends EventEmitter {
    constructor() {
        super(...arguments);
        this.actionInProgress = false;
    }
    startActions() {
        this.actionInProgress = true;
        SMweb.actionCancellationToken = new CancellationToken();
        document.documentElement.dispatchEvent(new Event('ticketActionStart'));
    }
    stopActions() {
        this.actionInProgress = false;
        delete SMweb.actionCancellationToken;
        document.documentElement.dispatchEvent(new Event('ticketActionEnd'));
    }
    actionProgressUpdate(currentTicket, ticketCount, action) {
        if (this.actionInProgress) {
            this.fireEvent({
                target: action,
                type: 'actionProgressUpdate',
                detail: {
                    currentTicket: currentTicket,
                    ticketCount: ticketCount
                },
            });
        }
    }
    getTicketIdKey() {
        const listFrame = SMweb.getListFrameWindow();
        return listFrame.listConfig.keys.replace(/\./g, '_');
    }
    async runAction(action, ticket, exitAfterRun = true) {
        var _a, _b;
        if (action.isTicketStatusValid(ticket) === Action.Validity.Invalid) {
            return false;
        }
        const callbackMap = {};
        let incidentClosed = false;
        for (const op of action.operations) {
            (_a = SMweb.actionCancellationToken) === null || _a === void 0 ? void 0 : _a.throwIfCancelled();
            const obj = SMweb.OpImpl.getImplementation(op);
            SMweb.OpImpl.assignOperationCallbacks(callbackMap, obj);
            const success = await obj.run();
            if (!success) {
                return false;
            }
            if (op.type === Operation.Type.CloseIncident) {
                incidentClosed = true;
            }
        }
        (_b = SMweb.actionCancellationToken) === null || _b === void 0 ? void 0 : _b.throwIfCancelled();
        if (exitAfterRun) {
            if (incidentClosed) {
                return this.exitWithCancel();
            }
            await this.saveAndExitIncident();
        }
        else {
            await this.saveIncident();
        }
        return this.runCallbacks(callbackMap.aftersave);
    }
    async runCallbacks(callbacks) {
        var _a;
        if (!callbacks) {
            return false;
        }
        for (const callback of callbacks) {
            if (callback && typeof callback === 'function') {
                (_a = SMweb.actionCancellationToken) === null || _a === void 0 ? void 0 : _a.throwIfCancelled();
                const success = await callback();
                if (!success) {
                    return false;
                }
            }
        }
        return true;
    }
    async expandGroupBranch(groups) {
        if (!groups || groups.length === 0) {
            return;
        }
        const frameWindow = SMweb.getListFrameWindow();
        const recordList = frameWindow.Ext.getCmp('recordListGrid');
        let currentLevel = recordList.groupModel.rootNode.childNodes;
        for (let i = groups.length - 1; i >= 0; i--) {
            const groupNode = currentLevel.find(function (node) {
                return (node.attributes.rec.data.groupId === groups[i].id &&
                    node.attributes.rec.data.groupValue === groups[i].value);
            });
            recordList.view.expandGroup(groupNode);
            if (groupNode.childNodes.length === 0) {
                await SMweb.waitForEvent('forceUnmaskWindow');
            }
            currentLevel = groupNode.childNodes;
        }
    }
    async runActionOnList(action, tickets) {
        var _a, _b;
        const tab = cwc.getActiveTab();
        const key = this.getTicketIdKey();
        for (let i = 0; i < tickets.length && tab === cwc.getActiveTab(); i++) {
            (_a = SMweb.actionCancellationToken) === null || _a === void 0 ? void 0 : _a.throwIfCancelled();
            const ticket = tickets[i];
            this.actionProgressUpdate(ticket, tickets.length, action);
            await this.expandGroupBranch(ticket.groups);
            (_b = SMweb.actionCancellationToken) === null || _b === void 0 ? void 0 : _b.throwIfCancelled();
            if (await this.selectRow(ticket[key])) {
                await this.runAction(action, ticket);
                await SMweb.waitUntil(() => tab === cwc.getActiveTab());
                await SMweb.waitUntil(SMweb.isListPage);
                await Util.delay(2000);
            }
            else {
                console.error('Row selection failed.', ticket);
            }
        }
        if (tab === cwc.getActiveTab()) {
            return;
        }
        const win = SMweb.getDetailFrameWindow() || SMweb.getListFrameWindow();
        console.error('Stuck on a different tab', win);
    }
    async selectRow(id) {
        const tab = cwc.getActiveTab();
        const listFrame = SMweb.getListFrameWindow();
        const recordList = listFrame.Ext.getCmp('recordListGrid');
        const records = recordList.store.data.items;
        const selModel = recordList.getSelectionModel();
        const key = this.getTicketIdKey();
        let rowId;
        if (typeof id !== 'number') {
            rowId = records.findIndex((x) => x.data[key] === id);
            if (rowId === -1) {
                console.error('Ticket row not found:', id);
                return false;
            }
        }
        if (SMweb.isListDetailPage() || tab.title.includes(id)) {
            return false;
        }
        selModel.selectRow(rowId);
        recordList.view.ensureVisible(rowId, 0, false);
        recordList.drilldown(rowId);
        await SMweb.waitForEvent('forceUnmaskWindow');
        await SMweb.waitUntil(() => SMweb.getField('instance/problem.status'));
        await Util.delay(750);
        return true;
    }
    async exitWithCancel() {
        let success;
        do {
            success = await SMweb.OpImpl.topToolbarClick('Cancel');
            await Util.delay(2000);
        } while (success && SMweb.topToolbarFind('Save & Exit'));
        return success;
    }
    async saveAndExitIncident() {
        let success;
        do {
            success = await SMweb.OpImpl.topToolbarClick('Save & Exit');
            await Util.delay(2000);
        } while (success && SMweb.topToolbarFind('Save & Exit'));
        return success;
    }
    async saveIncident() {
        SMweb.OpImpl.topToolbarClick('Save');
        await SMweb.waitForEvent('forceUnmaskWindow');
    }
    async run(action, tickets, exitAfterRun) {
        if (!action) {
            return;
        }
        try {
            this.startActions();
            if (SMweb.isDetailOrListDetailPage()) {
                await this.runAction(action, tickets[0], exitAfterRun);
            }
            else if (tickets) {
                await this.runActionOnList(action, tickets);
            }
        }
        catch (err) {
            if (err.message !== CancellationToken.CANCELLED) {
                throw err;
            }
        }
        finally {
            this.stopActions();
        }
    }
    cancelAction() {
        var _a;
        (_a = SMweb.actionCancellationToken) === null || _a === void 0 ? void 0 : _a.cancel();
    }
    isActionCancelled() {
        var _a;
        return (_a = SMweb.actionCancellationToken) === null || _a === void 0 ? void 0 : _a.isCancelled();
    }
    isActionInProgress() {
        return this.actionInProgress;
    }
}
SMweb.actionRunner = new ActionRunner();
