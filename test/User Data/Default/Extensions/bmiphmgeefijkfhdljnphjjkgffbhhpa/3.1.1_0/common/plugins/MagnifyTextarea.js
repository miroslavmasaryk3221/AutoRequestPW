/**
 * Big editor for the small textareas
 */
addPlugin('MainPage', 'loading', function() {
    let buttonSize;
    let baseIndent;
    let magnifiedElement;
    const buttonList = [];
    const magnifyButton = document.createElement('div');
    magnifyButton.className = 'magnify-textarea-button';
    magnifyButton.title = 'Magnify (Ctrl+M)';

    SMweb.openMagnified = function(content, title) {
        if (content && title && !cwc.dialogBox) {
            const className = content.tagName === 'TEXTAREA' ? 'no-overflow' : '';

            //ext js 3.4 documentation - https://docs.sencha.com/extjs/3.4.0/#!/api/Ext.Window
            var wndw = new Ext.Window({
                cls: 'sm-popup',
                title: '<div class="smartease-logo"></div>' + title,
                layout: 'fit',
                width: Ext.getBody().getViewSize().width * 0.65,
                height: Ext.getBody().getViewSize().height * 0.8,
                maximizable: true,
                modal: true, //masks the background
                border: false,
                shim: false,
                stateful: false,
                bwrapCfg: {
                    cls: 'x-window-bwrap smartease-magnify-wrap',
                    tabIndex: 0
                },
                headerCfg: {
                    cls: 'x-window-header'
                },
                bodyCfg: {
                    cls: 'sm-popup-body padding-1'
                },
                constrain: true, //repositions the Ext.Window when the browser window is resized
                items: {
                    xtype: 'container',
                    contentEl: content,
                    id: 'magnified-textbox',
                    cls: className,
                    listeners: {
                        beforedestroy: function(panel) {
                            if (content.tagName === 'TEXTAREA') {
                                magnifiedElement.value = panel.contentEl.value;
                            }
                        }
                    }
                },
                listeners: {
                    show: function(wndw) {
                        if (content.tagName === 'TEXTAREA') {
                            setTimeout(function() {
                                wndw.items.map['magnified-textbox'].contentEl.focus();
                            }, 10);
                        }
                    },
                    close: function() {
                        if (magnifiedElement) {
                            if (magnifiedElement.wrapWidget && magnifiedElement.wrapWidget.editMode) {
                                magnifiedElement.wrapWidget.editMode(); //return focus to the magnified element
                            } else {
                                magnifiedElement.focus(); //fallback just in case
                            }
                        }

                        delete cwc.dialogBox;
                    }
                }
            });
            wndw.show();
            cwc.dialogBox = wndw;
        }
    };

    // 'Label' can be either a .Label element, a legend tag or in absence of those
    // the current .Notebook's .notebookTabSelected
    function findTextboxLabel(element) {
        /*
        4 known scenarios for usable label placement:
            1-2. Label is the previous sibling of .MultiText, e.g.: Incident/Updates
        ->      <span class="Label">    |    <legend>
                <div class="MultiText"> |    <div class="MultiText">
                    <div>               |        <div>
                        <textarea>      |            <textarea>

        */
        const borderElement = element.closest('.MultiText');
        if (borderElement) {
            let label = borderElement.previousElementSibling;
            if (label && (label.className === 'Label' || label.tagName === 'LEGEND')) {
                return label.textContent;
            } else {
                /*
                3. Label is after an outer group element, e.g.: Search Changes/Multiple IDs
                ->  <legend>
                    <div widgettype="group">
                        <div widgettype="group" class="groupBox">
                            ...
                                <textarea>
                            ...
                ->  <span class="Label">
                */
                let group = borderElement.closest('.groupBox');
                if (group) {
                    group = group.parentElement;
                    label = group.nextElementSibling;
                    if (label && label.className === 'Label') {
                        return label.textContent;
                    }
                    label = group.previousElementSibling;
                    if (label && label.tagName === 'LEGEND') {
                        return label.textContent;
                    }

                    return label.textContent;
                } else {
                    /*
                    4. Textarea is inside a notebook tab with no labels around it, e.g.: Change Task/Work Notes/Work Notes
                        <div class="Notebook">
                        <div class="notebookBackground">
                            ...
                    ->          <a class="notebookTabSelected">
                            ...
                        <div class="notebookPage">
                            ...
                                <textarea>
                    */
                    const notebook = borderElement.closest('.Notebook');
                    if (notebook) {
                        label = notebook.querySelector('.notebookTabSelected');
                        if (label) {
                            return label.textContent;
                        }
                    }
                }
            }
        }

        return '';
    }

    // Open the big editor
    function magnifyTextarea(target) {
        magnifiedElement = target;
        const view = magnifiedElement.nextElementSibling; //its next sibling is a View div that is shown when the textarea is not focused
        magnifiedElement.blur(); //the View's content is updated by the textarea's onBlur event
        if (view) {
            let content;
            if (magnifiedElement.readOnly) {
                content = document.createElement('div');
                content.innerHTML = view.innerHTML;
            } else {
                content = document.createElement('textarea');
                content.value = magnifiedElement.value;
                content.setSelectionRange(magnifiedElement.selectionStart, magnifiedElement.selectionEnd);
                content.onkeydown = function(e) {
                    if (e.keyCode === 9 || e.which === 9) { // Tab key support
                        e.preventDefault();
                        var s = this.selectionStart;
                        this.value = this.value.substring(0, this.selectionStart) + '\t' + this.value.substring(this.selectionEnd);
                        this.selectionEnd = s + 1;
                    }
                };
            }
            content.tabIndex = 1; // Needed for div focusability

            top.SMweb.openMagnified(content, findTextboxLabel(target).replace(':', ''));
        }
    }

    // Indent button on right by 2 + scrollbar size, third parameter is optional TODO: solve positioning with CSS instead if possible
    function positionButtonBy(button, textarea, view) {
        if (button && textarea) {
            if (view && view.style.display !== 'none') {
                button.style.right = baseIndent + view.offsetWidth - view.clientWidth + 'px';
            } else {
                button.style.right = baseIndent + textarea.offsetWidth - textarea.clientWidth + 'px';
            }
        }
    }

    document.documentElement.addEventListener('hpsmPageLoad', function() {
        const tab = cwc.getActiveTab();
        const dt = tab.dataStore.displayType;
        let frameDocument;
        if (dt === 'listdetail') {
            // null in case SM9 is refreshed on a listdetail view
            frameDocument = tab.getDetailFrameDocument();
        }
        // fallback if null
        frameDocument = frameDocument || tab.getFrameDocument();

        const textareaWrappers = frameDocument.getElementsByClassName('xTextArea');

        for (const wrapper of textareaWrappers) {
            const textarea = wrapper.children[0];
            const view = textarea.nextElementSibling;

            // Avoid adding duplicate buttons
            if (!wrapper.querySelector('.' + magnifyButton.className)) {
                const button = wrapper.appendChild(magnifyButton.cloneNode());
                button.relatedTextarea = textarea;
                button.relatedView = view;
                buttonList.push(button);

                if (buttonSize == null) { // Calculate these only once
                    const buttonStyle = getComputedStyle(button);
                    buttonSize = buttonStyle.fontSize;
                    baseIndent = Number.parseInt(buttonStyle.right.replace('px', ''));
                }

                if (view.scrollHeight > view.clientHeight) { // If content is overflowing
                    positionButtonBy(button, view);
                }

                if (!textarea.readonly) {
                    textarea.addEventListener('input', function() {
                        if (textarea.scrollHeight > textarea.clientHeight) {
                            positionButtonBy(button, textarea);
                        }
                    });
                }

                button.addEventListener('click', function() {
                    magnifyTextarea(textarea);
                });
                // CTRL + M binding
                frameDocument.documentElement.addEventListener('keydown', function(event) {
                    if (event.target.tagName === 'TEXTAREA' && event.key.toUpperCase() === 'M' && event.ctrlKey && !event.shiftKey && !event.altKey) {
                        magnifyTextarea(event.target);
                    }
                });
            }

            textarea.style.paddingRight = buttonSize;
            view.style.paddingRight = buttonSize;
        }
    });

    // Reposition buttons
    window.addEventListener('resize', function() {
        buttonList.forEach(button => positionButtonBy(button, button.relatedTextarea, button.relatedView));
    });

    // Reposition buttons on notebook tab activation
    document.documentElement.addEventListener('hpsmNotebookTabSelected', function() {
        buttonList.forEach(button => positionButtonBy(button, button.relatedTextarea, button.relatedView));
    });
});
