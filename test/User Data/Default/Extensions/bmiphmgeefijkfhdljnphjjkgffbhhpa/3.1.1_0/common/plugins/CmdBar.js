/**
 * Adds the command bar and its functionality to the header
 */
addPlugin('MainPage', 'interactive', function(){
    // Create the raw HTML template
    const template = document.createElement('template');
    template.innerHTML = `
        <div id="smwebcmdbar-wrapper">
            <div id="smwebcmdbar">
                <div class="smartease-logo" title="SMartease - Options"></div>
                <div id="smweb-placeholder">
                <div class="smwebcmdbar-text"><b>SMartease</b> &ndash; Work smarter in SM9, handle tickets with ease!</div>
            </div>
            <div id="smartease-notifier" class="smwebcmdbar-text"></div>
            </div>
        </div>`;
    document.body.appendChild(template.content);

    // On logo click -> open options page
    document.querySelector('.smartease-logo').addEventListener('click', top.SMweb.openOptions);

    // Create dropdown menu
    SMweb.createDropdown = function(dd){ // { id: title: view: hide: clickHandler: }
        const template = document.createElement('template');
        template.innerHTML = `
            <div id="${dd.id}-wrapper" title="">
                <div id="${dd.id}" class="cmdbarbuttons inactive">
                    <input class="Button" type="button" value="${dd.title}">
                    <div class="Content"></div>
                </div>
            </div>`;

        const placeholder = document.getElementById('smweb-placeholder');
        if (placeholder && placeholder.remove){
            placeholder.remove();
        }
        document.getElementById('smwebcmdbar').insertBefore(template.content, document.getElementById('smartease-notifier'));

        const temp = document.getElementById(dd.id);
        const tempContent = document.querySelector(`#${dd.id} .Content`);

        temp.addEventListener('click', (ev) => {
            if (!(ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey)){
                dd.clickHandler(temp, tempContent, ev);
            }
        }, true);

        const cmdBar = top.SMweb.cmdBar = top.SMweb.cmdBar || {
            leaveId: null,
            leaveTimer: null,
            leave: null
        };

        temp.addEventListener('mouseenter', function(){
            if (cmdBar.leaveTimer){
                clearTimeout(cmdBar.leaveTimer); cmdBar.leaveTimer = null;
                if (cmdBar.leaveId !== dd.id) cmdBar.leave();
            }
            if (!cmdBar.leaveId){
                tempContent.classList.toggle('hover', true);
                cmdBar.leaveId = dd.id;
                if (typeof dd.view === 'function'){
                    dd.view(temp, tempContent);
                }
            }
        }, false);

        temp.addEventListener('mouseleave', function(){
            if (!cmdBar.leaveTimer){
                cmdBar.leaveTimer = setTimeout(cmdBar.leave = function(){
                    tempContent.classList.toggle('hover', false);
                    cmdBar.leaveTimer = cmdBar.leaveId = null;
                    if (typeof dd.hide === 'function'){
                        dd.hide(temp, tempContent);
                    }
                }, 200);
            }
        }, false);

        // Set each listeners, so on changing tab, functionality test will be done in the specific .js files
        const listenerNames = ['hpsmPageLoad', 'hpsmDetailActivate', 'hpsmListActivate', 'resizeRecordList', 'initRecordList'];
        if (top.document.readyState === 'complete' && typeof dd.continuous === 'function') {
            dd.continuous(temp, tempContent);
            listenerNames.forEach(function (listenerName) {
                if (dd.id === 'ciActions'){
                    top.document.documentElement.addEventListener(listenerName, function () {
                        while (tempContent.firstChild) { tempContent.removeChild(tempContent.firstChild);}
                        dd.continuous.call(null, temp, tempContent);
                    }, false);
                } else {
                    top.document.documentElement.addEventListener(listenerName, function () {
                        dd.continuous.call(null, temp, tempContent);
                    }, false);
                }
            });
        }

        return null;
    };

});

/**
 * Shows the clickable update icon if SMartease was updated recently
 */
addPlugin('MainPage', 'complete', function () {
    function showMessage(text) {
        const element = document.getElementById('smartease-notifier');
        element.innerHTML = text;
    }

    chrome.runtime.sendMessage(SMweb.extensionId, {
        request: 'wasExtensionUpdated'
    }, function (updated) {
        if (updated) {
            showMessage(`<a href="https://yam.telekom.de/docs/DOC-552036" title="SMartease has been updated - click to see what's new!" target="_blank">&#xea89;</a>`);
        }
    });

    document.getElementById('smartease-notifier').addEventListener('click', function () {
        showMessage('');
    });
});
