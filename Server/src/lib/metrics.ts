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
    private values: number[] = [];

    observe(value: number) {
        this.values.push(value);
    }

    getCount() {
        return this.values.length;
    }

    getAverage() {
        if (this.values.length === 0) {
            return 0;
        }

        const total = this.values.reduce((sum, value) => sum + value, 0);

        return total / this.values.length;
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
    },

    database: {
        queriesTotal: new Counter(),
        queryErrorsTotal: new Counter(),
        queryDurationMs: new Histogram(),
    },
};