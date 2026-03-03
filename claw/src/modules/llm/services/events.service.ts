type Handler = (evt: any) => void;

class EventBus {
  private handlers: Set<Handler> = new Set();

  publish(evt: any) {
    for (const h of this.handlers) {
      try {
        h(evt);
      } catch (e) {
        console.error("Event handler error", e);
      }
    }
  }

  subscribe(h: Handler) {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }
}

export const eventBus = new EventBus();

export default eventBus;
