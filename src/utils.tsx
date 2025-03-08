import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import {
  CreateNamespace,
  FilterByPrefix,
  Namespace,
  Namespaced,
  NamespacedState,
  PrefixObject,
  ToNamespace,
  UnNamespacedState,
  UseBoundNamespace,
  WithNames,
} from './types';

/**
 * This function will take a namespace and an api and return a new api that is namespaced.
 * @param namespace The namespace to apply
 * @param api The api to apply the namespace to
 */
function getNamespacedApi<
  T extends object,
  Name extends string,
  F extends boolean,
  S extends string
>(
  namespace: Namespace<ToNamespace<T, Name, F, S>, Name, any, any, F, S>,
  api: WithNames<StoreApi<T>>
): WithNames<StoreApi<ToNamespace<T, Name, F, S>>> {
  const namespacedApi: WithNames<StoreApi<ToNamespace<T, Name, F, S>>> = {
    getInitialState: () => {
      if (namespace.options?.flatten) {
        return getUnprefixedObject(
          namespace.name,
          api.getInitialState(),
          namespace.options?.separator ?? '_'
        );
      } else {
        return (api.getInitialState() as any)?.[namespace.name] ?? {};
      }
    },
    getState: () => {
      if (namespace.options?.flatten) {
        return getUnprefixedObject(
          namespace.name,
          api.getState(),
          namespace.options?.separator ?? '_'
        );
      } else {
        return (api.getState() as any)?.[namespace.name] ?? {};
      }
    },
    setState: (state, replace) => {
      namespacedApi._payload = {}; //payload isnt used, but stops namespaces from being traveresd too many times
      /**
       * Log is used for testing purposes. Specifically to test that the setState method is only called once per setState call.
       */
      console.debug(`test: setState_${namespace.name}`);
      const apiCurrentState = api.getState();
      const currentState = namespace.options?.flatten
        ? getUnprefixedObject(
            namespace.name,
            apiCurrentState,
            namespace.options?.separator ?? '_'
          )
        : (apiCurrentState as any)?.[namespace.name] ?? {};
      const updatedState =
        typeof state === 'function' ? (state as any)(currentState) : state;

      const newState = namespace.options?.flatten
        ? getPrefixedObject(
            namespace.name,
            updatedState,
            namespace.options?.separator ?? '_'
          )
        : {
            [namespace.name]: {
              ...currentState,
              ...updatedState,
            },
          };

      if (api._payload) {
        api._payload = {
          ...api._payload,
          ...newState,
        };
      } else {
        if (replace) {
          const replaceState = { ...apiCurrentState };

          if (namespace.options?.flatten) {
            const specificToNamespace = getPrefixedObject(
              namespace.name,
              currentState,
              namespace.options?.separator ?? '_'
            );
            for (const key in specificToNamespace) {
              delete (replaceState as any)[key];
            }
          } else {
            newState[namespace.name] = updatedState;
          }
          api.setState({ ...replaceState, ...newState } as T, replace as any);
        } else {
          if (namespace.options?.flatten) {
            api.setState(newState as T);
          } else {
            api.setState({
              ...apiCurrentState,
              ...newState,
            } as T);
          }
        }
      }
      delete namespacedApi._payload;
    },
    subscribe: (listener) => {
      return api.subscribe((newState, oldState) => {
        if (namespace.options?.flatten) {
          listener(
            getUnprefixedObject(
              namespace.name,
              newState,
              namespace.options?.separator ?? '_'
            ) as any,
            getUnprefixedObject(
              namespace.name,
              oldState,
              namespace.options?.separator ?? '_'
            ) as any
          );
        } else {
          listener(
            (newState as any)?.[namespace.name] ?? {},
            (oldState as any)?.[namespace.name] ?? {}
          );
        }
      });
    },
    namespaces: {},
    // build the path to the namespace
    namespacePath: [...(api.namespacePath ?? []), namespace],
  };

  return namespacedApi;
}

export function transformStateCreatorArgs<
  N extends string,
  State extends object,
  Flatten extends boolean = false,
  Separator extends string = '_'
>(
  namespace: Namespace<
    ToNamespace<State, N, Flatten, Separator>,
    N,
    any,
    any,
    Flatten,
    Separator
  >,
  ...args: Parameters<StateCreator<State>>
): Parameters<StateCreator<ToNamespace<State, N, Flatten, Separator>>> {
  const [, , originalApi] = args;

  const newApi = getNamespacedApi(
    namespace,
    originalApi as WithNames<StoreApi<State>>
  );

  return [newApi.setState, newApi.getState, newApi];
}

