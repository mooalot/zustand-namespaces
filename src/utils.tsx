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
      /**
       * If the payload exists for a namespace, we are in the process of setting the state.
       * We return the payload so that if any middleware uses getState during the setState call, it will get the correct state.
       * if its initializing and there is no data, return undefined
       */
      const payload = api._payloadByNamespace?.[namespace.name];
      if (payload) return payload;
      else {
        const data = toNamespace(api.getState(), namespace);
        if (
          api._initializing &&
          !!data &&
          Object.keys(data as any).length === 0
        ) {
          return undefined;
        } else {
          return data;
        }
      }
    },
    setState: (state, replace) => {
      namespacedApi._traversed = true; //payload isnt used, but stops namespaces from being traveresd too many times
      /**
       * Log is used for testing purposes. Specifically to test that the setState method is only called once per setState call.
       */
      console.debug(`test: setState_${namespace.name}`);
      const apiCurrentState = api.getState();
      const currentState = toNamespace(apiCurrentState, namespace);
      const updatedState =
        typeof state === 'function' ? (state as any)(currentState) : state;

      if (api._payloadByNamespace) {
        api._payloadByNamespace = {
          ...api._payloadByNamespace,
          [namespace.name]: {
            ...api._payloadByNamespace[namespace.name],
            ...updatedState,
          },
        };
      } else {
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

        if (replace) {
          const replaceState = { ...apiCurrentState };

          if (namespace.options?.flatten) {
            const specificToNamespace = getPrefixedObject(
              namespace.name,
              currentState as any,
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
      delete namespacedApi._traversed;
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
>(typePrefix: T, obj: O | undefined, separator: S): PrefixObject<T, O, S> {
  if (!obj || typeof obj !== 'object') return obj as any;

  const prefix = typePrefix + separator;

  const result = {} as any;
  for (const key of Object.keys(obj)) {
    result[prefix + key] = (obj as any)[key];
  }
  return result;
}

export function getUnprefixedObject<
  T extends string,
  Data extends object,
  S extends string
>(
  typePrefix: T,
  obj: Data | undefined,
  separator: S
): FilterByPrefix<T, Data, S> {
  if (!obj || typeof obj !== 'object') return obj as any;

  const result: any = {};
  const prefix = typePrefix + separator;
  const prefixLength = prefix.length;

  for (const key of Object.keys(obj)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefixLength)] = (obj as any)[key];
    }
  }
  return result;
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

/**
 * @deprecated This function is deprecated and will be removed in the next major version. Create your own hooks using zustand's useStore methods on namespace apis'.
 */
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
      if (namespace.options?.flatten) {
        const namespacedPrefix =
          namespace.name + (namespace.options?.separator ?? '_');
        const proxyState = new Proxy(state, {
          get(target, prop) {
            const key = String(prop) as keyof Store & string;
            return target[(namespacedPrefix + key) as keyof Store];
          },
          set(target, prop, value) {
            const key = String(prop) as keyof Store & string;
            target[(namespacedPrefix + key) as keyof Store] = value;
            return true;
          },
        });
        return selector ? selector(proxyState as any) : proxyState;
      } else {
        const namespaceState = toNamespace(state, namespace);
        return selector ? selector(namespaceState) : namespaceState;
      }
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

  for (const namespace of namespaces) {
    const options = namespace.options;
    if (options && options.flatten) {
      current = getUnprefixedObject(
        namespace.name,
        current,
        options.separator || '_'
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

  for (const namespace of [...namespaces].reverse()) {
    const options = namespace.options;
    current =
      options && options.flatten
        ? getPrefixedObject(namespace.name, current, options.separator || '_')
        : { [namespace.name]: current };
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

// function namespacePathToString(api: WithNames<StoreApi<any>>) {
//   return api.namespacePath?.map((n) => n.name).join('/') ?? 'Root';
// }

/**
 * This is where the fun middleware stuff happens.
 * We override the setState method with a method that will go through its namespaced children. We add
 * a payload to the api object so that the children can access it. Each of the apis that was passed to the namespaced children
 * will have will have their setState method apply its state to the payload. If a child has been traversed, we skip it because
 * its payload has already been applied. We then apply the payload to the state and call the original setState method. This
 * works with nested namespaces as well. This has the benefit of the state only being updated ONCE.
 */
function getRootApi<Store extends object>(
  api: WithNames<StoreApi<Store>>
): WithNames<StoreApi<Store>> {
  const originalSet = api.setState;
  const setState: StoreApi<Store>['setState'] = (state, replace) => {
    const namespaces = api.namespaces as Record<
      string,
      WithNames<StoreApi<any>>
    >;
    api._payloadByNamespace = {};

    const currentState = api.getState();

    let newState: any =
      typeof state === 'function' ? state(currentState) : state;

    newState = { ...newState };

    const payload = {};

    /**
     * This function will go through all the namespaces and apply their state to the payload.
     * It will then remove the keys from the newState that were applied to the payload.
     * @param newState The new state
     * @param namespaces The namespaces to apply the state to
     */
    for (const name in namespaces) {
      const namespaceApi = namespaces[name];
      const nextNamespace = namespaceApi.namespacePath?.slice(-1)?.[0];
      if (!nextNamespace) throw new Error('Namespace not found');
      const currentNamespaceState = toNamespace(currentState, nextNamespace);
      api._payloadByNamespace[name] = currentNamespaceState;
      // break if there are not more keys to apply
      if (Object.keys(newState).length === 0) break;

      // Skip if the namespace has already been applied
      if (namespaceApi._traversed) continue;

      // Get the state to apply to the namespace
      const namespaceState = toNamespace(newState, nextNamespace);

      // if there are no keys to call setState with, continue
      if (Object.keys(namespaceState).length === 0) continue;
      namespaceApi.setState(namespaceState);

      // Get the keys that were applied to the namespace
      const originalState = fromNamespace(namespaceState, nextNamespace);

      // remove the keys that were applied to the namespace
      for (const key in originalState) {
        delete newState[key];
      }

      const namespacePayload = api._payloadByNamespace[name];
      namespacePayload &&
        Object.assign(payload, fromNamespace(namespacePayload, nextNamespace));
    }

    delete api._payloadByNamespace;
    originalSet(Object.assign({}, newState, payload) as any, replace as any);
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
        _initializing: true,
      });

      const rootApi = getRootApi(apiWithNamespaces);

      const data = {
        ...spreadNamespaces(
          namespaces,
          transformCallback(rootApi.setState, rootApi.getState, rootApi)
        ),
      };
      delete rootApi._initializing;
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
        _initializing: true,
      });

      const rootApi = getRootApi(apiWithNamespaces);
      const data = callback(
        spreadNamespaces(
          namespaces,
          transformCallback(rootApi.setState, rootApi.getState, rootApi)
        )
      )(rootApi.setState, rootApi.getState, rootApi);
      delete rootApi._initializing;
      return data;
    };
  }
}) as Namespaced;
