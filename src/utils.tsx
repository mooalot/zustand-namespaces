import {
  ExcludeByPrefix,
  FilterByPrefix,
  GetState,
  IncludeByPrefix,
  PrefixObject,
  SetState,
  Division,
  Divide,
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

/**
 * Method used to spread division data into a parent state.
 * @param divisions The divisions
 * @param callback A callback that returns the division data
 * @returns The combined division data
 * @example
 */
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
 * Method used to divide divisions into a parent creator method.
 * @param creator The parent creator method
 * @param divisions The divisions
 * @returns A new creator method that includes the divisions
 * @example
 * const createDivision1 = create<Divide<typeof [divisions1]>>()(
 *  divide(() => ({}), [divisions1])
 * );
 */
export function divide<
  T extends object,
  Divisions extends readonly Division[],
  Mis extends [StoreMutatorIdentifier, unknown][] = [],
  Mos extends [StoreMutatorIdentifier, unknown][] = [],
  Option extends ExcludeByPrefix<
    Divisions[number]['prefix'],
    T
  > = ExcludeByPrefix<Divisions[number]['prefix'], T>,
  Result extends Option & Divide<Divisions> = Option & Divide<Divisions>
>(
  creator: StateCreator<T, Mis, Mos, Option>,
  divisions: Divisions
): StateCreator<Result, Mis, Mos, Result> {
  return (...args) => {
    return {
      ...spreadTransformedDivisions(divisions, ...args),
      ...creator(...(args as Parameters<StateCreator<T, Mis, Mos, Option>>)),
    } as Result;
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

/**
 * Helper method for creating a division hook.
 * @param useStore The parent store hook
 * @param division The division
 * @returns A division hook
 * @note The store passed into this method could be another division hook if you want to create nested division hooks
 * @example
 * const useDivision = divisionHook(useStore, division);
 * const useSubDivision = divisionHook(useDivision, subDivision);
 */
export function divisionHook<Prefix extends string, Store extends object>(
  useStore: UseBoundStore<StoreApi<Store>>,
  division: Division<Prefix, FilterByPrefix<Prefix, Store>>
): UseBoundStore<StoreApi<FilterByPrefix<Prefix, Store>>> {
  type T = FilterByPrefix<Prefix, Store>;

  const hook: UseBoundStore<StoreApi<T>> = ((selector) => {
    return useStore((state) => {
      const unprefixState = getUnprefixedObject(division.prefix, state);
      return selector(unprefixState);
    });
  }) as UseBoundStore<StoreApi<T>>;

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

/**
 * Helper method for creating multiple division hooks.
 * @param useStore The parent store hook
 * @param divisions The divisions
 * @returns An array of division hooks
 * @note The store passed into this method could be another division hook if you want to create nested division hooks
 * @example
 * const [useDivision1, useDivision2] = divisionHooks(useStore, ...divisions);
 * const [useSubDivision1] = divisionHooks(useDivision1, ...subDivisions);
 */
export function divisionHooks<
  Store extends object,
  Divisions extends readonly Division[],
  Result = {
    [K in keyof Divisions]: Divisions[K] extends Division<string, infer Data>
      ? UseBoundStore<StoreApi<Data>>
      : never;
  }
>(useStore: UseBoundStore<StoreApi<Store>>, ...divisions: Divisions) {
  return divisions.map((division) =>
    divisionHook(useStore, division)
  ) as Result;
}

/**
 * Helper method for going from a division to a state (usually parent state).
 * @param division A division
 * @param state The state of the store
 * @returns The division state
 */
export function stateToDivision<Prefix extends string, State extends object>(
  division: Division<Prefix>,
  state: State
) {
  return getUnprefixedObject(division.prefix, state);
}

/**
 * Helper method for going from a state (usually parent state) to a division.
 * @param division A division
 * @param state The state of the store
 * @returns The division state
 */
export function divisionToState<Prefix extends string, State extends object>(
  division: Division<Prefix>,
  state: State
) {
  return getPrefixedObject(division.prefix, state);
}

/**
 * Helper method for creating a division.
 * @param callback A callback that returns a division
 * @returns A function that returns a division
 */
export function createDivision<T = 'IllInferYourType', Options = unknown>() {
  return <Prefix extends string, Data>(
    callback: () => Division<
      Prefix,
      T extends 'IllInferYourType' ? Data : T,
      Options
    >
  ) => callback;
}

/**
 * Helper method for partializing a division. This method is often used in 3rd party libraries to create a partialized version of a store.
 * @param state The state of the store
 * @param getPartializeFn A function that returns a partialized version of the division
 * @returns A function that returns a partialized version of the division
 */
export function partializeDivision<
  P extends string,
  State extends object,
  Options
>(
  state: State,
  getPartializeFn: (
    division: Division<P, FilterByPrefix<P, State>, Options>
  ) =>
    | ((state: FilterByPrefix<P, State>) => Partial<FilterByPrefix<P, State>>)
    | undefined
) {
  return (division: Division<P, FilterByPrefix<P, State>, Options>) => {
    const divisionData = stateToDivision(division, state);
    const partializedData = getPartializeFn(division)?.(divisionData);
    return divisionToState(division, partializedData ?? {});
  };
}

/**
 * Helper method for partializing a division. This method is often used in 3rd party libraries to create a partialized version of a store.
 * @param state The state of the store
 * @param divisions The divisions of the store
 * @param getPartializeFn A function that returns a partialized version of the division
 * @returns A function that returns a partialized version of the division
 */
export function partializeDivisions<
  State extends object,
  Divisions extends readonly Division[]
>(
  state: State,
  divisions: Divisions,
  getPartializeFn: (
    division: Divisions[number]
  ) =>
    | ((
        state: FilterByPrefix<Divisions[number]['prefix'], State>
      ) => Partial<FilterByPrefix<Divisions[number]['prefix'], State>>)
    | undefined
) {
  return spreadDivisions(divisions, partializeDivision(state, getPartializeFn));
}
