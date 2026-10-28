# R-ADR-008: Explicit worker transport and validation

Workers use separate client/runtime/web entry points. Protocol v1 has positive safe-integer request IDs and operation-specific payloads/results. Both directions validate unknown values; consumers supply a document guard. Engines and custom ranking strategies are constructed inside workers, not serialized.

Client abort removes pending state and ignores late replies. It does not preempt synchronous worker computation or undo add/upsert/remove. Runtime dispose clears the engine and rejects later commands; the runtime attachment disposer additionally removes its listener. Client disposal rejects pending work, removes listeners and terminates only explicitly owned transports. Readiness is an acknowledged ready request, not a timer assumption.

Malformed envelopes fail pending client requests rather than leaving them hanging. Runtime errors are serialized as messages. Worker errors stop new requests. Native Worker/MessagePort endpoints are optional adapters; caller owns starting a transferred MessagePort. Structured clone costs and worker heap are separate from main-thread engine measurements.
