addPlugin('MainPage', 'complete', function () {
    class ActionPopupManager {
        setTicketGetter(getter) {
            this.ticketGetter = () => getter(this.tickets);
        }
        async show(action, tickets) {
            if (!this.popup) {
                await this.init();
            }
            this.tickets = tickets.map((ticket) => ticket.number);
            const actions = await SMweb.getActions();
            this.popup.show(tickets, actions, action);
        }
        refreshTickets(action) {
            const body = Util.get('#a-popup-body');
            if (body) {
                this.show(action, this.ticketGetter());
            }
        }
        async init() {
            const contentDiv = await SMweb.loadComponent('ActionPopup');
            contentDiv.id = 'a-popup';
            const viewSize = Ext.getBody().getViewSize();
            const size = {
                width: 1084,
                height: Math.max(400, viewSize.height * 0.8),
                minHeight: 800,
            };
            this.popup = new ActionPopup(contentDiv, size);
            this.addPopupListeners();
        }
        addPopupListeners() {
            this.popup.on('close', this.handleClose.bind(this));
            this.popup.on('run', this.handleRun.bind(this));
            this.popup.on('save', this.handleSave.bind(this));
            this.popup.on('saveAndRun', this.handleSaveAndRun.bind(this));
            this.popup.on('show', this.handleShow.bind(this));
            this.popup.on('removeAction', this.handleRemoveAction.bind(this));
            this.popup.on('renameAction', this.handleRenameAction.bind(this));
            this.popup.on('cancelAction', this.handleCancelAction.bind(this));
            document.documentElement.addEventListener('ticketActionStart', this.handleTicketActionStart.bind(this));
            document.documentElement.addEventListener('ticketActionEnd', this.handleTicketActionEnd.bind(this));
            SMweb.actionRunner.on('actionProgressUpdate', this.handleProgressUpdate.bind(this));
        }
        handleCancelAction() {
            SMweb.actionRunner.cancelAction();
        }
        handleClose() {
            SMweb.enableTicketActions(true);
            delete this.popup;
        }
        handleRun(ev) {
            var _a;
            const action = ev.target;
            if (action) {
                SMweb.actionRunner.run(action, this.popup.getSelectedTickets(), (_a = ev.detail) === null || _a === void 0 ? void 0 : _a.exitAfterRun);
            }
        }
        async handleSave(ev) {
            var _a;
            const actions = await SMweb.getActions();
            const newAction = ev.target;
            newAction.setTitle(newAction.title.trim());
            const currentActionTitle = (_a = this.popup.getSelectedAction()) === null || _a === void 0 ? void 0 : _a.title;
            let overwrite = false, isDuplicate = false;
            for (const action of actions) {
                if (action.title === newAction.title &&
                    currentActionTitle === newAction.title) {
                    overwrite = true;
                    break;
                }
                else if (action.title === newAction.title) {
                    isDuplicate = true;
                }
            }
            if (isDuplicate) {
                this.displaySaveResult(newAction.title, false);
                return false;
            }
            if (overwrite) {
                const actionIndex = actions.findIndex((a) => a.title === newAction.title);
                actions.splice(actionIndex, 1);
            }
            actions.push(newAction);
            try {
                this.saveActions(actions);
            }
            catch (err) {
                this.displaySaveResult(newAction.title, false);
                return;
            }
            this.popup.setActions(actions);
            this.popup.setSelectedAction(newAction);
            this.displaySaveResult(newAction.title, true);
            return true;
        }
        async handleSaveAndRun(ev) {
            const success = await this.handleSave(ev);
            if (success) {
                this.handleRun(ev);
            }
        }
        handleShow() {
            SMweb.enableTicketActions(false);
        }
        async handleRenameAction(ev) {
            if (!ev.detail || !ev.detail.newTitle.trim()) {
                return;
            }
            const oldTitle = ev.target.title;
            const newTitle = ev.detail.newTitle.trim();
            const actions = await SMweb.getActions();
            const action = actions.find((a) => a.title === oldTitle);
            const isNewTitleInUse = actions.some((a) => a.title === newTitle);
            if (!action || isNewTitleInUse) {
                this.displayRenameResult(oldTitle, newTitle, false);
                return;
            }
            action.setTitle(newTitle.trim());
            try {
                this.saveActions(actions);
            }
            catch (err) {
                this.displayRenameResult(oldTitle, newTitle, false);
                return;
            }
            this.popup.setActions(actions);
            this.displayRenameResult(oldTitle, newTitle, true);
            if (ev.detail.isSelected) {
                this.popup.setSelectedAction(action);
            }
        }
        async handleRemoveAction(ev) {
            const action = ev.target;
            const title = action.title;
            let actions = await SMweb.getActions();
            actions = actions.filter((a) => a.title !== action.title);
            try {
                this.saveActions(actions);
            }
            catch (err) {
                this.displayRemoveResult(title, false);
                return;
            }
            this.popup.setActions(actions);
            this.displayRemoveResult(title, true);
        }
        handleTicketActionStart() {
            if (this.popup) {
                this.runningAction = this.popup.getCurrentAction();
                this.popup.setBodyEnabled(false);
                this.popup.setRunSaveEnabled(false);
                this.popup.showRunInfoDisplay();
                this.popup.setAbortDisplay(true);
                this.popup.hideInvalidTickets(true);
                setTimeout(() => this.popup.setAbortEnabled(true), 100);
            }
        }
        handleTicketActionEnd() {
            if (this.popup) {
                this.popup.setBodyEnabled(true);
                this.popup.setRunSaveEnabled(true);
                this.popup.hideInfoDisplays();
                this.popup.setAbortDisplay(false);
                this.popup.setAbortEnabled(false);
                this.popup.hideInvalidTickets(false);
                setTimeout(() => this.refreshTickets(this.runningAction), 210);
            }
            this.runningAction = undefined;
        }
        handleProgressUpdate(ev) {
            const currentTicket = ev.detail.currentTicket;
            const ticketCount = ev.detail.ticketCount;
            this.popup.updateActionRunProgress(currentTicket, ticketCount);
        }
        saveActions(actions) {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(SMweb.extensionId, {
                    request: 'storage.set',
                    Rules: JSON.parse(JSON.stringify(actions)),
                }, (message) => {
                    if (message.lastError) {
                        reject(new Error(message.lastError));
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        displaySaveResult(title, success) {
            title = `${title}`;
            if (success) {
                Notifier.success(`${title} saved successfully!`);
            }
            else {
                Notifier.error(`Failed to save ${title}`);
            }
        }
        displayRenameResult(title, title2, success) {
            title = `<strong>${title}</strong>`;
            title2 = `<strong>${title2}</strong>`;
            if (success) {
                Notifier.success(`${title} renamed to ${title2} successfully!`);
            }
            else {
                Notifier.error(`Failed to rename ${title} to ${title2}`);
            }
        }
        displayRemoveResult(title, success) {
            title = `<strong>${title}</strong>`;
            if (success) {
                Notifier.success(`${title} removed successfully`);
            }
            else {
                Notifier.error(`Failed to remove ${title}`);
            }
        }
    }
    SMweb.actionPopup = new ActionPopupManager();
});
