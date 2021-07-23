var currentClipboard = null;
var currentTimer = null;


function runClipboardCommand(command, input) {
	const el = document.createElement('textarea');
	el.value = input;
	document.body.appendChild(el);
	el.select();
	let success = document.execCommand(command);
	let elValue = el.value;
	document.body.removeChild(el);
	return (command === 'Copy' ? success : elValue);
}

function setClipboard(input) {
	return runClipboardCommand('Copy', input);
}

function getClipboard() {
	return runClipboardCommand('Paste', ' ');
}

function conditionalClearClipboard() {
	if (currentClipboard !== null && getClipboard() === currentClipboard.value) {
		setClipboard(' ');
	}
	currentClipboard = null;
	currentTimer = null;
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request && request.value) {
		var success = setClipboard(request.value);
		currentClipboard = { "value": request.value, "windowId": sender.tab.windowId };
		sendResponse({ "success": success });
		var clearEnableAuto = storage.getValue('ss.clearEnableAuto', 'false') === 'true';
		var clearAfterInterval = storage.getValue('ss.clearAfterInterval', 30);
		if (clearEnableAuto) {
			if (currentTimer !== null) {
				window.clearTimeout(currentTimer);
			}
			currentTimer = window.setTimeout(conditionalClearClipboard, clearAfterInterval * 1000);
		}
	}
});

chrome.windows.onRemoved.addListener(function (windowId) {
	var clearPasswordOnExit = storage.getValue('ss.clearPasswordOnExit', true);
	if (clearPasswordOnExit && currentClipboard !== null && currentClipboard.windowId === windowId) {
		conditionalClearClipboard();
	}
});