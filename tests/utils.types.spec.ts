import type { TypeEqual } from 'ts-expect';
import { expectType } from 'ts-expect';
import { describe, expect, test } from 'vitest';

import { temporal, TemporalState } from 'zundo';
import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { combine, devtools, persist } from 'zustand/middleware';
import {
  ExtractNamespace,
  FilterByPrefix,
  ToNamespace,
  UseBoundNamespace,
} from '../src/types';
import {
  createNamespace,
  fromNamespace,
  getNamespaceHooks,
  namespaced,
  toNamespace,
  transformStateCreatorArgs,
} from '../src/utils';
import { immer } from 'zustand/middleware/immer';

type State = {
  user: {
    name: string;
    age: number;
  };
  admin: {
    level: number;
  };
};

describe('transformStateCreatorArgs', () => {
  test('should transform state creator arguments', () => {
    const mockNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));
    const originalArgs: Parameters<StateCreator<State>> = [
      () => {},
      () => ({} as State),
      {} as StoreApi<State>,
    ];

    const transformedArgs = transformStateCreatorArgs(
      mockNamespace,
      ...originalArgs
    );

    expect(transformedArgs).toBeDefined();
    expectType<
      TypeEqual<
        typeof transformedArgs,
        Parameters<typeof mockNamespace.creator>
      >
    >(true);
  });
});

describe('namespace', () => {
  test('should create a state creator with namespaces', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const adminNamespace = createNamespace('admin', () => ({
      level: 1,
    }));

    const combinedCreator = create(
      namespaced({ namespaces: [userNamespace, adminNamespace] })
    );

    expectType<StateCreator<State>>(combinedCreator);
  });

  test('the set method inside divide s hould be of type SetState', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const adminNamespace = createNamespace('admin', () => ({
      level: 1,
    }));
    create(
      namespaced(
        (state) => (set) => {
          expectType<StoreApi<State>['setState']>(set);
          return state;
        },
        { namespaces: [userNamespace, adminNamespace] }
      )
    );
  });

  test('should infer the divide type', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const adminNamespace = createNamespace('admin', () => ({
      level: 1,
    }));

    const useStore = create(
      namespaced({ namespaces: [userNamespace, adminNamespace] })
    );

    expectType<UseBoundStore<StoreApi<State>>>(useStore);
  });
});

describe('namespaceHook', () => {
  test('should create a namespace hook', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const useStore = create<State>()(
      namespaced(
        (state) => () => ({
          admin: {
            level: 1,
          },
          ...state,
        }),
        { namespaces: [userNamespace] }
      )
    );

    const { user: hook } = getNamespaceHooks(useStore, userNamespace);

    expect(hook).toBeDefined();
    expectType<
      UseBoundNamespace<StoreApi<FilterByPrefix<'user', State, '_'>>, any>
    >(hook);
  });
});

describe('namespaceHooks', () => {
  test('should create multiple namespace hooks', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const adminNamespace = createNamespace('admin', () => ({
      level: 1,
    }));

    const useStore = create<State>()(
      namespaced(
        (state) => () => ({
          ...state,
        }),
        { namespaces: [userNamespace, adminNamespace] }
      )
    );

    const { user: useUser, admin: useAdmin } = getNamespaceHooks(
      useStore,
      userNamespace,
      adminNamespace
    );

    expect(useUser).toBeDefined();
    expect(useAdmin).toBeDefined();

    expectType<
      UseBoundNamespace<StoreApi<FilterByPrefix<'user', State, '_'>>, any>
    >(useUser);
    expectType<
      UseBoundNamespace<StoreApi<FilterByPrefix<'admin', State, '_'>>, any>
    >(useAdmin);
  });
});

describe('stateToNamespace', () => {
  test('should extract namespace from state', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const state: State = {
      user: {
        name: 'Alice',
        age: 25,
      },
      admin: {
        level: 1,
      },
    };

    const namespace = toNamespace(state, userNamespace);

    expect(namespace).toEqual({
      name: 'Alice',
      age: 25,
    });

    expectType<{ name: string; age: number }>(namespace);
  });
  test('should extract namespace from state if namespace is nested', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const state = {
      user: {
        name: 'Alice',
        age: 25,
      },
      admin: {
        level: 1,
      },
    };

    const namespace = toNamespace(state, userNamespace);

    expect(namespace).toEqual({
      name: 'Alice',
      age: 25,
    });

    expectType<{ name: string; age: number }>(namespace);
  });
});

describe('namespaceToState', () => {
  test('should add prefix to namespace state', () => {
    const subNamespace = createNamespace('admin', () => ({
      level: 1,
    }));
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const state = { name: 'Alice', age: 25 };

    const namespacedState = fromNamespace(state, userNamespace);

    expect(namespacedState).toEqual({
      user: {
        name: 'Alice',
        age: 25,
      },
    });

    const deepNamespacedState = fromNamespace(
      state,
      userNamespace,
      subNamespace
    );

    expect(deepNamespacedState).toEqual({
      user: {
        admin: {
          name: 'Alice',
          age: 25,
        },
      },
    });

    expectType<{ user: { name: string; age: number } }>(namespacedState);
  });

  test('should add prefix to namespace state if namespace is nested', () => {
    const userNamespace = createNamespace('user', () => ({
      name: 'Alice',
      age: 25,
    }));

    const state = { name: 'Alice', age: 25 };

    const namespacedState = fromNamespace(state, userNamespace);

    expect(namespacedState).toEqual({
      user: {
        name: 'Alice',
        age: 25,
      },
    });

    expectType<{
      user: { name: string; age: number };
    }>(namespacedState);
  });
});

