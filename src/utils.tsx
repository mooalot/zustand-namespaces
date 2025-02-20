import {
  ExtractState,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  StoreMutators,
  UseBoundStore,
} from 'zustand';
import {
  ExcludeByPrefix,
  ExtractNamespaces,
  FilterByPrefix,
  IncludeByPrefix,
  Namespace,
  NamespacedState,
  PrefixObject,
  UnNamespacedState,
  UseBoundNamespace,
} from './types';

type WithNames<T> = T & {
  namespaces: any;
  namespacePath?: Namespace[];
};

function getNamespacedApi<T extends object, Name extends string>(
  namespace: Namespace<FilterByPrefix<Name, T>, Name>,
  api: WithNames<StoreApi<T>>
): WithNames<StoreApi<FilterByPrefix<Name, T>>> {
  const namespacedApi: WithNames<StoreApi<FilterByPrefix<Name, T>>> = {
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
        listener(
          getUnprefixedObject(namespace.name, newState),
          getUnprefixedObject(namespace.name, oldState)
        );
      });
    },
    namespaces: api.namespaces,
    namespacePath: [namespace, ...(api.namespacePath ?? [])],
  };

  return new Proxy(namespacedApi, {
    set: (target, prop, value) => {
      Object.assign(api, {
        namespaces: {
          ...api.namespaces,
          [namespace.name]: {
            ...api.namespaces[namespace.name],
            [String(prop)]: value,
          },
        },
      });

      return Reflect.set(target, prop, value);
    },
  });
}

export function transformStateCreatorArgs<
  N extends string,
  State extends object
>(
  namespace: Namespace<FilterByPrefix<N, State>, N>,
  ...args: Parameters<StateCreator<State>>
): Parameters<StateCreator<FilterByPrefix<N, State>>> {
  const [, , originalApi] = args;

  const newApi = getNamespacedApi(
    namespace,
    originalApi as WithNames<StoreApi<State>>
  );

  return [newApi.setState, newApi.getState, newApi];
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

function spreadNamespaces<Namespaces extends readonly Namespace[], Data>(
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
    const originalApi = args[2] as WithNames<StoreApi<State>>;
    const [set, get, api] = transformStateCreatorArgs(namespace, ...args);
    Object.assign(originalApi, {
      namespaces: {
        ...originalApi.namespaces,
        [namespace.name]: {
          ...originalApi.namespaces[namespace.name],
          ...api,
        },
      },
    });
    return getPrefixedObject(namespace.name, namespace.creator(set, get, api));
  };
}

function spreadTransformedNamespaces<
  State extends object,
  Namespaces extends readonly Namespace[]
>(
  namespaces: Namespaces,
  ...args: Parameters<StateCreator<State>>
): IncludeByPrefix<Namespaces[number]['name'], State> {
  return spreadNamespaces(namespaces, transformCallback(...args)) as any;
}

/**
 * Method used to get hooks for multiple namespaces.
 * @param store The store or namespace to get the hooks from (parent store)
 * @param namespaces The namespaces
 */
export function getNamespaceHooks<
  S extends StoreApi<any>,
  NewNamespaces extends readonly Namespace<any, string, any, any>[],
  CurrentNamespaces extends readonly Namespace<any, string, any, any>[] = []
>(
  store: UseBoundStore<S> | UseBoundNamespace<S, CurrentNamespaces>,
  ...namespaces: NewNamespaces
): {
  [K in keyof NewNamespaces]: UseBoundNamespace<
    S extends { namespaces: any }
      ? S extends StoreApi<any>
        ? NewNamespaces[K]['name'] extends keyof S['namespaces']
          ? S['namespaces'][NewNamespaces[K]['name']] &
              StoreApi<
                FilterByPrefix<NewNamespaces[K]['name'], ExtractState<S>>
              >
          : StoreApi<{ failed3: 'failed' }>
        : StoreApi<{ failed2: 'failed' }>
      : StoreApi<{ failed1: 'failed' }>,
    [...CurrentNamespaces, NewNamespaces[K]] // Track the current namespace chain
  >;
} {
  return namespaces.map((namespace) =>
    getOneNamespaceHook(store, namespace)
  ) as any;
}

function getOneNamespaceHook<
  Name extends string,
  Store extends object,
  Namespaces extends readonly Namespace[]
>(
  useStore:
    | UseBoundStore<StoreApi<Store>>
    | UseBoundNamespace<StoreApi<Store>, Namespaces>,
  namespace: Namespace<FilterByPrefix<Name, Store>, Name>
) {
  type BoundStore = UseBoundNamespace<
    StoreApi<FilterByPrefix<Name, Store>>,
    [Namespace<FilterByPrefix<Name, Store>, Name>, ...Namespaces]
  >;
  const hook = ((selector) => {
    return useStore((state) => {
      return selector(toNamespace(state, namespace) as any);
    });
  }) as BoundStore;

  const store = useStore as unknown as WithNames<StoreApi<Store>>;
  const originalApi: WithNames<StoreApi<Store>> =
    store.namespaces[namespace.name];

  if (!originalApi) throw new Error('Namespace not found');
  return Object.assign(hook, originalApi, {
    getRawState: () => {
      return fromNamespace(
        originalApi.getState(),
        ...(originalApi.namespacePath ?? [])
      );
    },
  });
}

/**
 * Helper method for going from a state to a namespace.
 * @param state The state of the store
 * @param namespaces The namespace(s) to go to. If multiple namespaces are provided, the last namespace will be the one returned.
 * @returns The namespace state
 */
