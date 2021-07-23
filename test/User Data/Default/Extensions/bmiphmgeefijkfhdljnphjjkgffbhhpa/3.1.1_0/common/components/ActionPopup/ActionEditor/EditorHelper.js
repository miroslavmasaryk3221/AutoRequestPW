class EditorHelper {
    static isValidShorthand(value) {
        return Object.keys(EditorHelper.Shorthand).includes(value);
    }
    static getAcResults(config) {
        if (!config.autocomplete) {
            return;
        }
        let results = config.autocomplete.map(value => {
            const result = {
                label: value,
                value: value
            };
            return result;
        });
        if (config.paramIndex === -1) {
            const deepClone = JSON.parse(JSON.stringify(EditorHelper.ShorthandACResult));
            results = [...results, ...deepClone];
        }
        return results;
    }
}
EditorHelper.Shorthand = {
    Accept: {
        type: Operation.Type.StatusUpdate,
        params: {
            status: Operation.TicketStatus.Accepted
        }
    },
    'Pending Customer': {
        type: Operation.Type.StatusUpdate,
        params: {
            status: Operation.TicketStatus.PendingCustomer
        }
    },
    'Pending Vendor': {
        type: Operation.Type.StatusUpdate,
        params: {
            status: Operation.TicketStatus.PendingVendor
        }
    },
    'Working Solution': {
        type: Operation.Type.StatusUpdate,
        params: {
            status: Operation.TicketStatus.WorkingSolution
        }
    },
    WIP: {
        type: Operation.Type.StatusUpdate,
        params: {
            status: Operation.TicketStatus.WorkInProgress
        }
    },
    'Work in Progress': {
        type: Operation.Type.StatusUpdate,
        params: {
            status: Operation.TicketStatus.WorkInProgress
        }
    }
};
EditorHelper.ShorthandACResult = Object.keys(EditorHelper.Shorthand).map(shorthand => {
    const result = {
        label: shorthand,
        value: Operation.Type.StatusUpdate,
        isShorthand: true
    };
    return result;
});
