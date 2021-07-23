var TicketStatus;
(function (TicketStatus) {
    TicketStatus["Accepted"] = "Accepted";
    TicketStatus["Closed"] = "Closed";
    TicketStatus["Open"] = "Open";
    TicketStatus["PendingCustomer"] = "Pending Customer";
    TicketStatus["PendingVendor"] = "Pending Vendor";
    TicketStatus["Resolved"] = "Resolved";
    TicketStatus["WorkingSolution"] = "Working Solution";
    TicketStatus["WorkInProgress"] = "Work in Progress";
})(TicketStatus || (TicketStatus = {}));
var SettableStatus;
(function (SettableStatus) {
    SettableStatus["Accepted"] = "Accepted";
    SettableStatus["PendingCustomer"] = "Pending Customer";
    SettableStatus["PendingVendor"] = "Pending Vendor";
    SettableStatus["WorkingSolution"] = "Working Solution";
    SettableStatus["WorkInProgress"] = "Work in Progress";
})(SettableStatus || (SettableStatus = {}));
var InvalidOpParamReason;
(function (InvalidOpParamReason) {
    InvalidOpParamReason["Empty"] = "Parameter cannot be empty";
    InvalidOpParamReason["Invalid"] = "Parameter value is invalid";
})(InvalidOpParamReason || (InvalidOpParamReason = {}));
var OpType;
(function (OpType) {
    OpType["Assign"] = "Assign to";
    OpType["CloseIncident"] = "Close Incident";
    OpType["Priority"] = "Set priority to";
    OpType["Relate"] = "Relate to";
    OpType["RelateIncident"] = "Relate to Lead Incident";
    OpType["Resolve"] = "Resolve";
    OpType["StatusUpdate"] = "Set status to";
    OpType["SMBBUpdate"] = "SMBB Worklog Update";
    OpType["Update"] = "Update";
})(OpType || (OpType = {}));
var DowntimeEnd;
(function (DowntimeEnd) {
    DowntimeEnd["Start"] = "Keep downtime end/set to start";
    DowntimeEnd["Now"] = "Keep downtime end/set to now";
    DowntimeEnd["ForceStart"] = "Downtime ends on downtime start";
    DowntimeEnd["ForceNow"] = "Downtime ends now";
})(DowntimeEnd || (DowntimeEnd = {}));
class Operation {
    constructor() {
        this.disallowedStatuses = new Set([
            TicketStatus.Closed,
            TicketStatus.Resolved,
        ]);
    }
    static isValidOpType(opType) {
        return Object.values(Operation.Type).includes(opType);
    }
    static opHasOptParams(opType) {
        return Object.values(Operation.paramConfigMap[opType]).some((param) => param.optional);
    }
    static from(op) {
        const ChildOperation = Operation.getConstructor(op.type);
        return new ChildOperation(op.params);
    }
    static getConstructor(opType) {
        switch (opType) {
            case Operation.Type.Assign:
                return AssignOperation;
            case Operation.Type.CloseIncident:
                return CloseIncidentOperation;
            case Operation.Type.Priority:
                return PriorityOperation;
            case Operation.Type.Relate:
                return RelateOperation;
            case Operation.Type.RelateIncident:
                return RelateIncidentOperation;
            case Operation.Type.Resolve:
                return ResolveOperation;
            case Operation.Type.SMBBUpdate:
                return SMBBUpdateOperation;
            case Operation.Type.StatusUpdate:
                return StatusUpdateOperation;
            case Operation.Type.Update:
                return UpdateOperation;
            default:
                throw new InvalidOpTypeError(opType);
        }
    }
    isSameType(op) {
        return op.type === this.type;
    }
    equals(op) {
        return (this.isSameType(op) &&
            Object.keys(this.params).every((key) => {
                return this.params[key] === op.params[key];
            }));
    }
    toJSON() {
        return {
            type: this.type,
            params: this.params,
        };
    }
    validateParameters(params) {
        const details = {};
        const config = Operation.paramConfigMap[this.type];
        Object.keys(config).forEach((key) => {
            details[key] = this.validateParameter(config[key], params[key]);
        });
        if (Object.values(details).some((detail) => detail.length)) {
            throw new InvalidOpParamsError(details);
        }
    }
    validateParameter(paramConfig, value) {
        var _a;
        if (!value || !value.length) {
            return paramConfig.optional ? '' : InvalidOpParamReason.Empty;
        }
        if (Array.isArray(paramConfig.autocomplete) &&
            !paramConfig.autocomplete
                .map((value) => value.toLowerCase())
                .includes(value.toLowerCase()))
            return InvalidOpParamReason.Invalid;
        if (paramConfig.pattern && !new RegExp(paramConfig.pattern).test(value))
            return ((_a = paramConfig.patternDescription) !== null && _a !== void 0 ? _a : InvalidOpParamReason.Invalid);
        return '';
    }
}
Operation.Type = OpType;
Operation.TicketStatus = TicketStatus;
Operation.DowntimeEnd = DowntimeEnd;
Operation.paramConfigMap = {
    [OpType.Assign]: {
        assignee: {
            paramIndex: 0,
            placeholder: 'Enter assignment group or username',
            capitalize: true,
            noSpaces: true,
        },
    },
    [OpType.CloseIncident]: {},
    [OpType.Priority]: {
        priority: {
            paramIndex: 0,
            placeholder: 'Select priority value',
            autocomplete: ['5', '4', '3', '2', '1'],
            alwaysDropdown: true,
            noSpaces: true,
        },
        justification: {
            paramIndex: 1,
            placeholder: 'Enter reason for priority change',
            textareaValues: [
                'Threat to Business Service increased',
                'Threat to Business Service decreased',
                'Degree of Business Service availability increased',
                'Degree of Business Service availability decreased',
                'CI Criticality turned out to be higher',
                'CI Criticality turned out to be lower',
                'Priority stated by the customer increased',
                'Priority stated by the customer decreased',
                'CBI aligned due to higher Security Impact',
                'CBI aligned due to lower Security Impact',
                'Invalid value(s) transferred by external ticket systems',
            ],
            textarea: true,
        },
    },
    [OpType.Relate]: {
        ticketId: {
            paramIndex: 0,
            placeholder: 'Enter Ticket ID',
            pattern: `^\\s*(
                        |[cC]\\d{9}
                        |[pP][mM]\\d{5}
                        |[sS][dD]\\d{9}
                    )\\s*$`.replace(/\s+/g, ''),
            patternDescription: 'Ticket ID must be one of the following ' +
                'formats where "#" is a number from 0-9: "C#########" (9)' +
                ', "PM#####" (5), "SD#########" (9)',
            capitalize: true,
            noSpaces: true,
        },
    },
    [OpType.RelateIncident]: {
        ticketId: {
            paramIndex: 0,
            placeholder: 'Enter Incident ID',
            pattern: `^\\s*(
                        [iI][mM]\\d{10}
                    )\\s*$`.replace(/\s+/g, ''),
            patternDescription: 'Ticket ID must be the following format, ' +
                'where "#" is a number from 0-9: "IM########## (10)"',
            capitalize: true,
            noSpaces: true,
        },
        resolveType: {
            paramIndex: 1,
            placeholder: 'Resolve type',
            autocomplete: ['CENTRAL', 'DECENTRAL'],
            alwaysDropdown: true,
            default: 'CENTRAL',
        },
    },
    [OpType.Resolve]: {
        solution: {
            paramIndex: 0,
            placeholder: 'Enter solution',
            textarea: true,
        },
        downtimeEnd: {
            paramIndex: 1,
            placeholder: 'Select downtime end',
            autocomplete: Object.values(DowntimeEnd),
            alwaysDropdown: true,
            default: DowntimeEnd.Start,
            optional: true,
        },
        resolutionCode: {
            paramIndex: 2,
            placeholder: 'Resolution code',
            optional: true,
        },
        category1: {
            paramIndex: 3,
            placeholder: 'Resolve category 1',
            optional: true,
        },
        category2: {
            paramIndex: 4,
            placeholder: 'Resolve category 2',
            optional: true,
        },
        category3: {
            paramIndex: 5,
            placeholder: 'Resolve category 3',
            optional: true,
        },
        category4: {
            paramIndex: 6,
            placeholder: 'Resolve category 4',
            optional: true,
        },
    },
    [OpType.SMBBUpdate]: {
        smbbUpdate: {
            paramIndex: 0,
            placeholder: 'Enter worklog update',
            textarea: true,
        },
    },
    [OpType.StatusUpdate]: {
        status: {
            paramIndex: 0,
            placeholder: 'Select status',
            autocomplete: Object.values(SettableStatus)
        },
    },
    [OpType.Update]: {
        update: {
            paramIndex: 0,
            placeholder: 'Enter worklog update',
            textarea: true,
        },
    },
};
Operation.optParamDescrMap = {
    [OpType.Resolve]: 'Optional settings. If unchanged, the following ' +
        'default settings will apply: resolution code = empty, ' +
        'resolve categories = ticket categories',
};
class AssignOperation extends Operation {
    constructor(param) {
        super();
        this.type = Operation.Type.Assign;
        if (typeof param === 'string') {
            param = {
                assignee: param
            };
        }
        this.validateParameters(param);
        this.params = param;
    }
}
class CloseIncidentOperation extends Operation {
    constructor() {
        super();
        this.type = Operation.Type.CloseIncident;
        this.params = {};
        this.allowResolvedTicketsOnly();
    }
    allowResolvedTicketsOnly() {
        const statuses = Object.values(TicketStatus);
        statuses.forEach(status => {
            if (status === TicketStatus.Resolved) {
                this.disallowedStatuses.delete(status);
            }
            else {
                this.disallowedStatuses.add(status);
            }
        });
    }
}
class PriorityOperation extends Operation {
    constructor(param1, param2) {
        super();
        this.type = Operation.Type.Priority;
        if (typeof param1 === 'string') {
            param1 = {
                priority: param1,
                justification: param2
            };
        }
        this.validateParameters(param1);
        this.params = param1;
        this.disallowedStatuses.delete(TicketStatus.Resolved);
    }
}
class RelateOperation extends Operation {
    constructor(param) {
        super();
        this.type = Operation.Type.Relate;
        if (typeof param === 'string') {
            param = {
                ticketId: param
            };
        }
        this.validateParameters(param);
        this.params = param;
        this.disallowedStatuses.delete(TicketStatus.Resolved);
    }
}
class RelateIncidentOperation extends Operation {
    constructor(param1, param2) {
        super();
        this.type = Operation.Type.RelateIncident;
        if (typeof param1 === 'string') {
            param1 = {
                ticketId: param1,
                resolveType: param2
            };
        }
        this.validateParameters(param1);
        this.params = param1;
        this.disallowedStatuses.delete(TicketStatus.Resolved);
    }
}
class ResolveOperation extends Operation {
    constructor(param, downtimeEnd, resolutionCode, category1, category2, category3, category4) {
        super();
        this.type = Operation.Type.Resolve;
        if (typeof param === 'string') {
            param = {
                solution: param,
                downtimeEnd: downtimeEnd,
                resolutionCode: resolutionCode,
                category1: category1,
                category2: category2,
                category3: category3,
                category4: category4
            };
        }
        this.validateParameters(param);
        this.params = param;
    }
}
class SMBBUpdateOperation extends Operation {
    constructor(param) {
        super();
        this.type = OpType.SMBBUpdate;
        if (typeof param === 'string') {
            param = {
                smbbUpdate: param
            };
        }
        this.validateParameters(param);
        this.params = param;
        this.disallowedStatuses.delete(TicketStatus.Resolved);
    }
}
class StatusUpdateOperation extends Operation {
    constructor(param) {
        super();
        this.type = OpType.StatusUpdate;
        if (typeof param === 'string') {
            param = {
                status: param
            };
        }
        this.validateParameters(param);
        this.params = param;
        this.disallowedStatuses.add(param.status);
    }
}
class UpdateOperation extends Operation {
    constructor(param) {
        super();
        this.type = OpType.Update;
        if (typeof param === 'string') {
            param = {
                update: param
            };
        }
        this.validateParameters(param);
        this.params = param;
    }
}
class InvalidOpError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'InvalidOperation';
    }
}
class InvalidOpTypeError extends InvalidOpError {
    constructor(opType) {
        super(opType + ' is not a valid Operation type.');
        this.name = 'InvalidOperationTypeError';
        this.reasons = {
            opType: `Invalid operation type ${opType}`
        };
    }
}
class InvalidOpParamsError extends InvalidOpError {
    constructor(reasons) {
        super(JSON.stringify(reasons, null, 2));
        this.name = 'InvalidOperationParameterError';
        this.name = 'Invalid Operation Parameter Error';
        this.reasons = reasons;
    }
}
