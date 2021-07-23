class Notifier {
    static message(message, timeout) {
        Notifier.displayNotification(message, 'general', timeout);
    }
    static error(message, timeout) {
        Notifier.displayNotification(message, 'error', timeout);
    }
    static success(message, timeout) {
        Notifier.displayNotification(message, 'success', timeout);
    }
    static displayNotification(message, type, timeout) {
        if (!timeout) {
            timeout = 1500 + message.length * 30;
        }
        if (Notifier.element) {
            Notifier.fadeOut();
        }
        setTimeout(() => {
            Notifier.createMessage(message, type);
            Notifier.fadeOut(timeout);
        }, 1);
    }
    static createMessage(message, type) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('smartease-notifier-wrapper');
        const background = document.createElement('div');
        background.classList.add('smartease-notifier-background-strip');
        wrapper.appendChild(background);
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('smartease-notifier', type);
        wrapper.appendChild(messageDiv);
        const span = document.createElement('span');
        span.innerHTML = message;
        messageDiv.appendChild(span);
        const close = document.createElement('span');
        close.classList.add('close');
        close.addEventListener('click', Notifier.onClickClose);
        messageDiv.appendChild(close);
        background.addEventListener('click', Notifier.onClickClose);
        Notifier.element = wrapper;
        document.body.appendChild(Notifier.element);
    }
    static onClickClose(event) {
        const target = event.target;
        if (Notifier.element.contains(target)
            && !target.classList.contains('close')
            && !target.classList.contains('smartease-notifier-background-strip')) {
            return;
        }
        document.removeEventListener('click', Notifier.onClickClose);
        Notifier.fadeOut();
    }
    static fadeOut(timeout = 0) {
        const start = Notifier.lastFadeOutStart = new Date().getTime();
        setTimeout(() => {
            if (!Notifier.element || start !== Notifier.lastFadeOutStart) {
                return;
            }
            const element = Notifier.element;
            Notifier.element = null;
            element.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(element);
            }, 200);
        }, timeout);
    }
}
