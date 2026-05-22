const eventBus = {
  events: {},
  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  },
  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  },
  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(l => l(data));
  },
};
export default eventBus;

// Named exports to maintain compatibility with existing codebase imports
export { eventBus };
export const EVENTS = {
    SESSION_COMPLETED: 'session:completed',
    BOOK_UPDATED: 'book:updated',
    STATS_REFRESH: 'stats:refresh',
};
