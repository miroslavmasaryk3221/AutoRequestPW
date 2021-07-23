/**
 * Turns an input field into a textarea
 */
addPlugin('DetailPage', 'complete', function() {
    const expandHeight = function(varName, percent) {
        try {
            const tab = top.cwc.getActiveTab();
            const win = tab.getDetailFrameWindow() || tab.getFrameWindow();
            const activeNotebookPage = document.querySelector('div[class~="notebookPage"][style*="display: inline"]');
            if (!activeNotebookPage) {
                return;
            }
            const el = activeNotebookPage.querySelector('textarea[dvdvar="' + varName + '"]');
            if (!el) {
                return;
            }
            win.hpsm.storeOrigElValue(el, 0);

            const currentHeight = parseInt(win.getComputedStyle(el).height);
            const newHeight = (el.tpzOrigHeight * percent) / 100.0;

            if (Math.floor(newHeight) !== Math.floor(currentHeight)) {
                win.hpsm.expandHeight(undefined, el.id, newHeight - currentHeight);
            }
        } catch (e) {
            console.error('InputToTextarea.js, varName: "' + varName + '" expandHeight:', e);
        }
    };

    const getTitleSelector = () => top.SMweb.isIncidentPage() && top.SMweb.isDetailOrListDetailPage()
        ? 'name ="instance/brief.description"'
        : window.tpz_formTitle.startsWith('Problem: P')
            ? 'name ="instance/brief.description"'
            : window.tpz_formTitle.startsWith('Change Task T')
                ? 'name ="instance/middle/brief.desc"'
                : window.tpz_formTitle.startsWith('Change C')
                    ? 'name ="instance/header/brief.description"'
                    : null;

    const resize = function(selector, title) {
        selector = selector || getTitleSelector();
        title = title || document.querySelector('textarea[' + selector + ']');
        if (selector && title) {
            const lineHeight = parseInt(title.style.lineHeight);
            title.style.height = lineHeight + 'px';
            const height = Math.min(title.scrollHeight + 2, 2 * lineHeight);
            title.style.height =  height + 'px';
        }
        if (window.tpz_formTitle.startsWith('Update Incident Number IM')) {
            expandHeight('instance/action/action', 150); // IM details/description  resolution/description
            expandHeight('var/tsi.lw.update.action.sort/tsi.lw.update.action.sort', 150); // IM Updates
            expandHeight('instance/update.action/update.action', 300); // Closed IM Updates
            expandHeight('var/pmc.actions/pmc.actions', 300); // IM Worklog Update
        } else if (window.tpz_formTitle.startsWith('Problem: P')) {
            // Problem Detail Description dvdvar="instance/description/description"
            expandHeight('instance/description/description', 300);
            // orig: 170 new: 510  result: 850 == new + 2 * orig ?
        }
    };

    const convertTitleToTextarea = function() {
        try {
            const selector = getTitleSelector();
            if (!selector) {
                return;
            }
            let title = document.querySelector('input[' + selector + ']');
            if (!title) {
                return;
            }
            const text = title.value;
            const cssText = document.defaultView.getComputedStyle(title).cssText;

            title.outerHTML = title.outerHTML.replace(/<input/i, '<textarea');
            title = document.querySelector('textarea[' + selector + ']');
            title.value = text;
            title.style.cssText = cssText;
            title.style.width = '100%';
            title.style.height = 'auto';
            title.parentElement.style.height = 'auto';
            title.parentElement.parentElement.style.height = 'auto';
            title.parentElement.parentElement.style.zIndex = 10;
            title.style.wordBreak = 'break-all';
            resize(selector, title);
        } catch (e) {
            console.error(e);
        }
    };

    window.addEventListener('resize', function() {
        resize();
    });

    top.document.documentElement.addEventListener('hpsmNotebookTabSelected', function(){
        resize();
    });

    top.document.documentElement.addEventListener('forceUnmaskWindow', function() {
        convertTitleToTextarea();
    });
});