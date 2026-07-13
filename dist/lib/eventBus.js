import { EventEmitter } from "node:events";
// Bus interne au process : un seul serveur Express, un seul process — pas besoin
// de pubsub externe (Redis...) pour propager les événements aux clients SSE connectés.
const bus = new EventEmitter();
bus.setMaxListeners(50); // plusieurs onglets dashboard ouverts en même temps
export function publishSpanEvent(event) {
    bus.emit("span-event", event);
}
export function subscribeSpanEvents(listener) {
    bus.on("span-event", listener);
    return () => bus.off("span-event", listener);
}
