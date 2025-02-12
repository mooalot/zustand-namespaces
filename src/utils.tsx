import {
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  useStore,
} from 'zustand';
import { shallow } from 'zustand/shallow';
import {
  ExcludeByPrefix,
  FilterByPrefix,
  IncludeByPrefix,
  Namespace,
  Namespaced,
  PrefixObject,
  UseBoundNamespace,
} from './types';
import { useDebugValue, useSyncExternalStore } from 'react';

function getNamespacedApi<T extends object, Name extends string>(
  namespace: Namespace<FilterByPrefix<Name, T>, Name>,
  api: StoreApi<T>
): StoreApi<FilterByPrefix<Name, T>> {
  return {
    getInitialState: () => {
      return getUnprefixedObject(namespace.name, api.getInitialState());
    },
    getState: () => {
      return getUnprefixedObject(namespace.name, api.getState());
    },
    setState: (state, replace) => {
      api.setState((currentState) => {
        const unprefixedState = getUnprefixedObject(
          namespace.name,
          currentState
        );
        const updatedState =
          typeof state === 'function' ? state(unprefixedState) : state;
        if (replace) {
          const prefixedState = getPrefixedObject(
            namespace.name,
            unprefixedState
          );
          const newState = { ...currentState };
          for (const key in prefixedState) {
            delete newState[key];
          }
          return {
            ...newState,
            ...getPrefixedObject(namespace.name, updatedState),
          };
        }
        return getPrefixedObject(namespace.name, updatedState) as T;
      });
    },
    subscribe: (listener) => {
      return api.subscribe((newState, oldState) => {
        const newUnprefixedState = getUnprefixedObject(
          namespace.name,
          newState
        );
        const oldUnprefixedState = getUnprefixedObject(
          namespace.name,
          oldState
        );
        if (shallow(newUnprefixedState, oldUnprefixedState)) return;
        listener(
          getUnprefixedObject(namespace.name, newState),
          getUnprefixedObject(namespace.name, oldState)
        );
      });
    },
  };
}

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
  const { setState, getState, subscribe, getInitialState } = originalApi;

  const newApi: StoreApi<O> = {
    ...originalApi,
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
          replace as true
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
        originalSet(
          getPrefixedObject(namespace.name, set) as State,
          replace as true
        );
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

function getNamespaceHook<Name extends string, Store extends object>(
  api: StoreApi<Store>,
  namespace: Namespace<FilterByPrefix<Name, Store>, Name>
) {
  type BoundStore = UseBoundNamespace<StoreApi<FilterByPrefix<Name, Store>>>;
  const namespaceApi = getNamespacedApi(namespace, api);
  const hook = ((selector) => {
    return useStore(namespaceApi, selector);
  }) as BoundStore;

  return Object.assign(hook, namespaceApi);
}

/**
 * Helper method for going from a state to a namespace.
 * @param namespace A namespace
 * @param state The state of the store
 * @returns The namespace state
 */
export function toNamespace<State extends object, N extends string>(
  namespace: Pick<Namespace<FilterByPrefix<N, State>, N>, 'name'>,
  state: State
) {
  return getUnprefixedObject(namespace.name, state);
}

/**
 * Helper method for going to a state from a namespace.
 * @param namespace A namespace
 * @param state The state of the store
 * @returns The namespace state
 */
export function fromNamespace<State extends object, P extends string>(
  namespace: Pick<Namespace<FilterByPrefix<P, State>, P>, 'name'>,
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
type WithNamespace<S, A> = S extends {
  getState: () => infer T;
}
  ? A extends Namespace[]
    ? Write<
        S,
        {
          namespaces: {
            [N in A[number] as N['name']]: () => UseBoundNamespace<
              StoreApi<FilterByPrefix<N['name'], T>>
            >;
          };
        }
      >
    : never
  : never;

declare module 'zustand/vanilla' {
  interface StoreMutators<S, A> {
    'zustand-namespaces': WithNamespace<S, A>;
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
  creator?: StateCreator<
    Result,
    [...Mps, ['zustand-namespaces', unknown]],
    Mcs,
    Excluded
  >
) => StateCreator<
  Result,
  Mps,
  [['zustand-namespaces', Namespaces], ...Mcs],
  Result
> {
  // @ts-expect-error  // eslint-disable-next-line
  return (creator) => {
    return (...args) => {
      const [set, get, api] = args;
      const apiWithNamespace = api as WithNamespace<typeof api, Namespaces>;
      apiWithNamespace.namespaces = apiWithNamespace.namespaces ?? {};
      for (const namespace of namespaces) {
        console.log('namespace', namespace);
        apiWithNamespace.namespaces[namespace.name] = () =>
          getNamespaceHook(api, namespace) as any;
      }

      return {
        ...spreadTransformedNamespaces(namespaces, set, get, apiWithNamespace),
        // @ts-expect-error // eslint-disable-next-line
        ...creator?.(set, get, apiWithNamespace),
      };
    };
  };
}
