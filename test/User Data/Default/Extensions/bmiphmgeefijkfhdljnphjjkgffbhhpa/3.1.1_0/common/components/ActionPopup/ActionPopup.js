class ActionPopup extends EventEmitter {
    constructor(content, size) {
        super();
        this.exitAfterRun = true;
        const instanceSpecific = {
            width: size.width,
            height: size.height,
            listeners: {
                show: this.createModalMask.bind(this),
                close: this.handleClose.bind(this)
            },
            items: {
                xtype: 'container',
                contentEl: content,
                listeners: {
                    afterrender: this.initPopup.bind(this)
                }
            }
        };
        const mergedConfig = { ...ActionPopup.ExtConfig, ...instanceSpecific };
        this.extWindow = new Ext.Window(mergedConfig);
        this.ticketManager = new TicketManager(this.toggleRunEnabled.bind(this));
    }
    show(tickets, actions, action) {
        this.extWindow.show();
        this.setTickets(tickets);
        this.setActions(actions);
        if (action) {
            this.setSelectedAction(action);
        }
        this.ticketManager.update();
        this.toggleExitCheckboxVisibility();
        this.toggleRunEnabled();
    }
    setRunSaveEnabled(enable) {
        const runSave = Util.get('.a-popup-run-save');
        runSave === null || runSave === void 0 ? void 0 : runSave.classList.toggle('disabled', !enable);
    }
    toggleRunEnabled() {
        var _a;
        const run = Util.get('.a-popup-button.run');
        const saveAndRun = Util.get('.a-popup-button.save-and-run');
        const hasTickets = this.ticketManager.getSelectedTicketCount() > 0;
        const hasOps = ((_a = this.currentAction) === null || _a === void 0 ? void 0 : _a.operations.length) > 0;
        const enable = hasTickets && hasOps && !this.editor.hasErrors();
        run === null || run === void 0 ? void 0 : run.classList.toggle('disabled', !enable);
        saveAndRun === null || saveAndRun === void 0 ? void 0 : saveAndRun.classList.toggle('disabled', !enable);
    }
    setBodyEnabled(enable) {
        var _a;
        (_a = Util.get('#a-popup-body')) === null || _a === void 0 ? void 0 : _a.classList.toggle('disabled', !enable);
    }
    showRunInfoDisplay() {
        var _a;
        this.hideInfoDisplays();
        (_a = Util.get('.a-popup-info.run')) === null || _a === void 0 ? void 0 : _a.classList.remove('hidden');
    }
    showAbortedInfoDisplay() {
        var _a;
        this.hideInfoDisplays();
        (_a = Util.get('.a-popup-info.aborted')) === null || _a === void 0 ? void 0 : _a.classList.remove('hidden');
    }
    hideInfoDisplays() {
        Util.getAll('.a-popup-info')
            .forEach(info => info.classList.add('hidden'));
    }
    setAbortDisplay(display) {
        const abortButton = Util.get('.a-popup-button.abort');
        abortButton.classList.toggle('hidden', !display);
        const runSave = Util.get('.a-popup-run-save');
        runSave.classList.toggle('hidden', display);
    }
    setAbortEnabled(enable) {
        const abortButton = Util.get('.a-popup-button.abort');
        abortButton.classList.toggle('disabled', !enable);
    }
    hideInvalidTickets(hide) {
        this.ticketManager.hideInvalid(hide);
    }
    setSelectedAction(action) {
        this.selectedAction = action;
        this.setCurrentAction(action);
        this.setSavePromptTitle(action.title);
        this.setPopupTitle(action.title || 'New Action');
        this.editor.setAction(action);
        this.highlightMenuElement(action);
    }
    getSelectedAction() {
        return this.selectedAction;
    }
    getCurrentAction() {
        return this.currentAction;
    }
    updateActionRunProgress(currentTicket, count) {
        this.ticketManager.setTicketInProgress(currentTicket);
    }
    toggleUnsavedMode(edited) {
        var _a;
        if (!edited && !this.selectedAction.equals(this.currentAction)) {
            edited = true;
        }
        let title = this.getPopupTitle();
        if (edited && !this.wasActionEdited) {
            title = '*' + title;
        }
        else if (!edited && this.wasActionEdited) {
            title = title.substring(1);
        }
        this.wasActionEdited = edited;
        const hasOps = ((_a = this.currentAction) === null || _a === void 0 ? void 0 : _a.operations.length) > 0;
        this.setSaveEnabled(edited && hasOps && !this.editor.hasErrors());
        this.setRunSaveEnabled(hasOps && !this.editor.hasErrors());
        this.setPopupTitle(title);
    }
    setSaveEnabled(enable) {
        const saveButtons = Util.get('.a-popup-save');
        saveButtons.classList.toggle('disabled', !enable);
    }
    setSaveOnlyMode(enable) {
        this.saveOnlyMode = enable;
        const runSaveComposite = Util.get('.a-popup-run-save');
        runSaveComposite.classList.toggle('save-only', enable);
        const savePrompt = Util.get('.a-popup-save');
        savePrompt.classList.toggle('open', enable);
    }
    isSaveOnlyModeEnabled() {
        return this.saveOnlyMode;
    }
    createActionMenu() {
        const menu = Util.get(this.container, '#a-popup-menu-elements');
        const elements = [];
        for (const action of this.actionList) {
            const element = this.createMenuElement(action);
            elements.push(element);
        }
        elements.forEach(el => menu.appendChild(el));
    }
    assignNewActionButtonHandler() {
        const button = Util.get(this.container, '#a-popup-new-action');
        const action = new Action();
        button.addEventListener('click', () => this.setSelectedAction(action));
    }
    createMenuElement(action) {
        const div = document.createElement('div');
        div.textContent = action.title;
        div.classList.add('a-popup-menu-element');
        const renameField = this.createRenameField(action);
        const actionOptions = this.createDottedMenu(div);
        const wrapper = document.createElement('div');
        wrapper.classList.add('a-popup-menu-element-wrapper');
        wrapper.appendChild(div);
        wrapper.appendChild(renameField);
        wrapper.appendChild(actionOptions);
        wrapper.addEventListener('click', () => {
            if (!wrapper.classList.contains('rename')) {
                this.setSelectedAction(action);
            }
        });
        return wrapper;
    }
    createRenameField(action) {
        const renameField = document.createElement('textarea');
        renameField.classList.add('a-popup-menu-element-rename');
        renameField.value = action.title;
        renameField.maxLength = 50;
        renameField.addEventListener('keydown', (ev) => {
            if (['Enter', 'Return', 'Escape'].includes(ev.key)) {
                ev.stopImmediatePropagation();
                renameField.blur();
            }
        });
        renameField.addEventListener('input', () => {
            this.updateTextareaHeight(renameField);
        });
        renameField.addEventListener('blur', () => {
            renameField.parentElement.classList.remove('rename');
        });
        return renameField;
    }
    createDottedMenu(actionEl) {
        const div = document.createElement('div');
        div.classList.add('a-popup-menu-element-more', 'dot-menu');
        this.assignDottedMenuOnClick(div);
        const span = document.createElement('span');
        span.classList.add('dot-menu-span');
        div.appendChild(span);
        const labelSpan = document.createElement('span');
        span.appendChild(labelSpan);
        div.appendChild(this.createDottedMenuContents(actionEl));
        return div;
    }
    closeDottedMenus() {
        for (const moreDiv of Util.getAll('.a-popup-menu-element-more')) {
            moreDiv.classList.remove('open');
        }
    }
    createDottedMenuContents(target) {
        const div = document.createElement('div');
        div.classList.add('operations');
        const renameDiv = document.createElement('div');
        const rename = document.createElement('span');
        rename.innerText = 'Rename';
        renameDiv.appendChild(rename);
        renameDiv.addEventListener('click', () => this.showRenameField(target, this.fireRenameEvent.bind(this)));
        const cloneDiv = document.createElement('div');
        const clone = document.createElement('span');
        clone.innerText = 'Clone';
        cloneDiv.appendChild(clone);
        cloneDiv.addEventListener('click', () => this.handleActionClone(target));
        const removeDiv = document.createElement('div');
        const remove = document.createElement('span');
        removeDiv.appendChild(remove);
        remove.innerText = 'Remove';
        removeDiv.addEventListener('click', () => this.handleActionRemove(target));
        div.appendChild(renameDiv);
        div.appendChild(cloneDiv);
        div.appendChild(removeDiv);
        return div;
    }
    assignDottedMenuOnClick(dottedMenu) {
        dottedMenu.onclick = (ev) => {
            ev.stopImmediatePropagation();
            if (dottedMenu.classList.contains('open')) {
                this.closeDottedMenus();
            }
            else {
                this.closeDottedMenus();
                dottedMenu.classList.add('open');
                const closeListener = this.closeDottedMenus.bind(this);
                document.addEventListener('click', closeListener, {
                    once: true
                });
            }
        };
    }
    assignButtonListeners() {
        const abort = Util.get('.a-popup-button.abort');
        const run = Util.get('.a-popup-button.run');
        const save = Util.get('.a-popup-button.save');
        const saveAndRun = Util.get('.a-popup-button.save-and-run');
        const title = Util.get('.a-popup-title');
        abort.onclick = this.onActionAbort.bind(this);
        run.onclick = this.onActionRun.bind(this);
        save.onclick = this.onActionSave.bind(this);
        saveAndRun.onclick = this.onActionSaveAndRun.bind(this);
        title.addEventListener('input', ev => {
            const target = ev.target;
            if (target.value !== this.selectedAction.title) {
                this.toggleUnsavedMode(true);
            }
            else {
                this.toggleUnsavedMode(false);
            }
        });
        this.assignShowSavePromptListener();
    }
    assignShowSavePromptListener() {
        const savePrompt = Util.get('.a-popup-save');
        const more = Util.get('.a-popup-button.more');
        more.onmousedown = (event) => {
            if (more.classList.contains('active'))
                return;
            event.stopImmediatePropagation();
            more.classList.add('active');
            savePrompt.classList.add('open');
            setTimeout(() => Util.get('.a-popup-title').focus(), 1);
        };
        const body = document.body;
        const listener = this.closeRunSaveMore.bind(this);
        body.addEventListener('mousedown', listener);
        this.on('close', () => body.removeEventListener('mousedown', listener));
    }
    closeRunSaveMore(event) {
        if (this.isSaveOnlyModeEnabled())
            return;
        const savePrompt = Util.get('.a-popup-save');
        const more = Util.get('.a-popup-button.more');
        const target = event === null || event === void 0 ? void 0 : event.target;
        if (!target || !savePrompt.contains(target)) {
            savePrompt.classList.remove('open');
            more.classList.remove('active');
        }
    }
    onActionAbort() {
        this.setAbortEnabled(false);
        this.showAbortedInfoDisplay();
        this.fireEvent({ type: 'cancelAction', target: undefined });
    }
    onActionRun() {
        this.fireEvent({
            type: 'run',
            target: this.currentAction,
            detail: {
                exitAfterRun: this.exitAfterRun
            }
        });
    }
    onActionSave() {
        const title = Util.get('.a-popup-title');
        title.value = title.value.trim();
        if (title.value === '') {
            Notifier.error('Please provide a title.');
            title.focus();
            return;
        }
        else if (title.value.length > 50) {
            Notifier.error('Maximum title length is 50 characters.');
            title.focus();
            return;
        }
        this.closeRunSaveMore();
        this.currentAction.setTitle(title.value);
        this.fireEvent({ type: 'save', target: this.currentAction });
    }
    onActionSaveAndRun() {
        const title = Util.get('.a-popup-title');
        title.value = title.value.trim();
        if (title.value.trim() === '') {
            Notifier.error('Please provide a title.');
            title.focus();
            return;
        }
        else if (title.value.length > 50) {
            Notifier.error('Maximum title length is 50 characters.');
            title.focus();
            return;
        }
        this.closeRunSaveMore();
        this.currentAction.setTitle(title.value);
        this.fireEvent({
            type: 'saveAndRun',
            target: this.currentAction,
            detail: {
                exitAfterRun: this.exitAfterRun
            }
        });
    }
    updateTextareaHeight(textarea) {
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseInt(computedStyle.lineHeight);
        textarea.style.height = lineHeight + 2 + 'px';
        if (textarea.offsetHeight < textarea.scrollHeight) {
            textarea.style.height = textarea.scrollHeight + 2 + 'px';
        }
    }
    showRenameField(actionEl, onblur) {
        const rename = Util.get(actionEl.parentElement, '.a-popup-menu-element-rename');
        rename.parentElement.classList.add('rename');
        rename.value = actionEl.textContent;
        rename.setSelectionRange(0, rename.value.length);
        this.updateTextareaHeight(rename);
        rename.focus();
        const action = this.findActionInActionList(actionEl.textContent);
        rename.addEventListener('blur', () => onblur(rename, action), {
            once: true
        });
    }
    fireRenameEvent(rename, action) {
        rename.value = this.sanitizeActionTitle(rename.value);
        const newTitle = rename.value;
        let error = true;
        if (action.title === newTitle) {
        }
        else if (this.isActionTitleTaken(newTitle)) {
            Notifier.error('This action title is taken.');
        }
        else if (newTitle.trim() === '') {
            Notifier.error('Please provide a title.');
        }
        else if (newTitle.length > 50) {
            Notifier.error('Maximum title length is 50 characters.');
        }
        else {
            error = false;
        }
        if (error)
            return;
        this.fireEvent({
            type: 'renameAction',
            target: action,
            detail: {
                newTitle: newTitle,
                isSelected: this.selectedAction.title === action.title
            }
        });
    }
    handleActionClone(target) {
        const action = this.findActionInActionList(target.textContent);
        const clone = Action.from(action);
        const titleSpit = action.title.split(' copy');
        const endsWith = /( copy| copy (\d+))$/.exec(action.title);
        const titleWithoutCopyPostfix = action.title.endsWith(' copy') || endsWith
            ? titleSpit.slice(0, titleSpit.length - 1).join(' copy').trim()
            : action.title;
        let title;
        let i = endsWith && endsWith[2] ? parseInt(endsWith[2]) : 1;
        do {
            const digits = i > 1 ? Math.floor(Math.log10(i)) + 2 : 0;
            const trimmed = titleWithoutCopyPostfix.substring(0, 45 - digits);
            title = `${trimmed} copy${i > 1 ? ' ' + i : ''}`;
            i++;
        } while (this.isActionTitleTaken(title));
        clone.setTitle(title);
        const cloneWrapper = this.createMenuElement(clone);
        target.parentElement.insertAdjacentElement('afterend', cloneWrapper);
        const divClass = '.a-popup-menu-element';
        const actionEl = Util.get(cloneWrapper, divClass);
        this.showRenameField(actionEl, rename => {
            rename.value = this.sanitizeActionTitle(rename.value);
            const newTitle = rename.value;
            let error = true;
            if (this.isActionTitleTaken(newTitle)) {
                Notifier.error('This action title is taken.');
            }
            else if (newTitle.trim() === '') {
                Notifier.error('Please provide a title.');
            }
            else if (newTitle.length > 50) {
                Notifier.error('Maximum title length is 50 characters.');
            }
            else {
                error = false;
            }
            if (error) {
                cloneWrapper.parentElement.removeChild(cloneWrapper);
                return;
            }
            clone.setTitle(rename.value);
            this.fireEvent({ type: 'save', target: clone });
        });
    }
    handleActionRemove(target) {
        const action = this.findActionInActionList(target.textContent);
        const index = this.actionList.indexOf(action);
        if (!action) {
            return;
        }
        if (this.selectedAction.title === action.title) {
            const newSelection = this.actionList[index + 1] || new Action();
            this.setSelectedAction(newSelection);
        }
        const wrapper = target.parentElement;
        const menu = Util.get(this.container, '#a-popup-menu-elements');
        menu.removeChild(wrapper);
        this.fireEvent({ type: 'removeAction', target: action });
    }
    sanitizeActionTitle(title) {
        return title.trim()
            .split('\t').join('')
            .split('\r').join('')
            .split('\n').join('');
    }
    getSelectedTickets() {
        return this.ticketManager.getSelectedTickets();
    }
    setActions(actions) {
        actions.sort((action, action2) => {
            const a = action.title.toUpperCase();
            const b = action2.title.toUpperCase();
            return a < b ? -1 : 1;
        });
        this.actionList = actions;
        this.clearActionList();
        this.createActionMenu();
        this.highlightMenuElement(this.selectedAction);
    }
    setTickets(tickets) {
        this.ticketManager.setTickets(tickets);
        this.setSaveOnlyMode(tickets.length === 0);
    }
    clearActionList() {
        const node = Util.get(this.container, '#a-popup-menu-elements');
        while (node && node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
    createEditor() {
        if (!this.extWindow.rendered) {
            return;
        }
        this.editor = new ActionEditor(Util.get('.a-edit-container'));
        this.editor.on('editorUpdated', ev => {
            const action = ev.target;
            const titleEl = Util.get('.a-popup-title');
            action.setTitle(titleEl.value.trim());
            this.setCurrentAction(action);
        });
    }
    initPopup() {
        this.setContainer(Util.get(this.extWindow.body.dom, '#a-popup'));
        this.createEditor();
        this.assignNewActionButtonHandler();
        this.assignButtonListeners();
        this.initExitCheckbox();
    }
    createModalMask() {
        this.extWindow.mask.dom.classList.add('opaque');
        this.fireEvent({ type: 'show', target: undefined });
    }
    handleClose() {
        this.fireEvent({ type: 'cancelAction', target: undefined });
        this.fireEvent({ type: 'close', target: undefined });
    }
    setCurrentAction(action) {
        this.currentAction = action;
        this.ticketManager.setAction(this.currentAction);
        this.ticketManager.update();
        this.toggleRunEnabled();
        if (this.selectedAction.equals(this.currentAction)) {
            this.toggleUnsavedMode(false);
        }
        else {
            this.toggleUnsavedMode(true);
        }
    }
    highlightMenuElement(action) {
        const menu = Util.getAll(this.container, '.a-popup-menu-element');
        menu.forEach(el => {
            const isSearchTarget = action && el.textContent === action.title;
            el.classList.toggle('selected', isSearchTarget);
        });
    }
    setContainer(container) {
        if (this.extWindow.rendered) {
            this.container = container;
            const ticketContainer = Util.get(container, '.a-tickets-container');
            this.ticketManager.setContainer(ticketContainer);
        }
    }
    findActionInActionList(title) {
        return this.actionList.find(action => action.title === title);
    }
    isActionTitleTaken(title) {
        return this.actionList.some(action => action.title === title);
    }
    setSavePromptTitle(title) {
        const titleEl = Util.get('.a-popup-title');
        titleEl.value = title;
    }
    getPopupTitle() {
        return this.extWindow.title.slice(ActionPopup.titleBase.length);
    }
    setPopupTitle(title) {
        this.extWindow.setTitle(ActionPopup.titleBase + title);
    }
    initExitCheckbox() {
        const checkbox = Util.get('#a-popup-exit');
        checkbox.addEventListener('click', () => {
            this.exitAfterRun = checkbox.checked;
        });
        this.toggleExitCheckboxVisibility();
    }
    toggleExitCheckboxVisibility() {
        const isDetail = SMweb.isDetailOrListDetailPage();
        Util.get('.a-popup-exit-checkbox').classList.toggle('active', isDetail);
    }
}
ActionPopup.titleBase = '<div class="smartease-logo"></div>Ticket Action Wizard &ndash; ';
ActionPopup.ExtConfig = {
    cls: 'sm-popup',
    title: ActionPopup.titleBase,
    layout: 'fit',
    collapsible: true,
    animCollapse: false,
    maximizable: true,
    modal: true,
    plain: false,
    border: false,
    shadow: false,
    shim: false,
    stateful: false,
    bwrapCfg: {
        cls: 'x-window-bwrap smartease-popup-wrap',
        tabIndex: 0
    },
    headerCfg: {
        cls: 'x-window-header'
    },
    bodyCfg: {
        id: 'sm-popup-body',
        cls: '.x-window .x-window-body'
    },
    constrain: true
};
