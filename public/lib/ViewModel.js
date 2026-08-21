/**
 * Lightweight observable ViewModel base.
 * Keeps UI state and commands separate from persistence and rendering.
 */
export class ViewModel {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Set();
  }

  get(key) {
    return this.state[key];
  }

  set(patch) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener(this.state);
  }
}

window.eB = window.eB || {};
window.eB.ViewModel = ViewModel;
