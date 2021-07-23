class OpImplementations {
    static getImplementation(op) {
        const generator = this.wrapperGenerator[op.type];
        if (!generator) {
            throw new InvalidOpTypeError('Unknown operation type: ' + op.type);
        }
        return generator(op);
    }
    static assignOperationCallbacks(callbackMap, implWrapper) {
        if (!callbackMap || !implWrapper || !implWrapper.callbacks) {
            return callbackMap;
        }
        const entries = Object.entries(implWrapper.callbacks);
        entries === null || entries === void 0 ? void 0 : entries.forEach((entry) => {
            const key = entry[0];
            const callback = entry[1];
            if (!Array.isArray(callbackMap[key])) {
                callbackMap[key] = [];
            }
            callbackMap[key].push(callback);
        });
        return callbackMap;
    }
    static async topToolbarClick(buttonName) {
        return await this.uiFuncCall(() => SMweb.topToolbarClick(buttonName));
    }
    static clickButton(doc, textContent) {
        const buttons = doc.getElementsByTagName('button');
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent === textContent) {
                buttons[i].click();
                break;
            }
        }
    }
    static async uiFuncCall(fn, ...args) {
        if (typeof fn === 'function') {
            const docEl = document.documentElement;
            let maskWindow = false;
            docEl.addEventListener('maskWindow', () => (maskWindow = true), {
                once: true,
            });
            const result = await fn.apply(this, args);
            if (maskWindow) {
                await SMweb.waitForEvent('forceUnmaskWindow');
                await Util.delay(1500);
            }
            return result;
        }
    }
    static getMoreButton() {
        const tab = cwc.getActiveTab();
        let context;
        if (SMweb.isListDetailPage()) {
            context = tab.getFrameDocument();
        }
        else {
            context = tab.el.dom;
        }
        const buttonWrapper = Util.get(context, '.x-btn-more-noicon');
        return buttonWrapper === null || buttonWrapper === void 0 ? void 0 : buttonWrapper.getElementsByTagName('button')[0];
    }
    static applySmartInsert(text) {
        if (!text) {
            return;
        }
        const smartInserts = text.match(SmartInsertTextarea.getPattern());
        if (smartInserts) {
            smartInserts.forEach((str) => {
                const fieldName = str.substring(2, str.length - 1);
                const fieldValue = this.get(fieldName) || '';
                text = text.replace(str, fieldValue);
            });
        }
        return text;
    }
    static getDowntimeEndDate(downtimeEnd) {
        const currentEnd = this.get('instance/downtime.end');
        if (downtimeEnd === Operation.DowntimeEnd.Start) {
            return currentEnd || this.get('instance/downtime.start');
        }
        if (downtimeEnd === Operation.DowntimeEnd.Now) {
            const logPanel = new hpsmc.ui.ConversationLogPanel();
            return currentEnd || logPanel.getDateTimeValue(new Date());
        }
        if (downtimeEnd === Operation.DowntimeEnd.ForceStart) {
            return this.get('instance/downtime.start');
        }
        if (downtimeEnd === Operation.DowntimeEnd.ForceNow) {
            const logPanel = new hpsmc.ui.ConversationLogPanel();
            return logPanel.getDateTimeValue(new Date());
        }
    }
    static getResolveParamsWithDefaults(params) {
        let solution = this.get('instance/resolution/resolution');
        solution += solution.length > 0 ? '\n' : '';
        return {
            solution: solution + this.applySmartInsert(params.solution),
            downtimeEnd: params.downtimeEnd,
            resolutionCode: params.resolutionCode,
            category1: params.category1 ||
                this.get('instance/tsi.resolve.category') ||
                this.get('instance/tsi.category'),
            category2: params.category2 ||
                this.get('instance/tsi.resolve.subcategory') ||
                this.get('instance/subcategory'),
            category3: params.category3 ||
                this.get('instance/tsi.resolve.product.type') ||
                this.get('instance/product.type'),
            category4: params.category4 ||
                this.get('instance/tsi.resolve.problem.type') ||
                this.get('instance/problem.type'),
        };
    }
    static async setResolutionCode(code) {
        this.set('instance/resolution.code', code);
        if (code) {
            this.clearResolutionCodeRelatedFields();
            const fillButton = SMweb.getField('Fill Field Resolution Code');
            fillButton.click();
            await SMweb.waitForEvent('forceUnmaskWindow');
        }
    }
    static clearResolutionCodeRelatedFields() {
        this.set('instance/tsi.resolve.category', '');
        this.set('instance/tsi.resolve.subcategory', '');
        this.set('instance/tsi.resolve.product.type', '');
        this.set('instance/tsi.resolve.problem.type', '');
        this.set('instance/resolution/resolution', '');
    }
    static async fillResolveForm(params) {
        if (params.resolutionCode) {
            await this.setResolutionCode(params.resolutionCode);
        }
        else {
            this.set('instance/resolution/resolution', '');
        }
        params = this.getResolveParamsWithDefaults(params);
        const downtimeEndDate = this.getDowntimeEndDate(params.downtimeEnd);
        this.set('instance/downtime.end', downtimeEndDate);
        this.set('instance/tsi.resolve.category', params.category1);
        this.set('instance/tsi.resolve.subcategory', params.category2);
        this.set('instance/tsi.resolve.product.type', params.category3);
        this.set('instance/tsi.resolve.problem.type', params.category4);
        this.set('instance/resolution/resolution', params.solution);
    }
    static async closeIncident() {
        if (!SMweb.topToolbarFind('Close Incident')) {
            return this.topToolbarClick('Cancel');
        }
        return await this.topToolbarClick('Close Incident');
    }
    static async resolveIncident(params) {
        if (!params.solution) {
            return false;
        }
        if (!SMweb.topToolbarFind('Save & Exit')) {
            return this.topToolbarClick('Cancel');
        }
        await this.topToolbarClick('Resolve');
        if (this.get('instance/problem.status') === 'Resolved') {
            await this.fillResolveForm(params);
        }
        return true;
    }
    static async updateIncident(assignment, updateText) {
        const saveAndExitButton = SMweb.topToolbarFind('Save & Exit');
        if (!saveAndExitButton || (!assignment && !updateText)) {
            return false;
        }
        if (assignment) {
            const currentAssignment = this.get('instance/assignment');
            if (assignment.includes('.') && assignment !== currentAssignment) {
                this.set('instance/assignment', assignment);
                this.set('instance/assignee.name', '');
            }
            else if (assignment !== this.get('instance/assignee.name')) {
                this.set('instance/assignee.name', assignment);
            }
        }
        if (updateText) {
            updateText = this.applySmartInsert(updateText);
            this.set('var/pmc.actions/pmc.actions', updateText);
        }
        return true;
    }
    static async setIncidentStatus(status) {
        if (!SMweb.topToolbarFind('Save & Exit')) {
            return false;
        }
        const ticketStatus = this.get('instance/problem.status');
        if (ticketStatus !== status) {
            SMweb.setComboValue('instance/problem.status', status);
            await SMweb.waitForEvent('forceUnmaskWindow');
        }
        return true;
    }
    static async setPriority(priority) {
        if (!SMweb.topToolbarFind('Save & Exit')) {
            return false;
        }
        const currentPriority = SMweb.getFieldValue('instance/priority.code');
        if (currentPriority === priority) {
            return true;
        }
        const name = 'instance/tsi.writable.priority';
        const writable = SMweb.getField(name);
        if (!writable.previousElementSibling.classList.contains('xChecked')) {
            writable.click();
            await SMweb.waitForEvent('forceUnmaskWindow');
        }
        SMweb.setComboValue('instance/priority.code', priority);
        return true;
    }
    static async setPrioJustification(text) {
        if (SMweb.isDetailPage()) {
            const win = SMweb.getDetailFrameWindow();
            if (win.tpz_formTitle === 'IM Justification') {
                SMweb.setFieldValue('var/tsijustificationtxt', text);
                await this.topToolbarClick('Ok');
            }
        }
        return true;
    }
    static async relateIncident(ticketId, resolveType) {
        if (!SMweb.topToolbarFind('Save & Exit')) {
            return false;
        }
        const map = {
            S: '/Related/Interactions/Associate',
            C: '/Related/Changes/Associate',
            P: '/Related/Problems/Associate',
            I: '/Mapping Records',
        };
        const relateLocation = map[ticketId[0]];
        const more = this.getMoreButton();
        if (!relateLocation || !more) {
            return false;
        }
        if (ticketId.startsWith('IM') && resolveType) {
            if (this.get('instance/tsi.mrm.type') !== 'NONE') {
                return true;
            }
            await this.topToolbarClick(more.textContent + relateLocation);
            return await this.associateWithLeadIncident(ticketId, resolveType);
        }
        await this.topToolbarClick(more.textContent + relateLocation);
        const frame = Util.get('#popupFrame');
        const content = frame.contentDocument;
        const association = Util.get(content, 'input[name="var/L.association"]');
        association.value = ticketId;
        const okButton = Util.get(content, 'a[title="OK"]');
        okButton.click();
        await SMweb.waitForEvent('forceUnmaskWindow');
        return true;
    }
    static async associateWithLeadIncident(ticketId, resolveType) {
        let error = false;
        const setErrorMessage = (event) => (error = event.detail.message);
        const frameDoc = cwc.getActiveTab().getFrameDocument();
        const associateChild = SMweb.getField('var/tsi.ah.select');
        if (associateChild) {
            associateChild.click();
            this.set('var/tsi.ah.association', ticketId);
            this.set('var/tsi.ah.resolve.type', resolveType);
            this.clickButton(frameDoc, 'Finish');
            const docEl = document.documentElement;
            docEl.addEventListener('showMessage', setErrorMessage);
            await SMweb.waitForEvent('forceUnmaskWindow');
            docEl.removeEventListener('showMessage', setErrorMessage);
        }
        if (error) {
            throw new Error(error);
        }
        return !error;
    }
    static async updateSMBBWorklog(text) {
        if (!SMweb.topToolbarFind('SMBB Worklog Update')) {
            return false;
        }
        await this.topToolbarClick('SMBB Worklog Update');
        const tab = cwc.getActiveTab();
        if (tab.title !== 'Wizard: Worklog Update') {
            return this.topToolbarClick('Cancel');
        }
        if (text) {
            text = this.applySmartInsert(text);
            this.set('var/pmc.actions/pmc.actions', text);
        }
        this.clickButton(tab.getFrameDocument(), 'Finish');
        const message = await SMweb.waitUntil(() => cwc.messageDialog);
        const dialog = message.getDialog();
        const yesButton = dialog.buttons.find((btn) => btn.text === 'Yes');
        if (yesButton) {
            yesButton.handler();
        }
        await SMweb.waitForEvent('forceUnmaskWindow');
        await SMweb.waitUntil(() => SMweb.topToolbarClick('Cancel', tab), 120000);
        await SMweb.waitForEvent('forceUnmaskWindow');
        return true;
    }
}
OpImplementations.get = SMweb.getFieldValue;
OpImplementations.set = SMweb.setFieldValue;
OpImplementations.wrapperGenerator = {
    'Assign to': (op) => {
        return {
            run: OpImplementations.updateIncident.bind(OpImplementations, op.params.assignee),
        };
    },
    'Close Incident': () => {
        return {
            run: OpImplementations.closeIncident.bind(OpImplementations),
        };
    },
    'Set priority to': (op) => {
        return {
            run: OpImplementations.setPriority.bind(OpImplementations, op.params.priority),
            callbacks: {
                aftersave: OpImplementations.setPrioJustification.bind(OpImplementations, op.params.justification),
            },
        };
    },
    'Relate to': (op) => {
        return {
            run: OpImplementations.relateIncident.bind(OpImplementations, op.params.ticketId),
        };
    },
    'Relate to Lead Incident': (op) => {
        return {
            run: OpImplementations.relateIncident.bind(OpImplementations, op.params.ticketId, op.params.resolveType),
        };
    },
    'Resolve': (op) => {
        return {
            run: OpImplementations.resolveIncident.bind(OpImplementations, op.params),
        };
    },
    'Set status to': (op) => {
        return {
            run: OpImplementations.setIncidentStatus.bind(OpImplementations, op.params.status),
        };
    },
    'SMBB Worklog Update': (op) => {
        return {
            run: OpImplementations.updateSMBBWorklog.bind(OpImplementations, op.params.smbbUpdate),
        };
    },
    'Update': (op) => {
        return {
            run: OpImplementations.updateIncident.bind(OpImplementations, null, op.params.update),
        };
    },
};
SMweb.OpImpl = OpImplementations;
