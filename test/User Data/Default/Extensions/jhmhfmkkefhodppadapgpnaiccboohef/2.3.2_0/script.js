var ClipBoard = {
    onAddClipboard: function (e) {
        var text = e.target.getAttribute('TextToCopy');
        chrome.runtime.sendMessage({ message: 'SS', value: text ? text : ' ' }, function () {
            e.target.setAttribute('handledCopy', true);
            e.target.removeAttribute('TextToCopy');
        });
    }
}

document.addEventListener('SecretServerClipboardEvent', function (e) {
    ClipBoard.onAddClipboard(e);
}, false);