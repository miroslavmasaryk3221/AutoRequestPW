 var fadeTimeout = null;

    function setVersion() {
        var version = document.getElementById("version");
        if (chrome.app.getDetails() !== null) {
            var details = chrome.app.getDetails();
            version.innerHTML = "Version: " + details.version;
        }
        else {
            version.innerHTML = "Local View";
        }
    }

    function setupUIState() {
        if (!document.getElementById('clearEnableAutoCheckBox').checked) {
            document.getElementById('clearAfterIntervalTextBox').disabled = 'disabled';
        }
        else {
            document.getElementById('clearAfterIntervalTextBox').removeAttribute('disabled');
        }
    }

    function saveSettings() {
        var clearEnableAuto = document.getElementById('clearEnableAutoCheckBox').checked;
        var clearAfterInterval = document.getElementById('clearAfterIntervalTextBox').value;
        var clearOnExit = document.getElementById('clearPasswordOnExitCheckBox').checked;
        storage.setValue('ss.clearAfterInterval', parseInt(clearAfterInterval));
        storage.setValue('ss.clearPasswordOnExit', clearOnExit);
        storage.setValue('ss.clearEnableAuto', clearEnableAuto);
        setSettings();
        var alertElement = document.getElementById('alert');
        alertElement.className = 'visible';
        if (fadeTimeout !== null) {
            window.clearTimeout(fadeTimeout);
        }
        fadeTimeout = window.setTimeout(function() {
            alertElement.className = '';
            fadeTimeout = null;
        }, 3000);
    }

    function setSettings() {
        var clearPasswordOnExit = storage.getValue('ss.clearPasswordOnExit', 'true');
        var clearEnableAuto = storage.getValue('ss.clearEnableAuto', 'false');
        var clearAfterInterval = storage.getValue('ss.clearAfterInterval', 30);
        document.getElementById('clearPasswordOnExitCheckBox').checked = clearPasswordOnExit === 'true';
        document.getElementById('clearEnableAutoCheckBox').checked = clearEnableAuto === 'true';
        document.getElementById('clearAfterIntervalTextBox').value = clearAfterInterval;
        setupUIState();
    }

    function setAutoClear(e) {
        if (e.target.checked) {
            document.getElementById('clearPasswordOnExitCheckBox').checked = true;
        }
        setupUIState();
    }

    function setClearOnExit(e) {
        if (!e.target.checked) {
            document.getElementById('clearEnableAutoCheckBox').checked = false;
        }
        setupUIState();
    }

    function onLoad() {
        setSettings();
        setVersion();
        document.getElementById('clearEnableAutoCheckBox').addEventListener('change', setAutoClear, false);
        document.getElementById('clearPasswordOnExitCheckBox').addEventListener('change', setClearOnExit, false);
        document.getElementById('settingsForm').addEventListener('submit', function(e) { e.returnValue = false; saveSettings(); }, false);
        document.getElementById('year').innerHTML = new Date().getFullYear();
        window.addEventListener('storage', setSettings, false);
    }

    window.addEventListener('load', onLoad, false);