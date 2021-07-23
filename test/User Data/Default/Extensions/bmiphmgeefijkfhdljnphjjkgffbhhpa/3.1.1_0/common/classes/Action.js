var Validity;
(function (Validity) {
    Validity[Validity["Invalid"] = 0] = "Invalid";
    Validity[Validity["Valid"] = 1] = "Valid";
    Validity[Validity["Partial"] = 2] = "Partial";
    Validity[Validity["Unknown"] = 3] = "Unknown";
})(Validity || (Validity = {}));
class Action {
    constructor(title, operations) {
        this.title = title !== null && title !== void 0 ? title : '';
        if (this.title.length > 50) {
            throw 'Maximum title length is 50 characters.';
        }
        this.operations = [];
        const allowedStates = Object.values(Operation.TicketStatus);
        this.allowedStates = new Set(allowedStates);
        this.allowedStates.delete(Operation.TicketStatus.Closed);
        if (!operations) {
            return;
        }
        if (!Array.isArray(operations)) {
            operations = [operations];
        }
        for (const op of operations) {
            this.addOperation(op);
        }
    }
    static from(obj) {
        if (!Util.hasProp(obj, 'title') || typeof obj.title !== 'string') {
            return undefined;
        }
        const action = new Action(obj.title);
        if (obj.operations && obj.operations.length > 0) {
            for (const op of obj.operations) {
                const opInstance = Operation.from(op);
                if (opInstance) {
                    action.addOperation(opInstance);
                }
            }
            return action.operations.length > 0 ? action : undefined;
        }
    }
    static hasExclusion(opTypes, type) {
        const Type = Operation.Type;
        if (type === Type.Relate || type === Type.RelateIncident) {
            return false;
        }
        if (type === Type.SMBBUpdate || type === Type.CloseIncident) {
            return opTypes.some(type => type &&
                type !== Type.Relate &&
                type !== Type.RelateIncident);
        }
        const excluded = opTypes.some(opType => opType === Type.SMBBUpdate || opType === Type.CloseIncident);
        if (!excluded) {
            if (type === Type.Update || type === Type.Resolve) {
                return opTypes.some(type => type === Type.Update || type === Type.Resolve);
            }
        }
        return excluded;
    }
    static hasOperationConflict(opTypes, type) {
        if (!Operation.isValidOpType(type))
            return false;
        const Type = Operation.Type;
        if (type === Type.Relate)
            return false;
        if (Action.hasExclusion(opTypes, type))
            return true;
        return opTypes.some(opType => opType === type);
    }
    hasOperationConflict(opType) {
        return Action.hasOperationConflict(this.operations.map(op => op.type), opType);
    }
    subtractAllowedStates(operation) {
        operation.disallowedStatuses.forEach(state => {
            this.allowedStates.delete(state);
        });
    }
    pushOperation(op) {
        if (this.hasOperationConflict(op.type)) {
            return false;
        }
        const Type = Operation.Type;
        if (op.type === Type.Relate || op.type === Type.RelateIncident) {
            this.operations.unshift(op);
            return true;
        }
        const lastOp = this.operations[this.operations.length - 1];
        if (lastOp &&
            (lastOp.type === Type.Resolve || lastOp.type === Type.CloseIncident)) {
            this.operations.pop();
            this.operations.push(op);
            this.operations.push(lastOp);
        }
        else {
            this.operations.push(op);
        }
        return true;
    }
    addOperation(operation) {
        const success = this.pushOperation(operation);
        if (success) {
            this.subtractAllowedStates(operation);
        }
        return success;
    }
    equals(action) {
        if (!action || this.title !== action.title) {
            return false;
        }
        if (this.operations.length !== action.operations.length) {
            return false;
        }
        for (let i = 0; i < this.operations.length; i++) {
            if (!this.operations[i].equals(action.operations[i])) {
                return false;
            }
        }
        return true;
    }
    isTicketStatusValid(ticket) {
        const number = ticket.number;
        if (!number.startsWith('IM') && !number.startsWith('SIT')) {
            return Validity.Invalid;
        }
        const status = this.getTicketStatus(ticket);
        return this.getTicketStatusValidity(status);
    }
    setAllowedStates(states) {
        this.allowedStates = states instanceof Set ? states : new Set(states);
        return this.allowedStates;
    }
    setTitle(title) {
        this.title = title;
    }
    toJSON() {
        return {
            title: this.title,
            operations: this.operations.map(op => op.toJSON())
        };
    }
    getTicketStatusValidity(status) {
        if (!status) {
            return Validity.Unknown;
        }
        if (this.allowedStates.has(status) || this.operations.length === 0) {
            return Validity.Valid;
        }
        const invalidStates = new Set([Operation.TicketStatus.Closed]);
        const resolved = Operation.TicketStatus.Resolved;
        if (!this.allowedStates.has(resolved)) {
            invalidStates.add(resolved);
        }
        if (invalidStates.has(status) || this.operations.length === 1) {
            return Validity.Invalid;
        }
        return Validity.Partial;
    }
    getTicketStatus(ticket) {
        let status = ticket.problem_status;
        if (!status && ticket.groups) {
            const group = ticket.groups.find(group => group.id === 'problem.status');
            if (group) {
                status = group.value;
            }
        }
        return status;
    }
}
Action.Validity = Validity;
