import {
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  signal,
} from "@angular/core";
import type { Provider, Signal } from "@angular/core";
import { createSearchState } from "@searchivo/core/state";
import type { SearchController, SearchState } from "@searchivo/core/state";
import type { SearchSource } from "@searchivo/core/source";

/** Minimal native-input binding, independent of document shape. */
export interface SearchivoInput {
  readonly query: Signal<string>;
  setQuery(query: string): void;
}
/** Typed Angular handle with readonly Signals and the underlying portable controller. */
export interface Searchivo<T> extends SearchivoInput {
  readonly state: Signal<SearchState<T>>;
  readonly controller: SearchController<T>;
}
/** Token used by the native input directive; supplied by createSearchivo().provide(). */
export const SEARCHIVO_INPUT = new InjectionToken<SearchivoInput>(
  "SEARCHIVO_INPUT",
);
/** Create a typed binding with independently scoped provider instances. Invoke once per search domain. */
export function createSearchivo<T>(source: SearchSource<T>): {
  provide(): Provider[];
  inject(): Searchivo<T>;
} {
  const token = new InjectionToken<Searchivo<T>>("SEARCHIVO");
  return {
    provide() {
      return [
        {
          provide: token,
          useFactory: () => {
            const controller = createSearchState(source);
            const state = signal(controller.get());
            const unsubscribe = controller.subscribe((value) =>
              state.set(value),
            );
            inject(DestroyRef).onDestroy(() => {
              unsubscribe();
              controller.dispose();
            });
            return {
              state: state.asReadonly(),
              query: computed(() => state().query),
              controller,
              setQuery(query: string) {
                void controller.search({ query });
              },
            } satisfies Searchivo<T>;
          },
        },
        { provide: SEARCHIVO_INPUT, useExisting: token },
      ];
    },
    inject() {
      return inject(token);
    },
  };
}
/** Headless native-input enhancement. Consumers own labels, markup, styling and suggestion semantics. */
@Directive({
  selector: "input[searchivo]",
  standalone: true,
  host: {
    "(input)": "onInput($event)",
    "(compositionstart)": "composing = true",
    "(compositionend)": "onCompositionEnd()",
  },
})
export class SearchivoInputDirective {
  private readonly input =
    inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly binding = inject(SEARCHIVO_INPUT);
  /** Composition state prevents searching unfinished IME input. */
  composing = false;
  constructor() {
    effect(() => {
      const query = this.binding.query();
      if (!this.composing) this.input.value = query;
    });
  }
  /** Handle native input while preserving IME composition. */
  onInput(event: InputEvent): void {
    if (!this.composing && !event.isComposing)
      this.binding.setQuery(this.input.value);
  }
  /** Commit the final composed text. */
  onCompositionEnd(): void {
    this.composing = false;
    this.binding.setQuery(this.input.value);
  }
}
