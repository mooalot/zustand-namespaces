import {
  ExcludeByPrefix,
  FilterByPrefix,
  GetState,
  IncludeByPrefix,
  PrefixObject,
  SetState,
  Slice,
  UseBoundSlice,
} from './types';
import {
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  UseBoundStore,
} from 'zustand';

export function transformStateCreatorArgs<
  P extends string,
  State extends object,
  T
>(
  slice: Slice<P, T>,
  ...args: Parameters<StateCreator<State>>
): Parameters<StateCreator<FilterByPrefix<P, State>>> {
  type O = FilterByPrefix<P, State>;
  const [originalSet, get, originalApi] = args;
  const { setState, getState, subscribe, getInitialState, destroy } =
    originalApi;

  const newApi: StoreApi<O> = {
    setState: (state, replace) => {
      if (typeof state === 'function') {
        setState((currentState) => {
          const unprefixedState = getUnprefixedObject(
            slice.prefix,
            currentState
          );
          const updatedState = state(unprefixedState);
          return {
            ...currentState,
            ...updatedState,
          };
        });
      } else {
        setState(
          {
            ...getState(),
            ...getPrefixedObject(slice.prefix, state),
          },
          replace
        );
      }
    },
    getState: () => {
      return getUnprefixedObject(slice.prefix, getState());
    },
    subscribe: (listener) => {
      return subscribe((newPrefixedState, oldPrefixedState) => {
        listener(
          getUnprefixedObject(slice.prefix, newPrefixedState),
          getUnprefixedObject(slice.prefix, oldPrefixedState)
        );
      });
    },
    getInitialState: () => {
      return getUnprefixedObject(slice.prefix, getInitialState());
    },
    destroy,
  };

  return [
    (set, replace) => {
      if (typeof set === 'function') {
        originalSet((state) => {
          const unprefixedState = getUnprefixedObject(slice.prefix, state);
          const updatedState = set(unprefixedState);
          return {
            ...state,
            ...getPrefixedObject(slice.prefix, updatedState),
          };
        });
      } else {
        originalSet(
          {
            ...get(),
            ...getPrefixedObject(slice.prefix, set),
          },
          replace
        );
      }
    },
    () => {
      return getUnprefixedObject(slice.prefix, get());
    },
    newApi,
  ];
}

export function getPrefixedObject<T extends string, O extends object>(
  typePrefix: T,
  obj: O
) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    return {
      ...acc,
      [`${typePrefix}_${key}`]: value,
    };
  }, {} as PrefixObject<T, O>);
}

export function getUnprefixedObject<T extends string, Data extends object>(
  typePrefix: T,
  obj: Data
) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (key.startsWith(`${typePrefix}_`)) {
      return {
        ...acc,
        [key.slice(typePrefix.length + 1)]: value,
      };
    }
    return acc;
  }, {} as FilterByPrefix<T, Data>);
}

export function spreadSlices<Slices extends readonly Slice[], Data>(
  slices: Slices,
  callback: (slice: Slices[number]) => Data
) {
  return slices.reduce((acc, slice) => {
    return {
      ...acc,
      ...callback(slice),
    };
  }, {} as Data);
}

export function slicer<
  T extends object,
  Slices extends readonly Slice[],
  Mis extends [StoreMutatorIdentifier, unknown][] = [],
  Mos extends [StoreMutatorIdentifier, unknown][] = []
>(
  creator: StateCreator<
    T,
    Mis,
    Mos,
    ExcludeByPrefix<Slices[number]['prefix'], T>
  >,
  slices: Slices
): StateCreator<T, Mis, Mos, T> {
  return (...args) => {
    return {
      ...spreadTransformedSlices(slices, ...args),
      ...creator(...args),
    } as T;
  };
}

function transformCallback<State extends object>(
  ...args: Parameters<StateCreator<State>>
) {
  return function <P extends string>(
    slice: Slice<P, FilterByPrefix<P, State>>
  ) {
    const newArgs = transformStateCreatorArgs(slice, ...args);
    return getPrefixedObject(slice.prefix, slice.creator(...newArgs));
  };
}

function spreadTransformedSlices<
  State extends object,
  Slices extends readonly Slice[]
>(
  slices: Slices,
  ...args: Parameters<StateCreator<State>>
): IncludeByPrefix<Slices[number]['prefix'], State> {
  // eslint-disable-next-line
  return spreadSlices(slices, transformCallback(...args)) as any;
}

export function sliceHook<Prefix extends string, Store extends object>(
  useStore: UseBoundStore<StoreApi<Store>>,
  slice: Slice<Prefix, FilterByPrefix<Prefix, Store>>
): UseBoundSlice<FilterByPrefix<Prefix, Store>> {
  type T = FilterByPrefix<Prefix, Store>;

  const hook: UseBoundSlice<T> = ((selector) => {
    return useStore((state) => {
      const unprefixState = getUnprefixedObject(slice.prefix, state);
      return selector(unprefixState);
    });
  }) as UseBoundSlice<T>;

  const get: GetState<T> = () => {
    const state = useStore.getState();
    return getUnprefixedObject(slice.prefix, state);
  };
  const set: SetState<T> = (state) => {
    useStore.setState((currentState) => {
      const unprefixedState = getUnprefixedObject(slice.prefix, currentState);
      const updatedState =
        typeof state === 'function'
          ? (state as (s: T) => T | Partial<T>)(unprefixedState)
          : state;
      return {
        ...currentState,
        ...getPrefixedObject(slice.prefix, updatedState),
      };
    });
  };

  hook.getState = get;
  hook.setState = set;

  return hook;
}

export function sliceHooks<
  Store extends object,
  Slices extends readonly Slice[],
  Result = {
    [K in keyof Slices]: Slices[K] extends Slice<string, infer Data>
      ? UseBoundSlice<Data>
      : never;
  }
>(useStore: UseBoundStore<StoreApi<Store>>, ...slices: Slices) {
  return slices.map((slice) => sliceHook(useStore, slice)) as Result;
}

export function stateToSlice<Prefix extends string, State extends object>(
  slice: Slice<Prefix>,
  state: State
) {
  return getUnprefixedObject(slice.prefix, state);
}

export function sliceToState<Prefix extends string, State extends object>(
  slice: Slice<Prefix>,
  state: State
) {
  return getPrefixedObject(slice.prefix, state);
}

export function createSlice<T, Options = unknown>() {
  return <Prefix extends string>(callback: () => Slice<Prefix, T, Options>) =>
    callback;
}
