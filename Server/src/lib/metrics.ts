type MetricValue = number;

class Counter {
    private value: MetricValue = 0;

    increment(amount: number = 1) {
        this.value += amount;
    }

    get() {
        return this.value;
    }
}

class Gauge {
    private value: MetricValue = 0;

    increment(amount: number = 1) {
        this.value += amount;
    }

    decrement(amount: number = 1) {
        this.value -= amount;
    }

    set(value: number) {
        this.value = value;
    }

    get() {
        return this.value;
    }
}

class Histogram {
    // Phase 9 fix: this used to push EVERY value into an array that was never emptied —
    // one number per DB query, forever → memory grew for as long as the server ran.
    // An average only needs the count and the running total, so keep just those (+ max).
    private count = 0;
    private sum = 0;
    private max = 0;

    observe(value: number) {
        this.count++;
        this.sum += value;
        if (value > this.max) this.max = value;
    }

    getCount() {
        return this.count;
    }

    getAverage() {
        if (this.count === 0) {
            return 0;
        }

        return this.sum / this.count;
    }

    // the slowest one seen — an average hides spikes, the max shows them
    getMax() {
        return this.max;
    }
}

export const metrics = {
    http: {
        requestsTotal: new Counter(),
        errorsTotal: new Counter(),
        requestDurationMs: new Histogram(),
    },

    websocket: {
        connectionsTotal: new Counter(),
        activeConnections: new Gauge(),
        messagesReceivedTotal: new Counter(),
        messagesSentTotal: new Counter(),
        errorsTotal: new Counter(),
        // Phase 9: connections that are a client RE-connecting (client sends ?reconnect=1).
        // A sudden rise = clients keep dropping (network, proxy timeout, heartbeat issue).
        reconnectsTotal: new Counter(),
        // Phase 9: ms from "message saved" until the recipient's device reports "delivered"
        deliveryLatencyMs: new Histogram(),
    },

    // Phase 9: Redis problems were only logged — now they are counted too
    redis: {
        connectionErrorsTotal: new Counter(),
        publishFailuresTotal: new Counter(),
        presenceFailuresTotal: new Counter(),
    },

    database: {
        queriesTotal: new Counter(),
        queryErrorsTotal: new Counter(),
        queryDurationMs: new Histogram(),
    },
};