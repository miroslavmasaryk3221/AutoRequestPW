class CancellationToken {
    constructor() {
        this.cancelled = false;
    }
    cancel() {
        this.cancelled = true;
    }
    isCancelled() {
        return this.cancelled;
    }
    throwIfCancelled() {
        if (this.isCancelled()) {
            throw new Error(CancellationToken.CANCELLED);
        }
    }
}
CancellationToken.CANCELLED = 'Cancelled.';