export function getPrefixedObject<
  T extends string,
  O extends object,
  S extends string
>(typePrefix: T, obj: O | undefined, separator: S) {
  if (!obj) return undefined as unknown as PrefixObject<T, O, S>;
  return Object.entries(obj).reduce((acc, [key, value]) => {
    return {
      ...acc,
      [`${typePrefix}${separator}${key}`]: value,
    };
  }, {} as PrefixObject<T, O, S>);
}

export function getUnprefixedObject<
  T extends string,
  Data extends object,
  S extends string
>(typePrefix: T, obj: Data | undefined, separator: S) {
  if (!obj) return undefined as unknown as FilterByPrefix<T, Data, S>;
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (key.startsWith(`${typePrefix}${separator}`)) {
      return {
        ...acc,
        [key.slice(typePrefix.length + 1)]: value,
      };
    }
    return acc;
  }, {} as FilterByPrefix<T, Data, S>);
}

/**
 * This function will take a list of namespaces and a callback and return the spread data from the callback.
 */
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

/**
 * This function will take a callback and return a function that will apply the namespace to the api.
 */
function transformCallback<State extends object>(
  ...args: Parameters<StateCreator<State>>
) {
  return function <N extends string, F extends boolean, S extends string>(
    namespace: Namespace<ToNamespace<State, N, F, S>, N, any, any, F, S>
  ) {
    const originalApi = args[2] as WithNames<StoreApi<State>>;
    const [set, get, api] = transformStateCreatorArgs(namespace, ...args);

    // Add the namespace to the api
    Object.assign(originalApi, {
      namespaces: {
        ...originalApi.namespaces,
        [namespace.name]: api,
      },
    });

    if (namespace.options?.flatten) {
      return getPrefixedObject(
        namespace.name,
        namespace.creator(set, get, api) as any,
        namespace.options?.separator ?? '_'
      );
    } else {
      return {
        [namespace.name]: namespace.creator(set, get, api),
      };
    }
  };
}

export function getNamespaceHooks<
  S extends StoreApi<any> & { namespaces: any },
  Namespaces extends readonly Namespace<any, string, any, any, any, any>[],
  CurrentNamespaces extends readonly Namespace<
    any,
    string,
    any,
    any,
    any,
    any
  >[] = []
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
        any,
        any,
        any
      >
        ? N extends string
          ? N
          : never
        : never]: NewNamespace extends Namespace<
        infer T,
        infer N,
        any,
        any,
        any,
        any
      >
        ? UseBoundNamespace<
            N extends keyof S['namespaces']
              ? S['namespaces'][N] & StoreApi<T>
              : never,
            [...CurrentNamespaces, NewNamespace]
          >
        : never;
    }
  );
}

function getOneNamespaceHook<
  Name extends string,
  Store extends object,
  Namespaces extends readonly Namespace[],
  F extends boolean,
  S extends string
