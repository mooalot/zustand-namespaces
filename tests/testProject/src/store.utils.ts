import { produce, WritableDraft } from 'immer';
import { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand';
import { StateStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

type Write<T, U> = Omit<T, keyof U> & U;
type WithComputed<S, A> = S extends { getState: () => infer T }
  ? Write<S, Compute<T, A>>
  : never;

declare module 'zustand/vanilla' {
  interface StoreMutators<S, A> {
    computer: WithComputed<S, A>;
    'big-computer': WithComputed<S, A>;
    'multi-persist': StoreMutators<S, A>['zustand/persist'];
  }
}

/**Middleware */

type Computed = <T extends object, K extends keyof T>(
  computed: Compute<T, Pick<T, K>>,
  options?: Options<T>
) => <
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  creator: StateCreator<T, [...Mps, ['computer', unknown]], Mcs>
) => StateCreator<T, Mps, [['computer', Pick<T, K>], ...Mcs]>;

export type Compute<T, A> = (state: T) => A;

export type Options<T> = {
  /**
   * An array of keys that the computed function depends on. If any of these keys changed, the computed function will be re-run.
   */
  keys?: (keyof T)[];
  /**
   * Disable the Proxy object that tracks which selectors are accessed. This is useful if you want to disable the Proxy object for nested changes.
   */
  disableProxy?: boolean;
  /**
   * A custom equality function to determine if the computed state has changed. By default, a shallow equality check is used.
   */
  equalityFn?: (a: any, b: any) => boolean;
};

/**
 * A middleware that creates a computed state object.
 */
export const createComputer =
  createComputerImplementation as unknown as Computed;
function createComputerImplementation<T extends object, K extends keyof T>(
  compute: Compute<T, Pick<T, K>>,
  opts: Options<T> = {}
): (creator: StateCreator<T>) => StateCreator<T> {
  return (creator) => {
    return (set, get, api) => {
      const trackedSelectors = new Set<string | number | symbol>();

      const equalityFn = opts?.equalityFn ?? shallow;

      if (opts?.keys) {
        const selectorKeys = opts.keys;
        for (const key of selectorKeys) {
          trackedSelectors.add(key);
        }
      }

      const useSelectors = opts?.disableProxy !== true || !!opts?.keys;
      const useProxy = opts?.disableProxy !== true && !opts?.keys;

      const computeAndMerge = (state: T): T => {
        const stateProxy = new Proxy(
          { ...state },
          {
            get: (_, prop) => {
              trackedSelectors.add(prop);
              return state[prop as keyof T];
            },
          }
        );

        // calculate the new computed state
        const computedState = compute(useProxy ? stateProxy : { ...state });

        for (const key in computedState) {
          if (equalityFn(computedState[key], state[key])) {
            computedState[key] = state[key];
          }
        }
        return { ...state, ...computedState };
      };

      type SetState = StoreApi<T>['setState'];
      const setWithComputed = (set: SetState): SetState => {
        return (state) => {
          const prevState = get();
          const nextPartialState =
            typeof state === 'function' ? state(prevState) : state;
          const newState = { ...prevState, ...nextPartialState };

          const changedKeys: string[] = [];
          for (const key in newState) {
            if (prevState[key] !== newState[key]) {
              changedKeys.push(key);
            }
          }
          if (
            useSelectors &&
            trackedSelectors.size !== 0 &&
            !changedKeys.some((k) => trackedSelectors.has(k))
          ) {
            set(newState);
          } else {
            set(computeAndMerge(newState));
          }
        };
      };

      api.setState = setWithComputed(api.setState);

      return computeAndMerge(creator(setWithComputed(set), get, api));
    };
  };
}

type BigComputer = <T extends object, K extends keyof T>(
  ...computers: ReturnType<typeof createComputer<T, any>>[]
) => <
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  creator: StateCreator<T, [...Mps, ['big-computer', unknown]], Mcs>
) => StateCreator<T, Mps, [['big-computer', Pick<T, K>], ...Mcs]>;

export const createBigComputer =
  createBigComputerImplementation as unknown as BigComputer;
function createBigComputerImplementation<T extends object, K extends keyof T>(
  ...computers: ReturnType<typeof createComputer<T, K>>[]
): (
  creator: Parameters<ReturnType<typeof createComputer<T, K>>>[0]
) => ReturnType<ReturnType<typeof createComputer<T, K>>> {
  return (creator) => {
    return (...args) => {
      const composed = compose(...computers);
      return composed(creator)(...args);
    };
  };
}

type Func<T, R> = (arg: T) => R;
function compose<T, R>(...funcs: Func<T, R>[]): Func<T, R> {
  //@ts-ignore
  return (args) => funcs.reduceRight((acc, fn) => fn(acc), args);
}

type ProduceStore = {
  <T>(
    useStore: { setState: StoreApi<T>['setState'] },
    producer: (draft: WritableDraft<T>) => void
  ): void;
  <T>(useStore: { setState: StoreApi<T>['setState'] }): (
    draft: WritableDraft<T>
  ) => void;
};

export const produceStore = (<T>(
  useStore: { setState: StoreApi<T>['setState'] },
  producer?: (draft: WritableDraft<T>) => void
) => {
  if (producer) {
    // Direct invocation
    useStore.setState((state) => produce(state, producer));
  } else {
    // Partial application
    return (nextProducer: (draft: WritableDraft<T>) => void) => {
      useStore.setState((state) => produce(state, nextProducer));
    };
  }
}) as ProduceStore;

export const hashStorage: StateStorage = {
  getItem: (key): string => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    const storedValue = searchParams.get(key) ?? '';
    return JSON.parse(storedValue);
  },
  setItem: (key, newValue): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.set(key, JSON.stringify(newValue));
    location.hash = searchParams.toString();
  },
  removeItem: (key): void => {
    const searchParams = new URLSearchParams(location.hash.slice(1));
    searchParams.delete(key);
    location.hash = searchParams.toString();
  },
};
