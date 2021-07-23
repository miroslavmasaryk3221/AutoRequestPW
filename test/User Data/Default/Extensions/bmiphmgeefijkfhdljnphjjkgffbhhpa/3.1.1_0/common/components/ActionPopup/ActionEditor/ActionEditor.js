class ActionEditor extends EventEmitter {
    constructor(container) {
        super();
        this.navDirection = 1;
        this.hasError = false;
        this.dom = new DOMManager(this, container);
        this.textareaHandler = new TextareaHandler(this.dom, this);
        this.acHandler = new AutocompleteHandler();
        this.rows = [];
        this.addRow();
    }
    handleBlur(event, fieldId) {
        const field = this.getField(fieldId);
        if (!field)
            return false;
        const config = field.getConfig();
        let shouldContinue = true;
        if (config.autocomplete) {
            shouldContinue = this.acHandler.handleBlur(event, fieldId);
        }
        else if (config.textarea) {
            shouldContinue = this.textareaHandler.handleBlur(event, fieldId);
        }
        if (!shouldContinue)
            return false;
        const target = event.target;
        const value = this.autoFormat(fieldId, target.value);
        this.setFieldValue(fieldId, value, false);
        if (config.paramIndex === -1) {
            this.handleOpTypeBlur(event, fieldId);
        }
        this.fireUpdate();
        return false;
    }
    handleClick(event, fieldId) {
        const field = this.getField(fieldId);
        if (!field)
            return false;
        const config = field.getConfig();
        let shouldContinue = true;
        if (config.autocomplete) {
            shouldContinue = this.acHandler.handleClick(event, fieldId);
        }
        else if (config.textarea) {
            shouldContinue = this.textareaHandler.handleClick(event, fieldId);
        }
        if (!shouldContinue)
            return false;
        return false;
    }
    handleFocus(event, fieldId) {
        const field = this.getField(fieldId);
        if (!field)
            return false;
        const config = field.getConfig();
        let shouldContinue = true;
        for (const row of this.rows) {
            if (!row.hasField(fieldId))
                row.collapse();
        }
        if (config.autocomplete) {
            shouldContinue = this.acHandler.handleFocus(event, fieldId);
        }
        else if (config.textarea) {
            shouldContinue = this.textareaHandler.handleFocus(event, fieldId);
        }
        if (!shouldContinue)
            return false;
        return false;
    }
    handleInput(event, fieldId) {
        const field = this.getField(fieldId);
        if (!field)
            return false;
        const config = field.getConfig();
        let shouldContinue = true;
        if (config.autocomplete) {
            shouldContinue = this.acHandler.handleInput(event, fieldId);
        }
        else if (config.textarea) {
            shouldContinue = this.textareaHandler.handleInput(event, fieldId);
        }
        if (!shouldContinue)
            return false;
        if (config.paramIndex === -1) {
            this.handleOpTypeInput(event, fieldId);
        }
        else {
            const target = event.target;
            this.setFieldValue(fieldId, target.value, false);
        }
        this.fireUpdate();
        return true;
    }
    handleKeydown(event, fieldId) {
        const field = this.getField(fieldId);
        if (!field)
            return false;
        const config = field.getConfig();
        let shouldContinue = true;
        if (config.autocomplete) {
            shouldContinue = this.acHandler.handleKeydown(event, fieldId);
        }
        else if (config.textarea) {
            shouldContinue = this.textareaHandler.handleKeydown(event, fieldId);
        }
        if (!shouldContinue)
            return false;
        this.handleNavKeys(event, fieldId);
        return false;
    }
    handleRemoveClick(event, rowId) {
        const rowToRemove = this.getRow(rowId);
        this.removeRow(rowToRemove);
        this.fireUpdate();
        return true;
    }
    handleExpandClick(event, rowId) {
        const rowToExpand = this.getRow(rowId);
        rowToExpand.toggleExpand();
        return true;
    }
    autoFormat(fieldId, value) {
        let result = value.trim();
        const field = this.getField(fieldId);
        const config = field.getConfig();
        if (config.capitalize) {
            result = result.toUpperCase();
        }
        if (config.noSpaces) {
            result = result.split(' ').join('');
        }
        if (result !== value) {
            this.setFieldElementValue(field, result);
        }
        return result;
    }
    handleOpTypeBlur(event, fieldId) {
        const index = this.getParentRowIndex(fieldId);
        const parentRow = this.rows[index];
        const target = event.target;
        const value = target.value;
        if (value === '' && !this.isLastRow(this.rows[index])) {
            this.navigateRows(fieldId, this.navDirection);
            this.removeRow(parentRow);
        }
        else if (EditorHelper.isValidShorthand(value)) {
            const op = Operation.from(EditorHelper.Shorthand[value]);
            if (!this.isOpTypeExcluded(op.type, parentRow)) {
                parentRow.setOperation(op);
                this.addRow();
                this.navDirection === 1
                    ? this.navigateRows(fieldId, 1)
                    : this.navigateFields(fieldId, -1);
            }
        }
    }
    handleOpTypeInput(event, fieldId) {
        const field = this.getField(fieldId);
        const target = event.target;
        const valueIsValid = this.setFieldValue(fieldId, target.value, false);
        if (target.value === '') {
            const row = field.parentRow;
            row.reset();
            if (this.isNthLastRow(row, 2) &&
                !this.getRow(-1).getField(0).value) {
                this.removeRow(-1);
            }
        }
        else if (valueIsValid && this.isLastRow(field.parentRow)) {
            this.addRow();
        }
    }
    onAcSelect(fieldId, result) {
        const value = result.value;
        const success = this.setFieldValue(fieldId, value, false);
        if (success) {
            this.fireUpdate();
            this.navigateFields(fieldId, this.navDirection);
        }
    }
    onAcOpTypeSelect(fieldId, result) {
        const index = this.getParentRowIndex(fieldId);
        const parentRow = this.rows[index];
        const label = result.label;
        let success = true;
        if (result.isShorthand && EditorHelper.isValidShorthand(label)) {
            const op = Operation.from(EditorHelper.Shorthand[label]);
            parentRow.setOperation(op);
        }
        else {
            success = this.setFieldValue(fieldId, label, false);
        }
        if (success) {
            this.fireUpdate();
            this.navigateFields(fieldId, this.navDirection);
            if (this.isLastRow(parentRow)) {
                this.addRow();
            }
        }
    }
    handleNavKeys(event, fieldId) {
        if (ActionEditor.OkKeys.includes(event.key)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const delta = event.shiftKey ? -1 : 1;
            this.navDirection = delta;
            this.navigateFields(fieldId, delta);
        }
    }
    navigateFields(fromFieldId, delta) {
        const magicArray = this.rows
            .map((row, rowIndex) => {
            return row.getVisibleFieldIndices().map(index => ({
                row: rowIndex,
                col: index
            }));
        })
            .flat(1);
        const rowIndex = this.getParentRowIndex(fromFieldId);
        const colIndex = this.rows[rowIndex].getFieldIndex(fromFieldId);
        const currentMagicIndex = magicArray.findIndex(elem => elem.row === rowIndex && elem.col === colIndex);
        const newMagicIndex = this.getNumberIn(currentMagicIndex + delta, magicArray.length - 1);
        const { row, col } = magicArray[newMagicIndex];
        const newFieldId = this.rows[row].getField(col).getId();
        this.dom.setFocus(newFieldId);
        this.navDirection = 1;
    }
    navigateRows(fromFieldId, delta) {
        const longestRowFieldCount = this.rows.reduce((max, row) => row.getFieldCount() > max ? row.getVisibleFieldCount() : max, 0);
        const magicArray = this.rows.map((row, rowIndex) => {
            const array = row.getVisibleFieldIndices().map(index => ({
                row: rowIndex,
                col: index
            }));
            const length = array.length;
            for (let i = length; i < longestRowFieldCount; i++) {
                array.push({
                    row: rowIndex,
                    col: array[array.length - 1].col
                });
            }
            return array;
        });
        const rowIndex = this.getParentRowIndex(fromFieldId);
        const colIndex = this.rows[rowIndex].getFieldIndex(fromFieldId);
        const newRowIndex = this.getNumberIn(rowIndex + delta, magicArray.length - 1);
        const { row, col } = magicArray[newRowIndex][colIndex];
        const newFieldId = this.rows[row].getField(col).getId();
        this.dom.setFocus(newFieldId);
        this.navDirection = 1;
    }
    markErrorsInRow(row, reasons) {
        for (const key in reasons) {
            if (!Util.hasProp(reasons, key) || reasons[key] === '')
                continue;
            let fieldId;
            if (key === 'opType') {
                fieldId = row.getField(0).getId();
            }
            else {
                const opType = row.getOpType();
                const config = Operation.paramConfigMap[opType][key];
                fieldId = row.getField(config.paramIndex + 1).getId();
            }
            this.dom.markFieldInvalid(fieldId, reasons[key]);
        }
    }
    fireUpdate() {
        this.fireEvent({ type: 'editorUpdated', target: this.getAction() });
    }
    hasErrors() {
        return this.hasError;
    }
    isValidFieldValue(fieldId, value) {
        const field = this.getField(fieldId);
        const parentRow = field.parentRow;
        const config = field.getConfig();
        if (config.paramIndex === -1) {
            if (!Operation.isValidOpType(value) ||
                this.isOpTypeExcluded(value, parentRow)) {
                return false;
            }
        }
        else if (config.autocomplete &&
            !config.autocomplete.map(value => value.toLowerCase())
                .includes(value.toLowerCase())) {
            return false;
        }
        return true;
    }
    isOpTypeExcluded(opType, ignoredRow) {
        if (!Operation.isValidOpType(opType))
            return false;
        return Action.hasOperationConflict(this.getOpTypes(ignoredRow), opType);
    }
    isLastRow(row) {
        return this.isNthLastRow(row, 1);
    }
    isNthLastRow(row, nthLast) {
        return row === this.rows[this.rows.length - nthLast];
    }
    getField(id) {
        var _a;
        const index = this.getParentRowIndex(id);
        return (_a = this.rows[index]) === null || _a === void 0 ? void 0 : _a.getField(id);
    }
    getParentRowIndex(id) {
        return this.rows.findIndex(row => row.hasField(id));
    }
    setFieldValue(fieldId, value, updateDom = true) {
        const field = this.getField(fieldId);
        const parentRow = field.parentRow;
        const config = field.getConfig();
        const valueIsValid = this.isValidFieldValue(fieldId, value);
        if (config.paramIndex === -1 && valueIsValid) {
            const opType = value;
            parentRow.setOpType(opType);
            this.dom.toggleExpandableRow(parentRow.getId(), Operation.opHasOptParams(opType));
            this.dom.setExpandContentDescription(parentRow.getId(), Operation.optParamDescrMap[opType]);
        }
        parentRow.setFieldValue(fieldId, value, updateDom);
        return valueIsValid;
    }
    setFieldElementValue(field, value) {
        this.dom.setFieldValue(field.getId(), value);
        this.fireUpdate();
    }
    addFieldElement(parentRow, config) {
        const rowId = parentRow.getId();
        const fieldId = this.dom.addField(rowId, {
            placeholder: config.placeholder,
            alwaysDropdown: config.alwaysDropdown,
            textarea: config.textarea,
            optional: config.optional,
        }, config.paramIndex === -1);
        if (config.autocomplete) {
            const acHelper = EditorHelper;
            const source = acHelper.getAcResults(config);
            if (config.paramIndex === -1) {
                this.acHandler.addAutocomplete(fieldId, source, this.onAcOpTypeSelect.bind(this, fieldId), config.alwaysDropdown, (opType) => this.isOpTypeExcluded(opType, parentRow));
            }
            else {
                this.acHandler.addAutocomplete(fieldId, source, this.onAcSelect.bind(this, fieldId), config.alwaysDropdown);
            }
        }
        return fieldId;
    }
    removeFieldElements(fields) {
        fields.forEach(field => this.dom.remove(field.getId()));
    }
    getOpTypes(ignoredRow) {
        return this.rows
            .map(row => {
            try {
                return row !== ignoredRow ? row.getOpType() : undefined;
            }
            catch (e) {
                if (e instanceof InvalidOpError) {
                    return undefined;
                }
                else {
                    throw e;
                }
            }
        })
            .filter(opType => Operation.isValidOpType(opType));
    }
    getAction() {
        this.dom.unmarkInvalids();
        this.hasError = false;
        const opTypes = [];
        const operations = [...this.rows]
            .sort((a, b) => a.lastEdited.getTime() - b.lastEdited.getTime())
            .map(row => {
            const opType = row.getField(0).value;
            try {
                if (!opType)
                    return undefined;
                if (Action.hasOperationConflict(opTypes, opType)) {
                    throw new InvalidOpTypeError(opType);
                }
                return row.getOperation();
            }
            catch (err) {
                this.hasError = true;
                if (err instanceof InvalidOpError) {
                    this.markErrorsInRow(row, err.reasons);
                }
                else {
                    throw err;
                }
            }
            finally {
                opTypes.push(opType);
            }
        })
            .filter(op => op !== undefined);
        return new Action('', operations);
    }
    getNumberIn(number, max) {
        if (number < 0) {
            return max;
        }
        else if (number > max) {
            return 0;
        }
        else {
            return number;
        }
    }
    getRow(i) {
        if (typeof i === 'string') {
            return this.rows.find(row => row.getId() === i);
        }
        else {
            if (i > this.rows.length || i < -this.rows.length - 1) {
                return undefined;
            }
            return i < 0
                ? this.rows[this.rows.length + i]
                : this.rows[i];
        }
    }
    setAction(action) {
        this.clear();
        action.operations.forEach(op => {
            this.addRow(op);
        });
        this.addRow();
        this.fireUpdate();
    }
    addRow(op) {
        const newRow = new EditorRow(this, this.dom.addRow());
        this.rows.push(newRow);
        if (op) {
            newRow.setOperation(op);
            this.dom.toggleExpandableRow(newRow.getId(), Operation.opHasOptParams(op.type));
            this.dom.setExpandContentDescription(newRow.getId(), Operation.optParamDescrMap[op.type]);
        }
    }
    removeRow(row) {
        if (!(row instanceof EditorRow))
            row = this.getRow(row);
        this.dom.remove(row.getId());
        const index = this.rows.findIndex(editorRow => editorRow === row);
        this.rows.splice(index, 1);
    }
    expandRow(row) {
        this.dom.expandRow(row.getId());
    }
    collapseRow(row) {
        this.dom.collapseRow(row.getId());
    }
    clear() {
        this.dom.clearRows();
        this.rows = [];
    }
}
ActionEditor.OkKeys = ['Enter', 'Tab'];
class EditorRow {
    constructor(fieldManager, id, op) {
        this.isExpanded = true;
        this.fields = [];
        this.fieldManager = fieldManager;
        this.id = id;
        this.lastEdited = new Date();
        this.addOpTypeField();
        if (op instanceof Operation) {
            this.setOperation(op);
        }
    }
    hasField(indexOrId) {
        try {
            this.getField(indexOrId);
            return true;
        }
        catch {
            return false;
        }
    }
    getId() {
        return this.id;
    }
    getFieldIndex(id) {
        return this.fields.findIndex(field => field.getId() === id);
    }
    getField(indexOrId) {
        if (typeof indexOrId === 'string') {
            return this.getFieldById(indexOrId);
        }
        else {
            return this.getFieldByIndex(indexOrId);
        }
    }
    getFieldById(id) {
        const field = this.fields.find(field => field.getId() === id);
        if (!field) {
            throw new Error(`Invalid field id: ${id}`);
        }
        return field;
    }
    getFieldByIndex(index) {
        if (index < 0 || index >= this.fields.length) {
            throw new RangeError(`Invalid field index: ${index}`);
        }
        return this.fields[index];
    }
    getFieldCount() {
        return this.fields.length;
    }
    getFieldsVisibility() {
        return this.fields
            .map(field => this.isExpanded || !field.getConfig().optional);
    }
    getVisibleFieldIndices() {
        return this.fields
            .map((field, index) => (this.isExpanded || !field.getConfig().optional)
            ? index
            : undefined)
            .filter(index => index !== undefined);
    }
    getVisibleFieldCount() {
        return this.getVisibleFieldIndices().length;
    }
    getOpType() {
        const opType = this.fields[0].value;
        if (!Operation.isValidOpType(opType)) {
            throw new InvalidOpTypeError(opType);
        }
        else {
            return opType;
        }
    }
    getOperation() {
        const opType = this.getOpType();
        const paramConfig = Operation.paramConfigMap[opType];
        const params = {};
        for (const key in paramConfig) {
            if (!Util.hasProp(paramConfig, key))
                continue;
            const paramIndex = paramConfig[key].paramIndex;
            params[key] = this.fields[paramIndex + 1].value;
        }
        return Operation.from({
            type: opType,
            params: params
        });
    }
    setFieldValue(indexOrId, value, updateDom = true) {
        const field = this.getField(indexOrId);
        if (field.value === value)
            return;
        field.value = value;
        this.lastEdited = new Date();
        if (updateDom) {
            this.fieldManager.setFieldElementValue(field, value);
        }
    }
    setOperation(op) {
        const opType = op.type;
        this.setOpType(opType);
        this.setFieldValue(0, opType);
        const params = op.params;
        const paramConfig = Operation.paramConfigMap[op.type];
        const paramsArray = [];
        for (const key in params) {
            if (!Util.hasProp(params, key))
                continue;
            paramsArray.push({
                index: paramConfig[key].paramIndex,
                value: params[key]
            });
        }
        paramsArray
            .sort((a, b) => a.index - b.index)
            .forEach(param => {
            this.setFieldValue(param.index + 1, param.value);
        });
    }
    setOpType(opType) {
        const currentOpType = this.fields[0].value;
        if (currentOpType === opType)
            return;
        this.reset();
        const paramConfig = Operation.paramConfigMap[opType];
        const paramConfigArray = Object.values(paramConfig);
        paramConfigArray.sort((a, b) => a.paramIndex - b.paramIndex);
        paramConfigArray.forEach(paramConfig => {
            this.addField(paramConfig);
        });
        this.expand();
    }
    toggleExpand() {
        this.isExpanded = !this.isExpanded;
    }
    expand() {
        this.isExpanded = true;
        this.fieldManager.expandRow(this);
    }
    collapse() {
        this.isExpanded = false;
        this.fieldManager.collapseRow(this);
    }
    reset() {
        const fieldsToRemove = this.fields.splice(1);
        this.fieldManager.removeFieldElements(fieldsToRemove);
    }
    addOpTypeField() {
        this.addField({
            paramIndex: -1,
            placeholder: 'Select operation type',
            autocomplete: Object.values(Operation.Type)
        });
    }
    addField(config) {
        const fieldId = this.fieldManager.addFieldElement(this, config);
        const field = new EditorField(config, fieldId, this);
        this.fields.push(field);
        if (config.default) {
            this.setFieldValue(fieldId, config.default);
        }
    }
}
class EditorField {
    constructor(config, id, parentRow) {
        this.value = '';
        this.config = config;
        this.id = id;
        this.parentRow = parentRow;
    }
    getId() {
        return this.id;
    }
    getConfig() {
        return this.config;
    }
}
class DOMManager {
    constructor(eventHandler, container) {
        this.eventHandler = eventHandler;
        this.container = container;
    }
    addRow() {
        const row = document.createElement('div');
        row.id = this.generateId();
        row.classList.add('a-edit-row');
        const removeButton = document.createElement('div');
        removeButton.classList.add('a-edit-remove');
        removeButton.addEventListener('click', event => {
            this.eventHandler.handleRemoveClick(event, row.id);
        });
        row.appendChild(removeButton);
        const expandButton = document.createElement('div');
        expandButton.classList.add('a-edit-expand');
        expandButton.addEventListener('click', event => {
            this.eventHandler.handleExpandClick(event, row.id);
            row.classList.toggle('expanded');
        });
        row.appendChild(expandButton);
        this.container.appendChild(row);
        return row.id;
    }
    clearRows() {
        while (this.container.firstChild)
            this.container.firstChild.remove();
    }
    addField(parentId, config, selectOpLabel = false) {
        const parentRow = this.get(parentId);
        let parentNode = parentRow;
        const field = document.createElement('div');
        field.id = this.generateId();
        field.classList.add('a-edit-field');
        if (config.textarea) {
            field.classList.add('a-edit-plus');
        }
        else if (config.alwaysDropdown) {
            field.classList.add('a-edit-arrow');
        }
        if (config.optional) {
            parentNode = this.getExpandContentDiv(parentRow);
            field.classList.add('expand');
        }
        const input = document.createElement('input');
        input.id = field.id + '-input';
        input.placeholder = config.placeholder;
        input.autocomplete = 'off';
        field.appendChild(input);
        parentNode.appendChild(field);
        if (selectOpLabel) {
            const label = document.createElement('label');
            label.setAttribute('for', input.id);
            label.innerText = '+';
            field.appendChild(label);
        }
        this.assignFieldListeners(input, field.id);
        return field.id;
    }
    setFieldValue(id, value) {
        this.getInput(id).value = value.split('\n')[0].trim();
    }
    setFocus(id, select = true) {
        const input = this.getInput(id);
        input.select();
        if (!select) {
            input.setSelectionRange(0, 0);
        }
    }
    remove(id) {
        var _a;
        (_a = Util.get(this.container, `#${id}`)) === null || _a === void 0 ? void 0 : _a.remove();
    }
    displayTextareaPopup(fieldId, value, selectableValues) {
        const input = this.getInput(fieldId);
        const smartInsert = this.createTextarea();
        const textarea = smartInsert.getTextareaElement();
        const parent = smartInsert.getContainerElement();
        const field = input.parentElement;
        textarea.value = value;
        textarea.placeholder = input.placeholder;
        parent.style.top = this.container.offsetTop + field.offsetTop + 'px';
        parent.style.left = field.offsetLeft + 'px';
        parent.style.width = field.offsetWidth + 'px';
        parent.style.height = field.offsetHeight + 'px';
        textarea.focus();
        setTimeout(() => smartInsert.update(), 150);
        if (selectableValues) {
            this.addSelectMenuToTextarea(parent, smartInsert, selectableValues);
        }
        this.assignTextareaListeners(textarea, fieldId);
    }
    removeTextareaPopup() {
        var _a;
        (_a = Util.get('.a-edit-big-textarea')) === null || _a === void 0 ? void 0 : _a.remove();
    }
    createTextarea() {
        const textareaContainer = document.createElement('div');
        textareaContainer.classList.add('a-edit-big-textarea');
        const darkener = document.createElement('div');
        darkener.classList.add('darkener');
        textareaContainer.appendChild(darkener);
        const exit = document.createElement('div');
        exit.classList.add('exit');
        textareaContainer.appendChild(exit);
        const textareaParent = document.createElement('div');
        textareaParent.classList.add('parent');
        textareaParent.tabIndex = 0;
        textareaContainer.appendChild(textareaParent);
        const textarea = document.createElement('textarea');
        textareaParent.appendChild(textarea);
        Util.get('.a-popup-wizard').appendChild(textareaContainer);
        return new SmartInsertTextarea(textareaParent, textarea);
    }
    expandRow(id) {
        this.get(id).classList.add('expanded');
    }
    collapseRow(id) {
        this.get(id).classList.remove('expanded');
    }
    addSelectMenuToTextarea(container, smartInsert, values) {
        container.classList.add('with-selection-menu');
        const selectionParent = document.createElement('div');
        selectionParent.classList.add('selection-menu');
        const button = document.createElement('div');
        button.classList.add('selection-menu-toggle');
        button.onclick = () => {
            container.classList.toggle('open');
            setTimeout(() => smartInsert.update(), 200);
        };
        selectionParent.appendChild(button);
        const content = document.createElement('div');
        content.classList.add('selection-menu-content');
        selectionParent.appendChild(content);
        container.appendChild(selectionParent);
        this.addSelectMenuElements(content, smartInsert, values);
    }
    addSelectMenuElements(contentDiv, smartInsert, values) {
        const info = document.createElement('div');
        info.textContent =
            'Click a line to add it to the bottom of the text';
        info.classList.add('selection-menu-info');
        contentDiv.appendChild(info);
        values.forEach(value => {
            const menuElement = document.createElement('div');
            menuElement.textContent = value;
            menuElement.classList.add('selection-menu-element');
            menuElement.onclick = () => {
                const textarea = smartInsert.getTextareaElement();
                textarea.value = textarea.value + value + '\n';
                smartInsert.update();
                textarea.scrollTop = textarea.scrollHeight;
            };
            contentDiv.appendChild(menuElement);
        });
    }
    markFieldInvalid(id, reason) {
        const field = this.get(id);
        field.classList.add('invalid');
        field.title = reason;
    }
    unmarkInvalids() {
        Util.getAll(this.container, '.invalid').forEach((field) => {
            field.classList.remove('invalid');
            field.title = '';
        });
    }
    assignTextareaListeners(el, id) {
        const handler = this.eventHandler;
        el.addEventListener('focusout', (ev) => handler.handleBlur(ev, id), {
            once: false,
        });
        el.addEventListener('keydown', (ev) => handler.handleKeydown(ev, id));
        el.addEventListener('focus', (ev) => handler.handleFocus(ev, id));
    }
    assignFieldListeners(input, id) {
        const handler = this.eventHandler;
        input.addEventListener('blur', (ev) => handler.handleBlur(ev, id));
        input.addEventListener('click', (ev) => handler.handleClick(ev, id));
        input.addEventListener('focus', (ev) => handler.handleFocus(ev, id));
        input.addEventListener('input', (ev) => handler.handleInput(ev, id));
        input.addEventListener('keydown', (ev) => handler.handleKeydown(ev, id));
    }
    get(id) {
        const elem = Util.get(this.container, `#${id}`);
        if (!elem)
            throw new Error(`Invalid id: ${id}`);
        return elem;
    }
    getInput(id) {
        const field = this.get(id);
        const input = Util.get(field, 'input');
        if (!input)
            throw new Error(`Invalid input id: ${id}`);
        return input;
    }
    generateId() {
        return `sm-ae-${DOMManager.counter++}`;
    }
    toggleExpandableRow(id, expandable) {
        this.get(id).classList.toggle('expand', expandable);
        this.get(id).classList.toggle('expanded', expandable);
    }
    setExpandContentDescription(parentId, description) {
        const parent = this.get(parentId);
        const expandContent = this.getExpandContentDiv(parent);
        const descriptionDiv = Util.get(expandContent, '.description');
        descriptionDiv.innerText = description;
    }
    getExpandContentDiv(parent) {
        let expandContent = Util.get(parent, '.expand-content');
        if (!expandContent) {
            expandContent = document.createElement('div');
            expandContent.classList.add('expand-content');
            parent.appendChild(expandContent);
            const descriptionDiv = document.createElement('div');
            descriptionDiv.classList.add('description');
            expandContent.appendChild(descriptionDiv);
        }
        return expandContent;
    }
}
DOMManager.counter = 0;
