import { expect, test, describe } from 'vitest';
import { expectType } from 'ts-expect';
import type { TypeEqual } from 'ts-expect';

import {
  transformStateCreatorArgs,
  getPrefixedObject,
  getUnprefixedObject,
  namespaced,
  createNamespace,
  toNamespace,
  fromNamespace,
  getNamespaceHooks,
} from '../src/utils';
import { StoreApi, StateCreator, create, UseBoundStore } from 'zustand';
import {
  ExtractNamespace,
  FilterByPrefix,
  Namespace,
  PrefixObject,
  UseBoundNamespace,
} from '../src/types';
import { temporal, TemporalState } from 'zundo';
import { persist } from 'zustand/middleware';

type State = {
  user_name: string;
  user_age: number;
  admin_level: number;
};

type UserNamespace = Namespace<FilterByPrefix<'user', State, '_'>, 'user'>;

type AdminNamespace = Namespace<FilterByPrefix<'admin', State, '_'>, 'admin'>;

describe('transformStateCreatorArgs', () => {
  test('should transform state creator arguments', () => {
    const mockNamespace = createNamespace(
      'user',
      () => ({
        name: 'Alice',
        age: 25,
      }),
      { flatten: true }
    );
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

describe('getPrefixedObject', () => {
  test('should prefix object keys', () => {
    const obj = { name: 'Alice', age: 25 };
    const prefixedObj = getPrefixedObject('user', obj, '_');

    expect(prefixedObj).toEqual({
      user_name: 'Alice',
      user_age: 25,
    });

    expectType<
      TypeEqual<typeof prefixedObj, PrefixObject<'user', typeof obj, '_'>>
    >(true);
  });
});

describe('getUnprefixedObject', () => {
  test('should remove prefix from object keys', () => {
    const obj = { user_name: 'Alice', user_age: 25 };
    const unprefixedObj = getUnprefixedObject('user', obj, '_');

    expect(unprefixedObj).toEqual({
      name: 'Alice',
      age: 25,
    });

    expectType<
      TypeEqual<typeof unprefixedObj, FilterByPrefix<'user', typeof obj, '_'>>
    >(true);
  });
});

describe('namespace', () => {
  test('should create a state creator with namespaces', () => {
    const userNamespace: UserNamespace = {
      name: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const adminNamespace: AdminNamespace = {
      name: 'admin',
      creator: () => ({
        level: 1,
      }),
    };

    const combinedCreator = create(
      namespaced({ namespaces: [userNamespace, adminNamespace] })
    );

    expectType<
      StateCreator<
        FilterByPrefix<'user', State, '_'> & FilterByPrefix<'admin', State, '_'>
      >
    >(combinedCreator);
  });

  test('the set method inside divide s hould be of type SetState', () => {
    const userNamespace: UserNamespace = {
      name: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const adminNamespace: AdminNamespace = {
      name: 'admin',
      creator: () => ({
        level: 1,
      }),
    };

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
    const userNamespace = createNamespace(
      'user',
      () => ({
        name: 'Alice',
        age: 25,
      }),
      { flatten: true }
    );

    const adminNamespace = createNamespace(
      'admin',
      () => ({
        level: 1,
      }),
      { flatten: true }
    );

    const useStore = create(
      namespaced({ namespaces: [userNamespace, adminNamespace] })
    );

    expectType<UseBoundStore<StoreApi<State>>>(useStore);
  });
});

describe('namespaceHook', () => {
  test('should create a namespace hook', () => {
    const userNamespace = createNamespace(
      'user',
      () => ({
        name: 'Alice',
        age: 25,
      }),
      { flatten: true }
    );

    const useStore = create<State>()(
      namespaced(
        (state) => () => ({
          admin_level: 1,
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
    const userNamespace = createNamespace(
      'user',
      () => ({
        name: 'Alice',
        age: 25,
      }),
      { flatten: true }
    );

    const adminNamespace = createNamespace(
      'admin',
      () => ({
        level: 1,
      }),
      { flatten: true }
    );

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
    const userNamespace = createNamespace(
      'user',
      () => ({
        name: 'Alice',
        age: 25,
      }),
      { flatten: true }
    );

    const state: State = {
      user_name: 'Alice',
      user_age: 25,
      admin_level: 1,
    };

    const namespace = toNamespace(state, userNamespace);

    expect(namespace).toEqual({
      name: 'Alice',
      age: 25,
    });

    expectType<FilterByPrefix<'user', State, '_'>>(namespace);
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
      admin: 1,
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
    const subNamespace = createNamespace(
      'admin',
      () => ({
        level: 1,
      }),
      {
        flatten: true,
      }
    );
    const userNamespace = createNamespace(
      'user',
      () => ({
        name: 'Alice',
        age: 25,
      }),
      {
        flatten: true,
      }
    );

    const state = { name: 'Alice', age: 25 };

    const namespacedState = fromNamespace(state, userNamespace);

    expect(namespacedState).toEqual({
      user_name: 'Alice',
      user_age: 25,
    });

    const deepNamespacedState = fromNamespace(
      state,
      userNamespace,
      subNamespace
    );

    expect(deepNamespacedState).toEqual({
      user_admin_name: 'Alice',
      user_admin_age: 25,
    });

    expectType<PrefixObject<'user', typeof state, '_'>>(namespacedState);
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
    const subNamespace = createNamespace(
      'subNamespace',
      () => ({
        key: 'value',
      }),
      {
        flatten: true,
      }
    );
    const namespace = createNamespace(
      'namespace',
      namespaced((state) => () => ({ key: 'value', ...state }), {
        namespaces: [subNamespace],
      }),
      {
        flatten: true,
      }
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
    expectType<string>(useNamespaceStore.getRawState().namespace_key);
    expectType<string>(
      useNamespaceStore.getRawState().namespace_subNamespace_key
    );
    expectType<string>(
      useSubNamespaceStore.getRawState().namespace_subNamespace_key
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
      StoreApi<FilterByPrefix<'namespace', State, '_'>> & {
        namespaces: {
          subNamespace: StoreApi<FilterByPrefix<'subNamespace', State, '_'>>;
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
        FilterByPrefix<
          'subNamespace',
          FilterByPrefix<'namespace', State, '_'>,
          '_'
        >
      > & {
        temporal: StoreApi<
          TemporalState<
            FilterByPrefix<
              'subNamespace',
              FilterByPrefix<'namespace', State, '_'>,
              '_'
            >
          >
        >;
      }
    >(useStore.namespaces.namespace.namespaces.subNamespace);

    expectType<
      UseBoundNamespace<
        StoreApi<FilterByPrefix<'namespace', State, '_'>>,
        [typeof namespace]
      >
    >(useNamespace);

    expectType<
      UseBoundNamespace<
        StoreApi<
          FilterByPrefix<
            'subNamespace',
            FilterByPrefix<'namespace', State, '_'>,
            '_'
          >
        >,
        [typeof namespace, typeof subNamespace]
      >
    >(useSubNamespace);
  });
});
