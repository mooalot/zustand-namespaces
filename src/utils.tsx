import {
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  UseBoundStore,
} from 'zustand';
import {
  ExcludeByPrefix,
  FilterByPrefix,
  IncludeByPrefix,
  Namespace,
  Namespaced,
  PrefixObject,
} from './types';

export function transformStateCreatorArgs<
  N extends string,
  State extends object,
  T
>(
  namespace: Namespace<T, N>,
  ...args: Parameters<StateCreator<State>>
): Parameters<StateCreator<FilterByPrefix<N, State>>> {
  type O = FilterByPrefix<N, State>;
  const [originalSet, get, originalApi] = args;
  const { setState, getState, subscribe, getInitialState, destroy } =
    originalApi;

  const newApi: StoreApi<O> = {
    setState: (state, replace) => {
      if (typeof state === 'function') {
        setState((currentState) => {
          const unprefixedState = getUnprefixedObject(
            namespace.name,
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
            ...getPrefixedObject(namespace.name, state),
          },
          replace
        );
      }
    },
    getState: () => {
      return getUnprefixedObject(namespace.name, getState());
    },
    subscribe: (listener) => {
      return subscribe((newPrefixedState, oldPrefixedState) => {
        listener(
          getUnprefixedObject(namespace.name, newPrefixedState),
          getUnprefixedObject(namespace.name, oldPrefixedState)
        );
      });
    },
    getInitialState: () => {
      return getUnprefixedObject(namespace.name, getInitialState());
    },
    destroy,
  };

  return [
    (set, replace) => {
      if (typeof set === 'function') {
        originalSet((state) => {
          const unprefixedState = getUnprefixedObject(namespace.name, state);
          const updatedState = set(unprefixedState);
          return getPrefixedObject(namespace.name, updatedState) as State;
        });
      } else {
        originalSet(getPrefixedObject(namespace.name, set) as State, replace);
      }
    },
    () => {
      return getUnprefixedObject(namespace.name, get());
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
 * Method used to spread namespace data into a parent state.
 * @param namespaces The namespaces
 * @param callback A callback that returns the namespace data
 * @returns The combined namespace data
 */
export function spreadNamespaces<Namespaces extends readonly Namespace[], Data>(
  namespaces: Namespaces,
  callback: (namespace: Namespaces[number]) => Data
) {
  return namespaces.reduce((acc, namespace) => {
    return {
      ...acc,
      ...callback(namespace),
    };
  }, {} as Data);
}

function transformCallback<State extends object>(
  ...args: Parameters<StateCreator<State>>
) {
  return function <P extends string>(
    namespace: Namespace<FilterByPrefix<P, State>, P>
  ) {
    const newArgs = transformStateCreatorArgs(namespace, ...args);
    return getPrefixedObject(namespace.name, namespace.creator(...newArgs));
  };
}

function spreadTransformedNamespaces<
  State extends object,
  Namespaces extends readonly Namespace[]
>(
  namespaces: Namespaces,
  ...args: Parameters<StateCreator<State>>
): IncludeByPrefix<Namespaces[number]['name'], State> {
  // eslint-disable-next-line
  return spreadNamespaces(namespaces, transformCallback(...args)) as any;
}

/**
 * Helper method for creating a namespace hook.
 * @param useStore The parent store hook
 * @param namespace The namespace
 * @returns A namespace hook
 * @note The store passed into this method could be another namespace hook if you want to create nested namespace hooks
 * @example
 * const useNamespace = getNamespaceHook(useStore, namespace);
 * const useSubNamespace = getNamespaceHook(useNamespace, subNamespace);
 */
export function getNamespaceHook<Name extends string, Store extends object>(
  originStore: UseBoundStore<StoreApi<Store>>,
  namespace: Namespace<FilterByPrefix<Name, Store>, Name>
): UseBoundStore<StoreApi<FilterByPrefix<Name, Store>>> {
  type T = FilterByPrefix<Name, Store>;

  type BoundStore = UseBoundStore<StoreApi<T>>;

  // const originHook = ((selector?: any) =>
  //   useStore(api, selector)) as UseBoundStore<StoreApi<Store>>;

  const hook = ((selector) => {
    return originStore((state) => {
      const unprefixState = getUnprefixedObject(namespace.name, state);
      return selector ? selector(unprefixState) : unprefixState;
    });
  }) as BoundStore;

  const get: BoundStore['getState'] = () => {
    const state = originStore.getState();
    return getUnprefixedObject(namespace.name, state);
  };
  const set: BoundStore['setState'] = (state) => {
    originStore.setState((currentState) => {
      const unprefixedState = getUnprefixedObject(namespace.name, currentState);
      const updatedState =
        typeof state === 'function' ? state(unprefixedState) : state;
      return getPrefixedObject(namespace.name, updatedState) as Store;
    });
  };

  const subscribe: BoundStore['subscribe'] = (listener) => {
    return originStore.subscribe((newState, oldState) => {
      listener(
        getUnprefixedObject(namespace.name, newState),
        getUnprefixedObject(namespace.name, oldState)
      );
    });
  };

  const getInitialState: BoundStore['getInitialState'] = () => {
    return getUnprefixedObject(namespace.name, originStore.getInitialState());
  };

  hook.getInitialState = getInitialState;
  hook.getState = get;
  hook.setState = set;
  hook.subscribe = subscribe;
  hook.destroy = originStore.destroy;

  return hook;
}

/**
 * Helper method for creating multiple namespace hooks.
 * @param useStore The parent store hook
 * @param namespaces The namespaces
 * @returns An array of namespace hooks
 * @note The store passed into this method could be another namespace hook if you want to create nested namespace hooks
 * @example
 * const [useNamespace1, useNamespace2] = getNamespaceHooks(useStore, ...namespaces);
 * const [useSubNamespace1] = getNamespaceHooks(useNamespace1, ...subNamespaces);
 */
export function getNamespaceHooks<
  Store extends object,
  Namespaces extends readonly Namespace[],
  Result = {
    [K in keyof Namespaces]: Namespaces[K] extends Namespace<infer Data, string>
      ? UseBoundStore<StoreApi<Data>>
      : never;
  }
>(useStore: UseBoundStore<StoreApi<Store>>, ...namespaces: Namespaces) {
  return namespaces.map((namespace) =>
    getNamespaceHook(useStore, namespace)
  ) as Result;
}

/**
 * Helper method for going from a namespace to a state (usually parent state).
 * @param namespace A namespace
 * @param state The state of the store
 * @returns The namespace state
 */
export function toNamespace<State extends object, N extends string>(
  // eslint-disable-next-line
  namespace: Namespace<any, N>,
  state: State
) {
  return getUnprefixedObject(namespace.name, state);
}

/**
 * Helper method for going from a state (usually parent state) to a namespace.
 * @param namespace A namespace
 * @param state The state of the store
 * @returns The namespace state
 */
export function fromNamespace<State extends object, P extends string>(
  // eslint-disable-next-line
  namespace: Namespace<any, P>,
  state: State
) {
  return getPrefixedObject(namespace.name, state);
}

type CreateNamespace = {
  <Name extends string, Data, Options>(
    callback: () => Namespace<Data, Name, Options>
    // eslint-disable-next-line
  ): Namespace<Data, Name, Options, any, any>;
  <T, Options = unknown>(): <Name extends string>(
    // eslint-disable-next-line
    callback: () => Namespace<T, Name, Options, any, any>
  ) => Namespace<T, Name, Options>;
};

/**
 * Helper method for creating a namespace.
 * @param callback A callback that returns a namespace
 * @returns A function that returns a namespace
 */
// eslint-disable-next-line
export const createNamespace: CreateNamespace = ((callback?: any) => {
  if (callback) {
    // The first overload implementation
    return callback();
  } else {
    // The second overload implementation
    return <Prefix extends string, Data, Options>(
      callback: () => Namespace<Data, Prefix, Options>
    ) => {
      return callback();
    };
  }
}) as CreateNamespace;

/**
 * Helper method for partializing a namespace. This method is often used in 3rd party libraries to create a partialized version of a store.
 * @param state The state of the store
 * @param getPartializeFn A function that returns a partialized version of the namespace
 * @returns A function that returns a partialized version of the namespace
 */
export function partializeNamespace<
  P extends string,
  State extends object,
  Options
>(
  state: State,
  getPartializeFn: (
    namespace: Namespace<FilterByPrefix<P, State>, P, Options>
  ) =>
    | ((state: FilterByPrefix<P, State>) => Partial<FilterByPrefix<P, State>>)
    | undefined
) {
  return (namespace: Namespace<FilterByPrefix<P, State>, P, Options>) => {
    const namespaceData = toNamespace(namespace, state);
    const partializedData = getPartializeFn(namespace)?.(namespaceData);
    return fromNamespace(namespace, partializedData ?? {});
  };
}

/**
 * Helper method for partializing a namespace. This method is often used in 3rd party libraries to create a partialized version of a store.
 * @param state The state of the store
 * @param namespaces The namespaces of the store
 * @param getPartializeFn A function that returns a partialized version of the namespace
 * @returns A function that returns a partialized version of the namespace
 */
export function partializeNamespaces<
  State extends object,
  Namespaces extends readonly Namespace[],
  // function not typed due to union type error from namespaces
  Fn extends <D extends Namespaces[number]>(
    namespace: D
  ) => // eslint-disable-next-line
  ((state: any) => any) | undefined
>(state: State, namespaces: Namespaces, getPartializeFn: Fn) {
  return spreadNamespaces(
    namespaces,
    partializeNamespace(state, getPartializeFn)
  );
}

type Write<T, U> = Omit<T, keyof U> & U;
type WithNamespace<S, A> = S extends { getState: () => infer T }
  ? A extends Namespace[]
    ? Write<
        S,
        {
          namespaces: {
            [N in A[number] as N['name']]: () => UseBoundStore<
              StoreApi<FilterByPrefix<N['name'], T>>
            >;
          };
        }
      >
    : never
  : never;

declare module 'zustand/vanilla' {
  interface StoreMutators<S, A> {
    'zustand-namespace': WithNamespace<S, A>;
  }
}

export function namespaced<Namespaces extends readonly Namespace[]>(
  ...namespaces: Namespaces
): <
  T,
  Excluded extends ExcludeByPrefix<Namespaces[number]['name'], T>,
  Result extends Excluded & Namespaced<Namespaces>,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  creator: StateCreator<
    Result,
    [...Mps, ['zustand-namespace', unknown]],
    Mcs,
    Excluded
  >
) => StateCreator<
  Result,
  Mps,
  [['zustand-namespace', Namespaces], ...Mcs],
  Result
> {
  // @ts-expect-error  // eslint-disable-next-line
  return (creator) => {
    return (...args) => {
      // const [set, get, api] = args;
      // const originHook = (selector?: any) => useStore(api, selector);
      // const useBoundStore = Object.assign(originHook, api);

      // const apiWithNamespace = api as WithNamespace<typeof api, Namespaces>;
      // apiWithNamespace.namespaces = {};
      // for (const namespace of namespaces) {
      //   apiWithNamespace.namespaces[namespace.name] = () =>
      //     getNamespaceHook(useBoundStore, namespace) as any;
      // }

      return {
        ...spreadTransformedNamespaces(namespaces, ...args),
        // @ts-expect-error // eslint-disable-next-line
        ...creator?.(...args),
      };
    };
  };
}
