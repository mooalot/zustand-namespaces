import {
  ExcludeByPrefix,
  FilterByPrefix,
  IncludeByPrefix,
  PrefixObject,
  Slice,
  Utils,
} from './types';
import {
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  UseBoundStore,
} from 'zustand';

function transformStateCreatorArgs<P extends string, State extends Object, T>(
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

function getPrefixedObject<T extends string, O>(typePrefix: T, obj: O) {
  return Object.entries(obj as Object).reduce((acc, [key, value]) => {
    return {
      ...acc,
      [`${typePrefix}_${key}`]: value,
    };
  }, {} as PrefixObject<T, O>);
}

function getUnprefixedObject<T extends string, Data extends Object>(
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

export function spreadSlicesWithCallback<Slices extends readonly Slice[], Data>(
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

function transformCallback<State extends Object>(
  ...args: Parameters<StateCreator<State>>
) {
  return function <P extends string>(
    slice: Slice<P, FilterByPrefix<P, State>>
  ) {
    const newArgs = transformStateCreatorArgs(slice, ...args);
    return getPrefixedObject(slice.prefix, slice.creator(...newArgs));
  };
}

export function slicer<
  T extends Object,
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
      ...spreadSlices(slices, ...args),
      ...creator(...args),
    } as T;
  };
}

function spreadSlices<State extends Object, Slices extends readonly Slice[]>(
  slices: Slices,
  ...args: Parameters<StateCreator<State>>
): IncludeByPrefix<Slices[number]['prefix'], State> {
  return spreadSlicesWithCallback(slices, transformCallback(...args)) as any;
}

export function createUtilsFromSlice<
  Prefix extends string,
  Store extends Object
>(
  useStore: UseBoundStore<StoreApi<Store>>,
  slice: Slice<Prefix, FilterByPrefix<Prefix, Store>>
): Utils<FilterByPrefix<Prefix, Store>> {
  type T = FilterByPrefix<Prefix, Store>;
  const hook: Utils<T>['hook'] = (selector) => {
    return useStore((state) => {
      const unprefixState = getUnprefixedObject(slice.prefix, state);
      return selector(unprefixState);
    });
  };
  const get: Utils<T>['get'] = () => {
    const state = useStore.getState();
    return getUnprefixedObject(slice.prefix, state);
  };
  const set: Utils<T>['set'] = (state) => {
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

  return {
    hook,
    get,
    set,
  };
}

export function createUtilsFromSlices<
  Store extends PrefixObject<string, any>,
  Slices extends readonly Slice[],
  Result = {
    [K in keyof Slices]: Slices[K] extends Slice<string, infer Data>
      ? Utils<Data>
      : never;
  }
>(useStore: UseBoundStore<StoreApi<Store>>, ...slices: Slices) {
  return slices.map((slice) => createUtilsFromSlice(useStore, slice)) as Result;
}

export function stateToSlice<Prefix extends string, State extends Object>(
  slice: Slice<Prefix>,
  state: State
) {
  return getUnprefixedObject(slice.prefix, state);
}

export function sliceToState<Prefix extends string, State extends Object>(
  slice: Slice<Prefix>,
  state: State
) {
  return getPrefixedObject(slice.prefix, state);
}

export function createSlice<T>() {
  return <Prefix extends string>(callback: () => Slice<Prefix, T>) => callback;
}

export function createSliceWithOptions<T, Options>() {
  return <Prefix extends string>(callback: () => Slice<Prefix, T, Options>) =>
    callback;
}

