class EventEmitter {
    constructor() {
        this.listenerManager = {};
    }
    on(eventType, listener) {
        if (!eventType || !listener) {
            return;
        }
        if (!this.listenerManager[eventType]) {
            this.listenerManager[eventType] = [];
        }
        this.listenerManager[eventType].push(listener);
    }
    fireEvent(event) {
        if (!this.listenerManager[event.type]) {
            return;
        }
        this.listenerManager[event.type].forEach(listener => {
            listener(event);
        });
    }
}
