document.addEventListener('DOMContentLoaded', reloadOptions);

/**
 * Checks form for changes and errors, and disables
 * saving until a change is made and there are no errors
 */
function checkForm() {
    let errorMsg, error = false;
    const NewruleJson = document.querySelector('#NewruleJson');
    errorMsg = '';
    try {
        NewruleJson.value = NewruleJson.value.trim();
        if (NewruleJson.value !== '') {
            JSON.parse(NewruleJson.value);
        }
    } catch (e) {
        errorMsg = e.message;
    }

    NewruleJson.title = errorMsg;
    NewruleJson.setCustomValidity(errorMsg);
    error = error || !!errorMsg;

    const import_options = document.querySelector('#import_options');
    const rules_txt = document.querySelector('#rules_txt');
    const rules_copy = document.querySelector('#rules_copy');
    import_options.disabled = error;
    rules_txt.disabled = error;
    rules_copy.disabled = error;
}

/**
 * Refreshes the options page
 */
function reloadOptions() {
    chrome.runtime.sendMessage({
        request: 'storage.get',
        autoRefresh: 0,
        Rules: {}
    }, function (options) {
        document.querySelector('#autoRefresh').value = options.autoRefresh / 60;
        document.querySelector('#NewruleJson').value = JSON.stringify(options.Rules, null, 4);

        document.querySelector('#options_rules_edit_wrapper').classList.remove('show_popup');
        document.querySelector('#export_options').style.display = 'inline-block';
        document.querySelector('#options_title').classList.remove('disabled_input');
        document.querySelector('#options_body').classList.remove('disabled_input');

        /**
         * Changing overflow to auto so scroll is re-enabled.
         * To prevent jumping on popups, we set body.style.top to -window.pageYOffset.
         * We can use this to return there and prevent more jumping
         */
        document.body.style.overflowY = 'auto';
        document.querySelector('#import_options').disabled = true;
    });
}

/**
 * User input validation
 */
document.addEventListener('input', function(ev) {
    //validating the entries of newrulejson
    switch (ev.target.id) {
        case 'NewruleJson':
            checkForm();
            break;
        case 'autoRefresh':
            if (!ev.target.checkValidity()) {
                document.querySelector('#save_options').disabled = true;
            } else {
                document.querySelector('#save_options').disabled = false;
            }
            break;
    }
});

/**
 * Click listeners (might be a good idea to move from
 * switch statement to separate listeners for transparency)
 */
document.addEventListener('click', function(ev) {
    switch (ev.target.id) {
        case 'save_options': {
            //save the autorefresh
            let autoRefresh = parseInt(document.querySelector('#autoRefresh').value.trim());
            autoRefresh = autoRefresh * 60;

            chrome.runtime.sendMessage({
                request: 'storage.set',
                autoRefresh: autoRefresh,
            });

            chrome.tabs.query({
                url: chrome.runtime.getManifest().content_scripts[0].matches
            }, function (tabs) {
                const code = `runScript('[top.SMweb.autoRefresh=${autoRefresh}, top.SMweb.scheduleRefresh()];');`;
                tabs.forEach(tab => chrome.tabs.executeScript(tab.id, {
                    code: code
                }));
            });

            Notifier.success('Modifications have been saved!');

            reloadOptions();
            break;
        }
        case 'export_options':
            document.querySelector('#options_title').classList.add('disabled_input');
            document.querySelector('#options_rules_edit_wrapper').style.top = window.pageYOffset;
            document.querySelector('#options_rules_edit_wrapper').classList.add('show_popup');
            document.querySelector('#options_body').classList.add('disabled_input');
            document.body.style.overflowY = 'hidden';
            document.querySelector('#NewruleJson').focus();
            document.querySelector('#NewruleJson').scrollTop = 0;
            document.querySelector('#NewruleJson').setSelectionRange(0, 0);
            break;

        case 'import_cancel':
        case 'rules_x':
            reloadOptions();
            break;

        case 'import_options': {
            const textarea = document.querySelector('#NewruleJson');
            textarea.value = textarea.value.trim();
            if (textarea.value === '') {
                textarea.value = '[]';
            }
            try {
                const actions = JSON.parse(textarea.value);
                importRules(actions);
            } catch (ex) {
                if (ex.name === 'TypeError') {
                    Notifier.error(ex.message + '. Unsupported format.');
                } else {
                    Notifier.error(ex.message || ex);
                }
                // throw ex;
            }
            break;
        }
        case 'rules_txt':
            JSONtoTXT();
            break;

        case 'rules_copy':
            copyToClipboard(document.querySelector('#NewruleJson').value);
            break;

        case 'txt_import':
            reloadOptions();
            break;
    }
});

/**
 * Enter and Escape listeners
 */
document.addEventListener('keyup', function(ev) {
    switch (ev.key) {
        // Pressing enter
        case 'Enter': {
            switch (ev.target.id) {
                case 'autoRefresh':
                    ev.target.blur();
                    document.querySelector('#save_options').click();
                    break;
                default:
                    ev.preventDefault();
            }
            break;
        }
        case 'Escape': { // Leave popups on escape
            if (document.getElementsByClassName('show_popup').length > 0){
                reloadOptions();
            }
        }
    }
});

/**
 * Imports multiple actions from NewrulesJson textarea
 *
 * @param actions array of Actions
 */
function importRules(actions) {
    const imported = [];
    for (const action of actions) {
        const actionInstance = Action.from(action);
        if (actionInstance) {
            imported.push(actionInstance);
        } else {
            throw action.title + ' is not a valid action. Please modify to continue!\n';
        }
    }

    const answer = confirm('The import overwrites all existing Ticket Actions!\nDo you want to continue?');
    if (answer) {
        chrome.runtime.sendMessage({
            request: 'storage.set',
            Rules: JSON.parse(JSON.stringify(imported))
        });

        reloadOptions();
        Notifier.success('Ticket Actions have been successfully saved!');
    }
}

/**
 * Converts NewruleJson into a downloadable .txt file
 */
function JSONtoTXT() {
    const Rules = JSON.parse(document.querySelector('#NewruleJson').value.trim()); //formating purpose
    const ReportTitle = 'Actions_export';

    let fileName = 'SMartease';
    // Replace spaces in the title with underscores
    fileName += ReportTitle.replace(/ /g, '_');

    // Initialize file format requested (csv or xls)
    const uri = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(Rules, null, 4));
    const link = document.createElement('a');

    link.href = uri;

    // Make it hidden so it doesn't effect page layout
    link.style = 'display:none';
    link.download = fileName + '.txt';

    // This part will append the anchor tag and remove it after automatic click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function copyFeedback() {
    const originalIcon = document.querySelector('#rules_copy').value;
    const feedbackIcon = '\ue962';

    document.querySelector('#rules_copy').value = feedbackIcon;
    document.querySelector('#rules_copy').classList.add('ok');

    setTimeout(function () {
        document.querySelector('#rules_copy').value = originalIcon;
        document.querySelector('#rules_copy').classList.remove('ok');
    }, 1000);
}

/**
 * Copies an object to the clipboard then shows a checkmark on success
 *
 * @param {object} object
 */
async function copyToClipboard(object) {
    try {
        await navigator.clipboard.writeText(object);

        copyFeedback();
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}
