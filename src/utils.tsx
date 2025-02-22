import {
  ExtractState,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  StoreMutators,
  UseBoundStore,
} from 'zustand';
import {
  CreateNamespace,
  ExcludeByPrefix,
  ExtractNamespaces,
  FilterByPrefix,
  IncludeByPrefix,
  Namespace,
  Namespaced,
  NamespacedState,
  PrefixObject,
  UnNamespacedState,
  UseBoundNamespace,
  WithNames,
} from './types';

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
      const currentState = api.getState();
      const unprefixedState = getUnprefixedObject(namespace.name, currentState);
      const updatedState =
        typeof state === 'function' ? state(unprefixedState) : state;

      //todo fix this
      // if (replace) {
      //   const prefixedState = getPrefixedObject(
      //     namespace.name,
      //     unprefixedState
      //   );
      //   const newState = { ...currentState };
      //   for (const key in prefixedState) {
      //     delete newState[key];
      //   }

      //   return {
      //     ...newState,
      //     ...getPrefixedObject(namespace.name, updatedState),
      //   };
      // }

      const newState = getPrefixedObject(namespace.name, updatedState);
      console.log('does it have payload', !!api._payload);
      if (!!api._payload) {
        api._payload = {
          ...api._payload,
          ...newState,
        };
        console.log('new payload', api._payload);
      } else api.setState(newState as T);
    },
    subscribe: (listener) => {
      return api.subscribe((newState, oldState) => {
        listener(
          getUnprefixedObject(namespace.name, newState),
          getUnprefixedObject(namespace.name, oldState)
        );
      });
    },
    namespaces: {},
    namespacePath: [...(api.namespacePath ?? []), namespace],
  };

  return namespacedApi;
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
        [namespace.name]: api,
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

export function getNamespaceHooks<
  S extends StoreApi<any> & { namespaces: any },
  Namespaces extends readonly Namespace<any, string, any, any>[],
  CurrentNamespaces extends readonly Namespace<any, string, any, any>[] = []
>(
  store: UseBoundStore<S> | UseBoundNamespace<S, CurrentNamespaces>,
  ...namespaces: Namespaces
) {
  return namespaces.reduce(
    (acc, namespace) => {
      return {
        ...acc,
        [namespace.name]: getOneNamespaceHook(store, namespace),
      };
    },
    {} as {
      [NewNamespace in Namespaces[number] as NewNamespace extends Namespace<
        any,
        infer N,
        any,
        any
      >
        ? N extends string
          ? N
          : never
        : never]: UseBoundNamespace<
        NewNamespace['name'] extends keyof S['namespaces']
          ? S['namespaces'][NewNamespace['name']] &
              StoreApi<FilterByPrefix<NewNamespace['name'], ExtractState<S>>>
          : never,
        [...CurrentNamespaces, NewNamespace]
      >; // Track the current namespace chain
    }
  );
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
 * @param namespaces The namespace(s) to come from.
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
  for (let i = namespaces.length - 1; i >= 0; i--) {
    current = getPrefixedObject(namespaces[i].name, current);
  }
  return current;
}

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

function getRootApi<Store extends object>(
  api: WithNames<StoreApi<Store>>
): WithNames<StoreApi<Store>> {
  const originalSet = api.setState;
  const setState: StoreApi<Store>['setState'] = (state, replace) => {
    return originalSet((currentState) => {
      console.log('calling set state');
      api._payload = {};
      const newState =
        typeof state === 'function' ? state(currentState) : state;
      function callSetOnNamespaces(
        newState: any,
        namespaces: Record<string, WithNames<StoreApi<any>>>
      ) {
        for (const namespace in namespaces) {
          const namespaceApi = namespaces[namespace];
          const namespaceState = toNamespace(
            newState,
            ...(namespaceApi?.namespacePath ?? [])
          );
          if (Object.keys(namespaceState).length > 0)
            namespaceApi.setState(namespaceState, replace as any);
          const originalState = fromNamespace(
            namespaceState,
            ...(namespaceApi.namespacePath ?? [])
          );
          console.log(
            'namespace to delete',
            JSON.parse(JSON.stringify(originalState))
          );
          for (const key in originalState) {
            delete newState[key];
          }
        }
      }
      console.log('gunna get namespaced', newState);
      callSetOnNamespaces(newState, api.namespaces);
      console.log('newState', newState);

      const payload = api._payload;
      console.log('payload', payload);
      delete api._payload;
      return {
        ...newState,
        ...payload,
      };
    });
  };

  return Object.assign(api, {
    setState,
  });
}

export const namespaced = ((one?: any, two?: any) => {
  if (!two) {
    const { namespaces } = one;
    return (
      set: StoreApi<any>['setState'],
      get: StoreApi<any>['getState'],
      api: StoreApi<any>
    ) => {
      const apiWithNamespaces = Object.assign(api, {
        namespaces: {},
      });

      const rootApi = getRootApi(apiWithNamespaces);
      return {
        ...spreadTransformedNamespaces(
          namespaces,
          rootApi.setState,
          rootApi.getState,
          rootApi
        ),
      };
    };
  } else {
    const callback = one as (state: any) => StateCreator<any>;
    const { namespaces } = two as {
      namespaces: Namespace<any, string, any, any>[];
    };
    return (
      set: StoreApi<any>['setState'],
      get: StoreApi<any>['getState'],
      api: StoreApi<any>
    ) => {
      const apiWithNamespaces = Object.assign(api, {
        namespaces: {},
      });

      const rootApi = getRootApi(apiWithNamespaces);
      return {
        ...callback(
          spreadTransformedNamespaces(
            namespaces,
            rootApi.setState,
            get,
            rootApi
          )
        )(rootApi.setState, get, rootApi),
      };
    };
  }
}) as Namespaced;
