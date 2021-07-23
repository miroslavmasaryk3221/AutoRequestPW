class TextareaHandler {
    constructor(textareaManager, editor) {
        this.ignoreFocus = false;
        this.taManager = textareaManager;
        this.editor = editor;
    }
    handleBlur(ev, fieldId) {
        if (!(ev.target instanceof HTMLTextAreaElement))
            return false;
        if (ev.target.parentElement.contains(ev.relatedTarget)) {
            ev.target.focus();
            return false;
        }
        const field = this.editor.getField(fieldId);
        const parentRow = field.parentRow;
        ev.target.value = ev.target.value.trim();
        parentRow.setFieldValue(fieldId, ev.target.value);
        this.taManager.removeTextareaPopup();
        return true;
    }
    handleClick(ev, fieldId) {
        if (ev.target instanceof HTMLInputElement) {
            this.displayTextarea(fieldId);
        }
        return true;
    }
    handleFocus(ev, fieldId) {
        if (ev.target instanceof HTMLInputElement && !this.ignoreFocus) {
            this.displayTextarea(fieldId);
            return false;
        }
        this.ignoreFocus = false;
        return true;
    }
    handleInput(ev, fieldId) {
        return false;
    }
    handleKeydown(ev, fieldId) {
        if (ev.target instanceof HTMLTextAreaElement) {
            if (ev.key === 'Escape' || ev.key === 'Tab') {
                if (ev.key === 'Escape') {
                    ev.stopPropagation();
                    ev.preventDefault();
                    ev.target.blur();
                    this.ignoreFocus = true;
                    this.taManager.setFocus(fieldId, false);
                }
                return true;
            }
            return false;
        }
        else if (ev.target instanceof HTMLInputElement) {
            this.displayTextarea(fieldId);
        }
        return true;
    }
    handleRemoveClick(ev, rowId) {
        return true;
    }
    handleExpandClick(ev, rowId) {
        return true;
    }
    displayTextarea(fieldId) {
        const field = this.editor.getField(fieldId);
        const config = field.getConfig();
        const values = config.textareaValues;
        this.taManager.displayTextareaPopup(fieldId, field.value, values);
        this.ignoreFocus = false;
    }
}
