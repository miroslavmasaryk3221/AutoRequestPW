/**
 * Big viewer for tables with copy option
 */
addPlugin('MainPage', 'loading', function(){
    // Get key structure value for object
    const value = (obj, ...keys) => keys.reduce((a, b) => (a||{})[b], obj);

    const removeWhiteSpace = function(topNode){
        let node, next = topNode.firstChild;
        while ((node = next)){
            next = node.nextSibling;
            if (node.firstChild) removeWhiteSpace(node);
            else if (node.nodeType === Node.TEXT_NODE && !node.nodeValue.trim()) node.remove();
        }
    };

    const CopyTableToClipboard = function(event){
        event.stopPropagation();

        const doc = event.target.ownerDocument;
        Array.from(doc.getElementsByClassName('audible-text')).forEach(x => x.remove());
        const sel = doc.defaultView.getSelection();
        sel.selectAllChildren(doc.getElementsByClassName('x-window-bwrap')[0]);
        doc.execCommand('copy');
        sel.removeAllRanges();
    };

    top.document.documentElement.addEventListener('hpsm.Table.magnifyWin', function(ev){
        const op     = value(ev, 'detail', 'op') || null;
        const newVal = value(ev, 'detail', 'newVal') || null;
        const oldVal = value(ev, 'detail', 'oldVal') || null;

        if (op === 'set' && newVal !== null && newVal !== oldVal){
            const win = newVal;
            win.header.dom.ownerDocument.defaultView.CopyTableToClipboard = CopyTableToClipboard;

            const html = `
                <div id="copytabletoclipboard">
                    <input type="button" onclick="CopyTableToClipboard(event);" value="Copy table to clipboard"/>
                </div>`;

            const div = top.document.createElement('div');
            div.innerHTML = html;
            removeWhiteSpace(div);
            win.header.dom.getElementsByClassName('x-window-header-text')[0].prepend(div);
        }
    });
});
