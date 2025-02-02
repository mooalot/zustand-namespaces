import {
  ExcludeByPrefix,
  FilterByPrefix,
  IncludeByPrefix,
  PrefixObject,
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
  division: Division<T, P>,
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
 */
export function divide<
  T extends object,
  Divisions extends readonly Division[],
  Option extends ExcludeByPrefix<Divisions[number]['prefix'], T>,
  Result extends Option & Divide<Divisions>,
  Mis extends [StoreMutatorIdentifier, unknown][] = [],
  Mos extends [StoreMutatorIdentifier, unknown][] = []
>(
  divisions: Divisions,
  creator?: StateCreator<Result, Mis, Mos, Option>
): StateCreator<Result, Mis, Mos, Result> {
  return (...args) => {
    return {
      ...spreadTransformedDivisions(divisions, ...args),
      ...creator?.(
        ...(args as Parameters<StateCreator<Result, Mis, Mos, Option>>)
      ),
    } as Result;
  };
}

function transformCallback<State extends object>(
  ...args: Parameters<StateCreator<State>>
) {
  return function <P extends string>(
    division: Division<FilterByPrefix<P, State>, P>
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
  division: Division<FilterByPrefix<Prefix, Store>, Prefix>
): UseBoundStore<StoreApi<FilterByPrefix<Prefix, Store>>> {
  type T = FilterByPrefix<Prefix, Store>;

  type BoundStore = UseBoundStore<StoreApi<T>>;

  const hook: BoundStore = ((selector) => {
    return useStore((state) => {
      const unprefixState = getUnprefixedObject(division.prefix, state);
      return selector ? selector(unprefixState) : unprefixState;
    });
  }) as BoundStore;

  const get: BoundStore['getState'] = () => {
    const state = useStore.getState();
    return getUnprefixedObject(division.prefix, state);
  };
  const set: BoundStore['setState'] = (state) => {
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

  const subscribe: BoundStore['subscribe'] = (listener) => {
    return useStore.subscribe((newState, oldState) => {
      listener(
        getUnprefixedObject(division.prefix, newState),
        getUnprefixedObject(division.prefix, oldState)
      );
    });
  };

  const getInitialState: BoundStore['getInitialState'] = () => {
    return getUnprefixedObject(division.prefix, useStore.getInitialState());
  };

  hook.getInitialState = getInitialState;
  hook.getState = get;
  hook.setState = set;
  hook.subscribe = subscribe;
  hook.destroy = useStore.destroy;

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
    [K in keyof Divisions]: Divisions[K] extends Division<infer Data, string>
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
export function stateToDivision<State extends object, P extends string>(
  // eslint-disable-next-line
  division: Division<any, P>,
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
export function divisionToState<State extends object, P extends string>(
  // eslint-disable-next-line
  division: Division<any, P>,
  state: State
) {
  return getPrefixedObject(division.prefix, state);
}

type CreateDivision = {
  <Prefix extends string, Data, Options>(
    callback: () => Division<Data, Prefix, Options>
  ): () => Division<Data, Prefix, Options>;
  <T, Options = unknown>(): <Prefix extends string>(
    callback: () => Division<T, Prefix, Options>
  ) => () => Division<T, Prefix, Options>;
};

/**
 * Helper method for creating a division.
 * @param callback A callback that returns a division
 * @returns A function that returns a division
 *
 * @example
 * const createTypedDivision = createDivision<Division1, CustomOptions<Division1>>()( () => ({
 *  prefix: 'division1',
 * creator: () => ({
 * dataInDivision1: 'data',
 * }),
 * }));
 *
 * const createTypeInferredDivision = createDivision(() => ({
 *  prefix: 'division1',
 * creator: () => ({
 * dataInDivision1: 'data',
 * }),
 * }));
 */
// eslint-disable-next-line
export const createDivision: CreateDivision = ((callback?: any) => {
  if (callback) {
    // The first overload implementation
    return () => callback();
  } else {
    // The second overload implementation
    return <Prefix extends string, Data, Options>(
      callback: () => Division<Data, Prefix, Options>
    ) => {
      return () => callback();
    };
  }
}) as CreateDivision;

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
    division: Division<FilterByPrefix<P, State>, P, Options>
  ) =>
    | ((state: FilterByPrefix<P, State>) => Partial<FilterByPrefix<P, State>>)
    | undefined
) {
  return (division: Division<FilterByPrefix<P, State>, P, Options>) => {
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
