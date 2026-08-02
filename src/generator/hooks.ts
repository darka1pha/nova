export type HookName =
  | "beforeGenerate"
  | "afterGenerate"
  | "beforePlugin"
  | "afterPlugin"
  | "beforeWrite"
  | "afterWrite";

export type HookHandler<TPayload = unknown> = (payload: TPayload) => void | Promise<void>;

/**
 * Minimal lifecycle hook registry. Future plugins/commands can subscribe to
 * these instead of reaching into generator internals - e.g. a future
 * `nova doctor` could listen on `afterGenerate` to run validation without
 * `generator.ts` knowing anything about it.
 */
export class HookRegistry {
  private handlers = new Map<HookName, HookHandler[]>();

  on<TPayload = unknown>(name: HookName, handler: HookHandler<TPayload>): void {
    const list = this.handlers.get(name) ?? [];
    list.push(handler as HookHandler);
    this.handlers.set(name, list);
  }

  async run<TPayload = unknown>(name: HookName, payload: TPayload): Promise<void> {
    const list = this.handlers.get(name);
    if (!list) return;
    for (const handler of list) {
      await handler(payload);
    }
  }
}