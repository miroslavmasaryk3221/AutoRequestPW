class TicketManager {
    constructor(onTicketCountUpdate) {
        this.haveTicketsChanged = true;
        this.observers = {
            onClassChange: undefined
        };
        this.tickets = [];
        this.onTicketCountUpdate = onTicketCountUpdate;
        this.observers.onClassChange = new MutationObserver(this.handleClassChange.bind(this));
        this.createValidityClassMap();
    }
    getSelectedTickets() {
        return this.tickets.filter(t => t.selected && t.validity !== Action.Validity.Invalid);
    }
    getSelectedTicketCount() {
        return this.getSelectedTickets().length;
    }
    hideInvalid(hide) {
        this.container.classList.toggle('hide-invalid', hide);
        if (hide) {
            this.container.classList.add('was-hidden');
        }
        else {
            setTimeout(() => this.container.classList.remove('was-hidden'), 200);
        }
    }
    setAction(action) {
        this.action = action;
    }
    setTicketInProgress(ticket) {
        const labels = Util.getAll(this.container, '.a-tickets-label');
        const done = labels.find(el => el.classList.contains('in-progress'));
        done === null || done === void 0 ? void 0 : done.classList.remove('in-progress');
        done === null || done === void 0 ? void 0 : done.classList.add('done');
        const target = labels.find(el => el.textContent === ticket.number);
        target.classList.add('in-progress');
        this.showProgressInfo(ticket);
    }
    setTickets(tickets) {
        this.haveTicketsChanged = true;
        this.tickets = tickets !== null && tickets !== void 0 ? tickets : [];
    }
    setContainer(container) {
        this.container = container;
    }
    update() {
        if (this.container && this.tickets) {
            if (this.haveTicketsChanged) {
                this.clearTicketLabels();
                this.createTicketLabels(this.tickets);
                this.haveTicketsChanged = false;
            }
            this.filterTicketList(this.action);
        }
    }
    getTooltip() {
        return Util.get('.a-tickets-tooltip');
    }
    getTooltipDesc() {
        return Util.get('.a-tickets-tooltip .description');
    }
    getTooltipMessage() {
        return Util.get('.a-tickets-tooltip .message');
    }
    toggleTooltip(show = true) {
        this.getTooltip().classList.toggle('active', show);
    }
    setTooltipPosition(x, y) {
        this.getTooltip().style.left = x + 'px';
        this.getTooltip().style.top = y + 'px';
    }
    setTooltipDescHTML(html) {
        this.getTooltipDesc().innerHTML = html;
    }
    setTooltipMessageHTML(html) {
        this.getTooltipMessage().innerHTML = html;
    }
    filterTicketList(action) {
        const labels = Util.getAll(this.container, '.a-tickets-label');
        for (let i = 0; i < this.tickets.length; i++) {
            const ticket = this.tickets[i];
            ticket.validity = action.isTicketStatusValid(ticket);
            this.setLabelValidityClass(labels[i], ticket.validity);
        }
        this.updateTicketCount();
    }
    updateTicketCount() {
        const ticketCount = Util.get(this.container, '.a-tickets-count');
        const count = this.getSelectedTicketCount();
        ticketCount.textContent = count.toString();
        this.onTicketCountUpdate();
    }
    createTicketLabels(tickets) {
        const ticketsExist = (tickets === null || tickets === void 0 ? void 0 : tickets.length) > 0;
        const ticketCount = Util.get('.a-tickets-count-text');
        const noRunInfo = Util.get('.a-tickets-no-run-info');
        const progressInfo = Util.get('.a-tickets-progress-info');
        ticketCount.classList.toggle('hidden', !ticketsExist);
        noRunInfo.classList.toggle('hidden', ticketsExist);
        progressInfo.classList.add('hidden');
        if (ticketsExist) {
            tickets.forEach(this.addTicketLabels.bind(this));
        }
    }
    createValidityClassMap() {
        if (TicketManager.ValidityClass) {
            return;
        }
        TicketManager.ValidityClass = {};
        for (const property in Action.Validity) {
            const isValueProperty = parseInt(property, 10) >= 0;
            if (!isValueProperty) {
                continue;
            }
            const className = Action.Validity[property].toLowerCase();
            TicketManager.ValidityClass[property] = className;
        }
    }
    setLabelValidityClass(label, val) {
        const desiredClass = TicketManager.ValidityClass[val];
        for (const className of Object.values(TicketManager.ValidityClass)) {
            label.classList.toggle(className, className === desiredClass);
        }
    }
    clearTicketLabels() {
        const node = Util.get(this.container, '.a-tickets');
        while (node && node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
    addTicketLabels(ticket) {
        ticket.selected = true;
        ticket.validity = Action.Validity.Valid;
        const label = document.createElement('div');
        label.innerText = ticket.number;
        label.classList.add('a-tickets-label');
        this.observers.onClassChange.observe(label, {
            attributes: true
        });
        label.addEventListener('click', ev => this.toggleRemoved(ev.target, ticket));
        label.dataset.tooltipDescription = ticket.brief_description;
        label.onmouseover = label.onclick = () => {
            this.toggleTooltip(true);
            this.setTooltipDescHTML(label.dataset.tooltipDescription);
            this.setTooltipMessageHTML(label.dataset.tooltipMessage);
        };
        label.onmouseout = () => {
            this.toggleTooltip(false);
        };
        label.onmousemove = (event) => {
            this.setTooltipPosition(event.x - 15, event.y + 10);
        };
        Util.get(this.container, '.a-tickets').appendChild(label);
    }
    toggleRemoved(target, ticket) {
        if (!target.classList.contains('invalid')) {
            target.classList.toggle('removed');
            ticket.selected = !target.classList.contains('removed');
            this.updateTicketCount();
        }
    }
    handleClassChange(mutationList) {
        mutationList.forEach(mutation => {
            if (mutation.attributeName === 'class') {
                this.setLabelTooltipMessage(mutation.target);
            }
        });
    }
    setLabelTooltipMessage(target) {
        let tooltipMessage;
        TicketManager.Tooltip.forEach((text, className) => {
            if (target.classList.contains(className)) {
                tooltipMessage = text;
            }
        });
        target.dataset.tooltipMessage = tooltipMessage;
    }
    getProgressCountContent(ticket) {
        const tickets = this.getSelectedTickets();
        const index = tickets.findIndex(t => t.number === ticket.number);
        return `${index + 1}/${tickets.length}`;
    }
    showProgressInfo(ticket) {
        const ticketCount = Util.get('.a-tickets-count-text');
        const noRunInfo = Util.get('.a-tickets-no-run-info');
        ticketCount.classList.add('hidden');
        noRunInfo.classList.add('hidden');
        const progressInfo = Util.get('.a-tickets-progress-info');
        progressInfo.classList.remove('hidden');
        const count = Util.get(progressInfo, '.a-tickets-progress-count');
        count.textContent = this.getProgressCountContent(ticket);
    }
}
TicketManager.Tooltip = new Map([
    [
        'valid',
        'Click to unselect.'
    ],
    [
        'partial',
        'Ticket already has the desired status.<br>' +
            'Other operations can still be applied.'
    ],
    [
        'unknown',
        'Ticket status unknown.<br>Add the Status field to your view ' +
            'to see valid tickets for this action.'
    ],
    [
        'removed',
        'Removed item, click to add.'
    ],
    [
        'invalid',
        'Ticket status is not compatible with this action.<br>' +
            'Action cannot be applied.'
    ]
]);
