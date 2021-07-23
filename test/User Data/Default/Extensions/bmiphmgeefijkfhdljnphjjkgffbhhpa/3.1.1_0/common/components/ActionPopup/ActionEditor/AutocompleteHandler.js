class AutocompleteHandler {
    addAutocomplete(fieldId, source, selectCallback, dropdown = false, exclusionFunc) {
        const input = Util.getInput(`#${fieldId}`);
        autocomplete({
            input: input,
            onSelect: this.onAcSelect.bind(this, selectCallback),
            onSelectionChange: this.onSelectionChange.bind(this),
            fetch: this.getResults.bind(this, source, dropdown, exclusionFunc),
            minLength: 0,
            render: this.renderSuggestion.bind(this),
            showOnFocus: true,
            preventSubmit: true
        });
    }
    getResults(results, dropdown, exclusionFunc, query, update) {
        query = query.toLowerCase().trim() || '';
        results = results.filter(result => !(!query && result.isShorthand));
        let selectedItem;
        const labels = results.map(res => res.label);
        const matched = StringHelpers.searchStringArray(labels, query)
            .map((match) => results.find(r => r.label === match));
        if (dropdown) {
            selectedItem = matched[0];
        }
        else {
            results = matched;
        }
        results.forEach(result => {
            result.isDisabled = false;
            result.tooltip = '';
            if (exclusionFunc && exclusionFunc(result.value)) {
                result.isDisabled = true;
                result.tooltip = 'This option is disabled because ' +
                    'another operation in the action is blocking it';
            }
        });
        results = Util.boolSort(results, false, 'isDisabled', 'isShorthand');
        update(results, selectedItem);
    }
    renderSuggestion(item) {
        const div = document.createElement('div');
        if (item.isShorthand) {
            div.classList.add('shorthand');
        }
        if (item.isDisabled) {
            div.classList.add('disabled');
        }
        if (item.tooltip) {
            div.title = item.tooltip;
        }
        div.textContent = item.label;
        return div;
    }
    onSelectionChange(item) {
        return !item.isDisabled;
    }
    onAcSelect(selectCallback, item, input) {
        if (item.isDisabled) {
            return;
        }
        input.value = item.value;
        if (selectCallback && typeof selectCallback === 'function') {
            selectCallback(item);
        }
    }
    handleBlur(ev, fieldId) {
        return true;
    }
    handleClick(ev, fieldId) {
        return true;
    }
    handleFocus(ev, fieldId) {
        return true;
    }
    handleInput(ev, fieldId) {
        return true;
    }
    handleKeydown(ev, fieldId) {
        if (ev.key === 'Escape' || ev.key === 'Tab') {
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.key === 'Tab')
                return true;
        }
        return false;
    }
    handleRemoveClick(ev, rowId) {
        return true;
    }
    handleExpandClick(ev, rowId) {
        return true;
    }
}
