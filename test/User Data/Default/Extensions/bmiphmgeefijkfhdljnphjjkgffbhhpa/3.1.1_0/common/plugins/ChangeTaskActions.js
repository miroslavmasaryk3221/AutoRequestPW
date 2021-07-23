/*
 * Task overtime checker function
 */
addPlugin('DetailPage', 'complete', function() {

    // Model for test changes: SIT-C001224054
    const addOutoftimeCheckListener = async function() {
        // let plannedStart = top.SMweb.getFieldValue('instance/header/planned.start');
        // let actualStart = top.SMweb.getFieldValue('instance/actualStart');

        const plannedEnd = top.SMweb.getFieldValue('instance/header/planned.end');
        const actualEnd = top.SMweb.getFieldValue('instance/actualEnd');

        const okBTN = top.SMweb.topToolbarFind('OK');
        if (okBTN){
            okBTN.btnEl.dom.addEventListener('click', function(event) {
                if (actualEnd > plannedEnd) {
                    if (!confirm('You are trying to close the task in overtime!\nDo you really want to continue?')) {
                        event.stopPropagation();
                    }
                }
            });
        }
    };

    if (document.readyState === 'ready' || document.readyState === 'complete') {
        top.document.documentElement.addEventListener('forceUnmaskWindow', function() {
            const tab = top.cwc.getActiveTab();

            if (tab.title.startsWith('Task') && tab.title.endsWith('Close Prompt')) {
                addOutoftimeCheckListener();
            }
        });
    }

});


/*
 * Show parent function
 */
addPlugin('DetailPage', 'complete', function() {

    const clickShowParentButtonFromMenuItems = async function() {
        const tab = top.cwc.getActiveTab();
        const context = tab.dataStore.displayType === 'listdetail' ? tab.getFrameDocument() : tab.el.dom;
        const buttonWrapper = context.getElementsByClassName('x-btn-more-noicon')[0];
        if (buttonWrapper) {
            const moreButton = buttonWrapper.getElementsByTagName('button')[0];
            if (moreButton) {
                await new Promise(function(resolve) {
                    top.SMweb.waitForEvent('forceUnmaskWindow').then(resolve);
                    top.SMweb.topToolbarClick(moreButton.textContent + '/Show Parent Change');
                });
            }
        }
    };

    const createShowParentButton = async function() {

        // Create a template which is the holder for the custom html code
        const template = top.document.createElement('template');
        // Creating html code and adding div and tags
        const html = `
        <div id="showParentButton">
            <input type="button" class="ShowParent" value="&#xea91" title="Show Parent Change">
        </div>`;

        // Adding the html variable into the template
        template.innerHTML = html;

        const labels = document.getElementsByClassName('Label');
        let changePhase;
        for (const label of labels) {
            if (label.childNodes[0].innerText === 'Parent Change:') {
                changePhase = label.nextSibling;
                break;
            }
        }
        if (changePhase) {
            const parentChangeDiv = changePhase.firstElementChild;
            parentChangeDiv.style.display = 'flex';
            parentChangeDiv.style.paddingRight = '2px';
            parentChangeDiv.appendChild(template.content);
            const showParentButton = document.getElementById('showParentButton');
            showParentButton.addEventListener('click', function() {
                clickShowParentButtonFromMenuItems();
                // top.SMweb.topToolbarClick('Tovább/Show Parent Change') || top.SMweb.topToolbarClick('More/Show Parent Change');
            });
        }
    };

    if (document.readyState === 'ready' || document.readyState === 'complete') {
        top.document.documentElement.addEventListener('forceUnmaskWindow', function() {
            const tab = top.cwc.getActiveTab();
            const temp = document.getElementById('showParentButton');

            if (tab.title.startsWith('Change Task T') && !temp) {
                createShowParentButton();
            }
        });
    }
});