describe('createNamespace', () => {
  test('should create a namespace definition', () => {
    const testNamespace = createNamespace<{ key: string }>()('test', () => ({
      key: 'value',
    }));

    expect(testNamespace).toBeDefined();
    expect(testNamespace.name).toBe('test');
    expect(testNamespace.creator).toBeDefined();
  });

  test('should create have typed raw state', () => {
    const subNamespace = createNamespace('subNamespace', () => ({
      key: 'value',
    }));
    const namespace = createNamespace(
      'namespace',
      namespaced((state) => () => ({ key: 'value', ...state }), {
        namespaces: [subNamespace],
      })
    );

    const useStore = create(
      namespaced(
        (state) => () => ({
          key: 'value',
          ...state,
        }),
        { namespaces: [namespace] }
      )
    );

    const { namespace: useNamespaceStore } = getNamespaceHooks(
      useStore,
      namespace
    );
    const { subNamespace: useSubNamespaceStore } = getNamespaceHooks(
      useNamespaceStore,
      subNamespace
    );
    expectType<string>(useNamespaceStore.getRawState().namespace.key);
    expectType<string>(
      useNamespaceStore.getRawState().namespace.subNamespace.key
    );
    expectType<string>(
      useSubNamespaceStore.getRawState().namespace.subNamespace.key
    );
  });

  test('should create a store with typed api of namespaces', () => {
    const subNamespace = createNamespace(
      'subNamespace',
      temporal(() => ({
        key: 'value',
      }))
    );
    const namespace = createNamespace(
      'namespace',
      namespaced(
        (state) =>
          persist(() => ({ key: 'value', ...state }), {
            name: 'namespace',
          }),
        {
          namespaces: [subNamespace],
        }
      )
    );

    type State = ExtractNamespace<typeof namespace>;

    // Create zustand store
    const useStore = create(namespaced({ namespaces: [namespace] }));

    const { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
    const { subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace,
      subNamespace
    );

    expectType<
      StoreApi<ToNamespace<State, 'namespace', false, '_'>> & {
        namespaces: {
          subNamespace: StoreApi<
            ToNamespace<
              ToNamespace<State, 'namespace', false, '_'>,
              'subNamespace',
              false,
              '_'
            >
          >;
        };
        persist: {
          getOptions: any;
          setOptions: any;
          // ... probably not worth testing all the methods
        };
      }
    >(useStore.namespaces.namespace);
    expectType<
      StoreApi<
        ToNamespace<
          ToNamespace<State, 'namespace', false, '_'>,
          'subNamespace',
          false,
          '_'
        >
      > & {
        temporal: StoreApi<
          TemporalState<
            ToNamespace<
              ToNamespace<State, 'namespace', false, '_'>,
              'subNamespace',
              false,
              '_'
            >
          >
        >;
      }
    >(useStore.namespaces.namespace.namespaces.subNamespace);

    expectType<
      UseBoundNamespace<
        StoreApi<ToNamespace<State, 'namespace', false, '_'>>,
        [typeof namespace]
      >
    >(useNamespace);

    expectType<
      UseBoundNamespace<
        StoreApi<
          ToNamespace<
            ToNamespace<State, 'namespace', false, '_'>,
            'subNamespace',
            false,
            '_'
          >
        >,
        [typeof namespace, typeof subNamespace]
      >
    >(useSubNamespace);
  });

  test('should allow nested stuff', () => {
    interface ExampleState {
      title: string;
      subtitle: string | undefined;
    }

    interface ExampleActions {
      setHeaderTitle: (title: string) => void;
      setHeaderSubtitle: (subtitle: string) => void;
    }

    const initialState: ExampleState = {
      title: '',
      subtitle: undefined,
    };

    const createExampleSlice = createNamespace<ExampleState & ExampleActions>()(
      'exampleSlice',
      devtools(
        immer(
          combine(
            initialState, // initial state
            (set) => ({
              setHeaderTitle: (title: string) =>
                set(
                  (state) => {
                    state.title = title;
                  },
                  undefined,
                  'Set header title'
                ),
              setHeaderSubtitle: (subtitle: string) =>
                set(
                  (state) => {
                    state.subtitle = subtitle;
                  },
                  undefined,
                  'Set header title'
                ),
            })
          )
        ),
        {
          storeName: 'exampleSlice',
        }
      )
    );

    create(
      namespaced(
        (namespacedState) => () => ({
          ...namespacedState,
        }),
        {
          namespaces: [createExampleSlice],
        }
      )
    );
  });
});