export function toNamespace<
  State,
  Namespaces extends readonly Namespace<any, string, any, any>[]
>(state: State, ...namespaces: Namespaces): NamespacedState<State, Namespaces> {
  let current: any = state;
  for (let i = 0; i < namespaces.length; i++) {
    current = getUnprefixedObject(namespaces[i].name, current);
  }
  return current;
}

/**
 * Helper method for going to a state from a namespace.
 *  * @param state The state of the store
 * @param namespaces The namespace(s) to come from. If multiple namespaces are provided, the last namespace will be the one returned.
 * @returns The namespace state
 */
export function fromNamespace<
  State,
  Namespaces extends readonly Namespace<any, string, any, any>[]
>(
  state: State,
  ...namespaces: Namespaces
): UnNamespacedState<State, Namespaces> {
  let current: any = state;
  for (let i = 0; i < namespaces.length; i++) {
    current = getPrefixedObject(namespaces[i].name, current);
  }
  return current;
}

type CreateNamespace = {
  // inferred
  <
    T,
    Name extends string,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    name: Name,
    creator: StateCreator<T, Mps, Mcs>
  ): Namespace<T, Name, Mps, Mcs>;
  // explicit
  <T>(): <
    Name extends string,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    name: Name,
    creator: StateCreator<T, Mps, Mcs>
  ) => Namespace<T, Name, Mps, Mcs>;
};

export const createNamespace = ((one?: any, two?: any) => {
  if (one && two) {
    return {
      name: one,
      creator: two,
    };
  } else {
    return (name: any, creator: any) => ({
      name,
      creator,
    });
  }
}) as CreateNamespace;

declare module 'zustand/vanilla' {
  // eslint-disable-next-line
  interface StoreMutators<S, A> {
    'zustand-namespaces': WithNamespaces<S, A>;
  }
}

type MergeMs<
  S,
  Ms extends [StoreMutatorIdentifier, unknown][],
  Current = {}
> = Ms extends [[infer M, infer A], ...infer Rest]
  ? Rest extends [StoreMutatorIdentifier, unknown][]
    ? M extends keyof StoreMutators<S, A>
      ? MergeMs<
          S,
          Rest,
          Current & Omit<StoreMutators<S, A>[M], keyof StoreApi<any>>
        >
      : Current
    : Current
  : Current;

type Write<T, U> = Omit<T, keyof U> & U;
type WithNamespaces<S, A> = A extends Namespace<any, string, any, any>[]
  ? Write<
      S,
      {
        namespaces: {
          [NS in A[number] as NS extends Namespace<any, infer N, any, any>
            ? N extends string
              ? N
              : never
            : never]: NS extends Namespace<any, any, any, infer Mcs>
            ? MergeMs<S, Mcs>
            : {};
        };
      }
    >
  : S;

type Assert<T, Expected> = T extends Expected ? T : never;
type Namespaced = {
  <
    T,
    Namespaces extends readonly Namespace<any, string, any, any>[],
    Excluded extends ExcludeByPrefix<Namespaces[number]['name'], T>,
    Result extends Excluded & ExtractNamespaces<Namespaces>,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    creator: StateCreator<
      T,
      [...Mps, ['zustand-namespaces', Namespaces]],
      Mcs,
      T
    >,
    options: {
      namespaces: Namespaces;
    }
  ): StateCreator<Result, Mps, [['zustand-namespaces', Namespaces], ...Mcs]>;
  (): <
    T,
    Namespaces extends readonly Namespace<any, string, any, any>[],
    Excluded extends ExcludeByPrefix<Namespaces[number]['name'], T>,
    Result extends Excluded & ExtractNamespaces<Namespaces>,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    creator: StateCreator<
      Result,
      [...Mps, ['zustand-namespaces', Namespaces]],
      Mcs,
      Excluded
    >,
    options: {
      namespaces: Namespaces;
    }
  ) => StateCreator<T, Mps, [['zustand-namespaces', Namespaces], ...Mcs]>;
  <
    T extends ExtractNamespaces<Namespaces>,
    Namespaces extends readonly Namespace<any, string, any, any>[],
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(options: {
    namespaces: Namespaces;
  }): StateCreator<T, Mps, [['zustand-namespaces', Namespaces], ...Mcs], T> &
    Assert<T, ExtractNamespaces<Namespaces>>;
};

export const namespaced = ((one?: any, two?: any) => {
  if (!one && !two) {
    return (creator: any, options: any) => {
      const { namespaces } = options;
      console.log('namespaces', namespaces);
      return (set: any, get: any, api: any) => {
        const apiWithNamespaces = Object.assign(api, {
          namespaces: {},
        });
        return {
          ...spreadTransformedNamespaces(
            namespaces,
            set,
            get,
            apiWithNamespaces
          ),
          ...creator(set, get, apiWithNamespaces),
        };
      };
    };
  } else if (!two) {
    return (creator: any) => {
      const { namespaces } = one;
      return (set: any, get: any, api: any) => {
        const apiWithNamespaces = Object.assign(api, {
          namespaces: {},
        });
        return {
          ...spreadTransformedNamespaces(
            namespaces,
            set,
            get,
            apiWithNamespaces
          ),
          ...creator(set, get, apiWithNamespaces),
        };
      };
    };
  } else {
    const { namespaces } = two;
    return (set: any, get: any, api: any) => {
      const apiWithNamespaces = Object.assign(api, {
        namespaces: {},
      });
      return {
        ...spreadTransformedNamespaces(namespaces, set, get, apiWithNamespaces),
        ...one(set, get, apiWithNamespaces),
      };
    };
  }
}) as Namespaced;
