// src/utils/eventBus.js
// Event bus for cross-component communication

class EventBus {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    emit(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(callback => callback(data));
    }

    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    }
}

export const eventBus = new EventBus();

// Event names
export const EVENTS = {
    SESSION_COMPLETED: 'session:completed',
    BOOK_UPDATED: 'book:updated',
    STATS_REFRESH: 'stats:refresh',
};