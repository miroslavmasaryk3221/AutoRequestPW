class SmartInsertTextarea {
    constructor(container, textarea) {
        const children = Array.from(container.children);
        if (!textarea) {
            textarea = document.createElement('textarea');
            container.appendChild(textarea);
        }
        else if (!children.includes(textarea)) {
            children.push(textarea);
            container.appendChild(textarea);
        }
        this.textarea = textarea;
        this.container = container;
        textarea.classList.add('smart-insert-textarea');
        container.classList.add('smart-insert-container');
        const config = SmartInsertTextarea.Config;
        this.highlight = new hlghtta(container, textarea, config);
        this.highlightDivs = Array.from(container.querySelectorAll('div'));
        this.highlightDivs.forEach(div => div.className = 'smart-insert-div');
        const disabledStateObserver = new MutationObserver(this.onDisabled);
        disabledStateObserver.observe(textarea, {
            attributes: true
        });
        this.insertElements(textarea, children);
        textarea.addEventListener('input', () => this.fixScrollbar());
    }
    static getPattern() {
        return SmartInsertTextarea.Config.smartInsert.pattern;
    }
    update() {
        this.fixScrollbar();
        this.highlight.update();
    }
    getTextareaElement() {
        return this.textarea;
    }
    getContainerElement() {
        return this.container;
    }
    onDisabled(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' &&
                mutation.attributeName === 'disabled') {
                const textarea = mutation.target;
                for (const div of this.highlightDivs) {
                    div.classList.toggle('disabled', textarea.disabled);
                }
            }
        }
    }
    fixScrollbar() {
        const hasScrollbar = this.isScrollbarVisible();
        this.container.classList.toggle('add-scrollbar', hasScrollbar);
        this.highlightDivs.forEach(div => {
            div.scrollTop = this.textarea.scrollTop;
        });
    }
    isScrollbarVisible() {
        return this.textarea.scrollHeight > this.textarea.clientHeight;
    }
    insertElements(anchor, elements) {
        let textareaPassed = false;
        for (const element of elements) {
            const position = textareaPassed ? 'afterend' : 'beforebegin';
            if (element === anchor) {
                textareaPassed = true;
                continue;
            }
            anchor.insertAdjacentElement(position, element);
        }
    }
}
SmartInsertTextarea.Config = {
    smartInsert: {
        pattern: new RegExp('\\${instance\\/[\\[\\]0-9\\.a-z\\/]+?}', 'g'),
        css: 'smart-insert-mark'
    }
};