>(
  useStore:
    | UseBoundStore<StoreApi<Store>>
    | UseBoundNamespace<StoreApi<Store>, Namespaces>,
  namespace: Namespace<ToNamespace<Store, Name, F, S>, Name, any, any, F, S>
) {
  type BoundStore = UseBoundNamespace<
    StoreApi<ToNamespace<Store, Name, F, S>>,
    [Namespace<ToNamespace<Store, Name, F, S>, Name>, ...Namespaces]
  >;
  const hook = ((selector) => {
    return useStore((state) => {
      const namespaceState = toNamespace(state, namespace);
      return selector ? selector(namespaceState) : namespaceState;
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
  Namespaces extends readonly Namespace<any, string, any, any, any, any>[]
>(state: State, ...namespaces: Namespaces): NamespacedState<State, Namespaces> {
  let current: any = state;
  for (let i = 0; i < namespaces.length; i++) {
    const namespace = namespaces[i];
    if (namespace.options?.flatten) {
      current = getUnprefixedObject(
        namespace.name,
        current,
        namespace.options?.separator ?? '_'
      );
    } else {
      current = current?.[namespace.name] ?? {};
    }
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
  Namespaces extends readonly Namespace<any, string, any, any, any, any>[]
>(
  state: State,
  ...namespaces: Namespaces
): UnNamespacedState<State, Namespaces> {
  let current: any = state;
  for (let i = namespaces.length - 1; i >= 0; i--) {
    const namespace = namespaces[i];
    if (namespace.options?.flatten) {
      current = getPrefixedObject(
        namespace.name,
        current,
        namespace.options?.separator ?? '_'
      );
    } else {
      current = { [namespace.name]: current };
    }
  }
  return current;
}

export const createNamespace = ((one?: any, two?: any, options?: any) => {
  if (one && two) {
    return {
      name: one,
      creator: two,
      options,
    };
  } else {
    return (name: any, creator: any, options: any) => ({
      name,
      creator,
      options,
    });
  }
}) as CreateNamespace;

/**
 * This is where the fun middleware stuff happens.
 * We override the setState method with a method that will go through its namespaced children. We add
 * a payload to the api object so that the children can access it. Each of the apis that was passed to the namespaced children
 * will have will have their setState method apply its state to the payload. If a child has a payload, we skip it because
 * its payload has already been applied. We then apply the payload to the state and call the original setState method. This
 * works with nested namespaces as well. This has the benefit of the state only being updated ONCE.
 */
function getRootApi<Store extends object>(
  api: WithNames<StoreApi<Store>>
): WithNames<StoreApi<Store>> {
  const originalSet = api.setState;
  const setState: StoreApi<Store>['setState'] = (state, replace) => {
    api._payload = {};

    const currentState = api.getState();

    let newState = typeof state === 'function' ? state(currentState) : state;

    newState = { ...newState };

    /**
     * This function will go through all the namespaces and apply their state to the payload.
     * It will then remove the keys from the newState that were applied to the payload.
     * @param newState The new state
     * @param namespaces The namespaces to apply the state to
     */
    function callSetOnNamespaces(
      newState: any,
      namespaces: Record<string, WithNames<StoreApi<any>>>
    ) {
      for (const name in namespaces) {
        // break if there are not more keys to apply
        if (Object.keys(newState).length === 0) break;
        const namespaceApi = namespaces[name];
        // Skip if the namespace has already been applied
        if (namespaceApi._payload) continue;

        // Get the state to apply to the namespace
        const namespaceState = toNamespace(
          newState,
          ...(namespaceApi?.namespacePath ?? [])
        );
        // if there are no keys to call setState with, continue
        if (Object.keys(namespaceState).length === 0) continue;
        namespaceApi.setState(namespaceState);

        // Get the keys that were applied to the namespace
        const originalState = fromNamespace(
          namespaceState,
          ...(namespaceApi.namespacePath ?? [])
        );

        // remove the keys that were applied to the namespace
        for (const key in originalState) {
          delete newState[key];
        }
      }
    }

    // Build the payload from the namespaces
    callSetOnNamespaces(newState, api.namespaces);

    const payload = api._payload;

    originalSet(
      {
        ...newState,
        ...payload,
      },
      replace as any
    );
    delete api._payload;
  };

  return Object.assign(api, {
    setState,
  });
}

export const namespaced = ((one?: any, two?: any) => {
  if (!two) {
    const { namespaces } = one;
    return (
      _: StoreApi<any>['setState'],
      __: StoreApi<any>['getState'],
      api: StoreApi<any>
    ) => {
      const apiWithNamespaces = Object.assign(api, {
        namespaces: {},
      });

      const rootApi = getRootApi(apiWithNamespaces);

      const data = {
        ...spreadNamespaces(
          namespaces,
          transformCallback(rootApi.setState, rootApi.getState, rootApi)
        ),
      };
      return data;
    };
  } else {
    const callback = one as (state: any) => StateCreator<any>;
    const { namespaces } = two as {
      namespaces: Namespace<any, string, any, any>[];
    };
    return (
      _: StoreApi<any>['setState'],
      __: StoreApi<any>['getState'],
      api: StoreApi<any>
    ) => {
      const apiWithNamespaces = Object.assign(api, {
        namespaces: {},
      });

      const rootApi = getRootApi(apiWithNamespaces);
      return {
        ...callback(
          spreadNamespaces(
            namespaces,
            transformCallback(rootApi.setState, rootApi.getState, rootApi)
          )
        )(rootApi.setState, rootApi.getState, rootApi),
      };
    };
  }
}) as Namespaced;
