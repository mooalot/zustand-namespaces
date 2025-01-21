import {
  ExcludeByPrefix,
  FilterByPrefix,
  GetState,
  IncludeByPrefix,
  PrefixObject,
  SetState,
  Division,
  UseBoundDivision,
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
  division: Division<P, T>,
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
            division.prefix,
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
            ...getPrefixedObject(division.prefix, state),
          },
          replace
        );
      }
    },
    getState: () => {
      return getUnprefixedObject(division.prefix, getState());
    },
    subscribe: (listener) => {
      return subscribe((newPrefixedState, oldPrefixedState) => {
        listener(
          getUnprefixedObject(division.prefix, newPrefixedState),
          getUnprefixedObject(division.prefix, oldPrefixedState)
        );
      });
    },
    getInitialState: () => {
      return getUnprefixedObject(division.prefix, getInitialState());
    },
    destroy,
  };

  return [
    (set, replace) => {
      if (typeof set === 'function') {
        originalSet((state) => {
          const unprefixedState = getUnprefixedObject(division.prefix, state);
          const updatedState = set(unprefixedState);
          return {
            ...state,
            ...getPrefixedObject(division.prefix, updatedState),
          };
        });
      } else {
        originalSet(
          {
            ...get(),
            ...getPrefixedObject(division.prefix, set),
          },
          replace
        );
      }
    },
    () => {
      return getUnprefixedObject(division.prefix, get());
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

export function spreadDivisions<Divisions extends readonly Division[], Data>(
  divisions: Divisions,
  callback: (division: Divisions[number]) => Data
) {
  return divisions.reduce((acc, division) => {
    return {
      ...acc,
      ...callback(division),
    };
  }, {} as Data);
}

/**
 * Note: Type inference doesnt work yet for this function. It would be best practice to pass in a type to the zustand 'create' function
 */
export function divide<
  T extends object,
  Divisions extends readonly Division[],
  Mis extends [StoreMutatorIdentifier, unknown][] = [],
  Mos extends [StoreMutatorIdentifier, unknown][] = []
>(
  creator: StateCreator<
    T,
    Mis,
    Mos,
    ExcludeByPrefix<Divisions[number]['prefix'], T>
  >,
  divisions: Divisions
): StateCreator<T, Mis, Mos, T> {
  return (...args) => {
    return {
      ...spreadTransformedDivisions(divisions, ...args),
      ...creator(...args),
    } as T;
  };
}

function transformCallback<State extends object>(
  ...args: Parameters<StateCreator<State>>
) {
  return function <P extends string>(
    division: Division<P, FilterByPrefix<P, State>>
  ) {
    const newArgs = transformStateCreatorArgs(division, ...args);
    return getPrefixedObject(division.prefix, division.creator(...newArgs));
  };
}

function spreadTransformedDivisions<
  State extends object,
  Divisions extends readonly Division[]
>(
  divisions: Divisions,
  ...args: Parameters<StateCreator<State>>
): IncludeByPrefix<Divisions[number]['prefix'], State> {
  // eslint-disable-next-line
  return spreadDivisions(divisions, transformCallback(...args)) as any;
}

export function divisionHook<Prefix extends string, Store extends object>(
  useStore: UseBoundStore<StoreApi<Store>>,
  division: Division<Prefix, FilterByPrefix<Prefix, Store>>
): UseBoundDivision<FilterByPrefix<Prefix, Store>> {
  type T = FilterByPrefix<Prefix, Store>;

  const hook: UseBoundDivision<T> = ((selector) => {
    return useStore((state) => {
      const unprefixState = getUnprefixedObject(division.prefix, state);
      return selector(unprefixState);
    });
  }) as UseBoundDivision<T>;

  const get: GetState<T> = () => {
    const state = useStore.getState();
    return getUnprefixedObject(division.prefix, state);
  };
  const set: SetState<T> = (state) => {
    useStore.setState((currentState) => {
      const unprefixedState = getUnprefixedObject(
        division.prefix,
        currentState
      );
      const updatedState =
        typeof state === 'function'
          ? (state as (s: T) => T | Partial<T>)(unprefixedState)
          : state;
      return {
        ...currentState,
        ...getPrefixedObject(division.prefix, updatedState),
      };
    });
  };

  hook.getState = get;
  hook.setState = set;

  return hook;
}

export function divisionHooks<
  Store extends object,
  Divisions extends readonly Division[],
  Result = {
    [K in keyof Divisions]: Divisions[K] extends Division<string, infer Data>
      ? UseBoundDivision<Data>
      : never;
  }
>(useStore: UseBoundStore<StoreApi<Store>>, ...divisions: Divisions) {
  return divisions.map((division) =>
    divisionHook(useStore, division)
  ) as Result;
}

export function stateToDivision<Prefix extends string, State extends object>(
  division: Division<Prefix>,
  state: State
) {
  return getUnprefixedObject(division.prefix, state);
}

export function divisionToState<Prefix extends string, State extends object>(
  division: Division<Prefix>,
  state: State
) {
  return getPrefixedObject(division.prefix, state);
}

export function createDivision<T, Options = unknown>() {
  return <Prefix extends string>(
    callback: () => Division<Prefix, T, Options>
  ) => callback;
}
