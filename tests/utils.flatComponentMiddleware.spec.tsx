import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { temporal } from 'zundo';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { ExtractNamespace } from '../src/types';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';
import { immer } from 'zustand/middleware/immer';

function createStorage() {
  const storage: { [key: string]: string } = {};

  const storageImplementation: StateStorage = {
    getItem: (name) => {
      return storage[name];
    },
    setItem: (name, value) => {
      storage[name] = value;
    },
    removeItem: (name) => {
      delete storage[name];
    },
  };

  return {
    storage,
    storageImplementation,
  };
}

// Clean up after each test
afterEach(cleanup);

describe('Zustand Namespace Stores', () => {
  const storage: { [key: string]: string } = {};

  const storageImplementation: StateStorage = {
    getItem: (name) => {
      return storage[name];
    },
    setItem: (name, value) => {
      storage[name] = value;
    },
    removeItem: (name) => {
      delete storage[name];
    },
  };

  const sn = createNamespace<{ data: string }>()(
    'subNamespace',
    temporal(
      persist(
        () => ({
          data: 'hi',
        }),
        {
          name: 'subNamespace',
          storage: createJSONStorage(() => storageImplementation),
        }
      )
    ),
    {
      flatten: true,
    }
  );

  const n1 = createNamespace<{
    data: string;
    subNamespace_data: string;
    updateData: (data: string) => void;
  }>()(
    'namespace1',
    namespaced(
      (state) =>
        temporal((set) => ({
          data: 'hi',
          updateData: (data) => set({ data }),
          ...state,
        })),
      {
        namespaces: [sn],
      }
    ),
    {
      flatten: true,
    }
  );

  const n2 = createNamespace<{
    data: string;
  }>()(
    'namespace2',
    persist(
      () => ({
        data: 'hi',
      }),
      {
        name: 'namespace2',
        storage: createJSONStorage(() => storageImplementation),
      }
    ),
    {
      flatten: true,
    }
  );

  const useStore = create(
    namespaced((state) => () => ({ foo: 'hi', ...state }), {
      namespaces: [n1, n2],
    })
  );

  const { namespace1: useNamespace1, namespace2: useNamespace2 } =
    getNamespaceHooks(useStore, n1, n2);
  const { subNamespace: useSubNamespace } = getNamespaceHooks(
    useNamespace1,
    sn
  );

  const Namespace1Component = () => {
    const data = useNamespace1((state) => state.data);
    return (
      <div>
        <p data-testid="namespace1-data">{data}</p>
      </div>
    );
  };

  const Namespace2Component = () => {
    const data = useNamespace2((state) => state.data);
    return (
      <div>
        <p data-testid="namespace2-data">{data}</p>
      </div>
    );
  };

  const SubNamespaceComponent = () => {
    const data = useSubNamespace((state) => state.data);
    return (
      <div>
        <p data-testid="subNamespace-data">{data}</p>
      </div>
    );
  };

  const App = () => {
    return (
      <div>
        <Namespace1Component />
        <Namespace2Component />
        <SubNamespaceComponent />
      </div>
    );
  };

  test('should have namespace1 methoßds in useStore', () => {
    Object.keys(useStore).forEach((key) => {
      if (key === 'namespaces') return;
      expect(key in useNamespace1).toBeTruthy();
    });
  });
  const resetStore = () => {
    act(() => {
      useStore.setState({
        namespace1_data: 'Initial Namespace1 Data',
        namespace1_subNamespace_data: 'Initial SubNamespace Data',
        namespace2_data: 'Initial Namespace2 Data',
      });
      useStore.namespaces.namespace1.temporal.getState().clear();
      useStore.namespaces.namespace2.persist.clearStorage();
      useStore.namespaces.namespace1.namespaces.subNamespace.temporal
        .getState()
        .clear();
      useStore.namespaces.namespace1.namespaces.subNamespace.persist.clearStorage();
    });
  };
  beforeEach(resetStore);

  test('should render initial data for namespaces', () => {
    render(<App />);
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    expect(screen.getByTestId('subNamespace-data')).toHaveTextContent(
      'Initial SubNamespace Data'
    );
  });

  test('should be able to undo and redo changes of namespace1', () => {
    render(<App />);
    act(() => {
      useNamespace1.setState({ data: 'New Namespace1 Data' });
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'New Namespace1 Data'
    );
    act(() => {
      useStore.namespaces.namespace1.temporal.getState().undo();
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
  });

  test('should be able to persist changes of namespace2', () => {
    render(<App />);
    act(() => {
      useNamespace2.setState({ data: 'New Namespace2 Data' });
    });
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'New Namespace2 Data'
    );
    expect(JSON.parse(storage['namespace2'])).toEqual({
      state: { data: 'New Namespace2 Data' },
      version: 0,
    });
    act(() => {
      useStore.namespaces.namespace2.persist.clearStorage();
    });
    expect(storage['namespace2']).toBeUndefined();
  });

  test('should be able to undo and redo changes of subNamespace', () => {
    render(<App />);
    act(() => {
      useSubNamespace.setState({ data: 'New SubNamespace Data' });
    });
    expect(screen.getByTestId('subNamespace-data')).toHaveTextContent(
      'New SubNamespace Data'
    );
    act(() => {
      useStore.namespaces.namespace1.namespaces.subNamespace.temporal
        .getState()
        .undo();
    });
    expect(screen.getByTestId('subNamespace-data')).toHaveTextContent(
      'Initial SubNamespace Data'
    );
  });

  test('should be able to persist changes of subNamespace', () => {
    render(<App />);
    act(() => {
      useSubNamespace.setState({ data: 'New SubNamespace Data' });
    });
    expect(screen.getByTestId('subNamespace-data')).toHaveTextContent(
      'New SubNamespace Data'
    );
    expect(JSON.parse(storage['subNamespace'])).toEqual({
      state: { data: 'New SubNamespace Data' },
      version: 0,
    });
    act(() => {
      useStore.namespaces.namespace1.namespaces.subNamespace.persist.clearStorage();
    });
    expect(storage['subNamespace']).toBeUndefined();
  });

  test('should be able to call nested middleware methods', () => {
    render(<App />);

    act(() => {
      useSubNamespace.setState({ data: 'New SubNamespace Data' });
    });
    expect(screen.getByTestId('subNamespace-data')).toHaveTextContent(
      'New SubNamespace Data'
    );
    act(() => {
      useSubNamespace.temporal.getState().undo();
    });

    expect(screen.getByTestId('subNamespace-data')).toHaveTextContent(
      'Initial SubNamespace Data'
    );
  });

  test('should be able to update data from namespace1 from root store and undo it from namespace1', () => {
    render(<App />);
    act(() => {
      useStore.setState({ namespace1_data: 'New Namespace1 Data' });
    });

    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'New Namespace1 Data'
    );
    act(() => {
      useStore.namespaces.namespace1.temporal.getState().undo();
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
  });

  test('should be able to undo state that was set within a creator method in namespace 1', () => {
    render(<App />);

    act(() => {
      useNamespace1.getState().updateData('New Namespace1 Data');
    });

    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'New Namespace1 Data'
    );

    act(() => {
      useStore.namespaces.namespace1.temporal.getState().undo();
    });

    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
  });

  test('should be able to store data with persist and create a new store with that same data if it uses the same name', () => {
    const namespace = createNamespace<{
      data: string;
    }>()(
      'namespace',
      persist(
        () => ({
          data: 'hi',
        }),
        {
          name: 'namespace',
          storage: createJSONStorage(() => storageImplementation),
        }
      ),
      {
        flatten: true,
      }
    );
    let store = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    let { namespace: useNamespace } = getNamespaceHooks(store, namespace);

    // set data in namespace
    act(() => {
      useNamespace.setState({ data: 'New Namespace Data' });
    });

    // check t omake sure the data is set in storage
    expect(JSON.parse(storage['namespace'])).toEqual({
      state: { data: 'New Namespace Data' },
      version: 0,
    });
    // create a new store with the same namespace name
    store = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    // check to make sure the data is still there
    expect(JSON.parse(storage['namespace'])).toEqual({
      state: { data: 'New Namespace Data' },
      version: 0,
    });

    // get the hook for the new store
    ({ namespace: useNamespace } = getNamespaceHooks(store, namespace));

    // check to make sure the data is still there
    expect(useNamespace.getState().data).toBe('New Namespace Data');
  });
});

describe('nested: Zustand Namespaces', () => {
  test('nested: should be able to store data with persist and create a new store with that same data if it uses the same name', () => {
    const { storage, storageImplementation } = createStorage();
    const namespace = createNamespace<{
      data: string;
    }>()(
      'nested',
      persist(
        () => ({
          data: 'hi',
        }),
        {
          name: 'nested',
          storage: createJSONStorage(() => storageImplementation),
        }
      ),
      {
        flatten: true,
      }
    );
    let store = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    let { nested: useNamespace } = getNamespaceHooks(store, namespace);

    // set data in namespace
    act(() => {
      store.setState({ nested_data: 'New Namespace Data' });
    });

    // check t omake sure the data is set in storage
    expect(JSON.parse(storage['nested'])).toEqual({
      state: { data: 'New Namespace Data' },
      version: 0,
    });

    // create a new store with the same namespace name
    store = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    // check to make sure the data is still there
    expect(JSON.parse(storage['nested'])).toEqual({
      state: { data: 'New Namespace Data' },
      version: 0,
    });

    // get the hook for the new store
    ({ nested: useNamespace } = getNamespaceHooks(store, namespace));

    // check to make sure the data is still there
    expect(useNamespace.getState().data).toBe('New Namespace Data');
  });

  test('zundo whould work on nested stores', () => {
    const subNamespace = createNamespace(
      'subNamespace',
      () => ({
        data: 'hi',
      }),
      {
        flatten: true,
      }
    );

    const namespace = createNamespace(
      'namespace',
      namespaced(
        (state) =>
          temporal(() => ({
            ...state,
            data: 'hi',
          })),
        {
          namespaces: [subNamespace],
        }
      ),
      {
        flatten: true,
      }
    );
    const store = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    const { namespace: useNamespace } = getNamespaceHooks(store, namespace);
    const { subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace,
      subNamespace
    );

    // set data in namespace
    act(() => {
      useSubNamespace.setState({ data: 'New SubNamespace Data' });
    });

    expect(useSubNamespace.getState().data).toBe('New SubNamespace Data');

    useNamespace.temporal.getState().undo();
    expect(useSubNamespace.getState().data).toBe('hi');
  });

  test('zundo whould work on nested stores with persist', () => {
    vi.stubGlobal('location', {
      _hash: '', // Internal storage for hash value
      get hash() {
        return this._hash;
      },
      set hash(value) {
        this._hash = value.startsWith('#') ? value : `#${value}`;
      },
    });
    const hashStorage: StateStorage = {
      getItem: (key): string => {
        const searchParams = new URLSearchParams(location.hash.slice(1));
        const storedValue = searchParams.get(key) ?? '';
        return JSON.parse(storedValue);
      },
      setItem: (key, newValue): void => {
        const searchParams = new URLSearchParams(location.hash.slice(1));
        searchParams.set(key, JSON.stringify(newValue));
        location.hash = searchParams.toString();
      },
      removeItem: (key): void => {
        const searchParams = new URLSearchParams(location.hash.slice(1));
        searchParams.delete(key);
        location.hash = searchParams.toString();
      },
    };

    const subNamespace = createNamespace(
      'subNamespace',
      () => ({
        data: 'hi',
      }),
      {
        flatten: true,
      }
    );

    const namespace = createNamespace(
      'namespace',
      namespaced(
        (state) =>
          persist(
            () => ({
              ...state,
              data: 'hi',
            }),
            {
              name: 'namespace',
              storage: createJSONStorage(() => hashStorage),
            }
          ),
        {
          namespaces: [subNamespace],
        }
      ),
      {
        flatten: true,
      }
    );

    let useStore = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    let { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
    let { subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace,
      subNamespace
    );

    act(() => {
      useStore.setState({
        namespace_subNamespace_data: 'New SubNamespace Data',
      });
    });

    expect(useSubNamespace.getState().data).toBe('New SubNamespace Data');

    useStore = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    ({ namespace: useNamespace } = getNamespaceHooks(useStore, namespace));
    ({ subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace,
      subNamespace
    ));

    expect(useSubNamespace.getState().data).toBe('New SubNamespace Data');
  });
});

describe('Zustand test', () => {
  test('should be able to persist a store', () => {
    const { storage, storageImplementation } = createStorage();

    storage['persist'] = JSON.stringify({
      state: {
        count: 1,
      },
      version: 0,
    });

    const store = create(
      persist(
        () => ({
          count: 0,
          test: 'hi',
        }),
        {
          name: 'persist',
          storage: createJSONStorage(() => storageImplementation),
          partialize: (state) => ({
            count: state.count,
          }),
        }
      )
    );

    expect(store.getState().count).toBe(1);
    expect(store.getState().test).toBe('hi');
  });
});

describe('complex persist', () => {
  /**
   * This is a current limitation (that idk how to solve) of the persist middleware. There are workarounds because we can persist namespaces in parallel
   * rather than in series. This is a limitation of the way persist works.
   */
  test(
    'series persist should fail',
    {
      fails: true,
    },
    () => {
      const { storage, storageImplementation } = createStorage();
      const subNamespace = createNamespace(
        'subNamespace',
        () => ({
          count: 0,
        }),
        {
          flatten: true,
        }
      );

      const subNamespace2 = createNamespace(
        'subNamespace2',
        persist(
          () => ({
            foo: 'bar',
          }),
          {
            name: 'subNamespace2',
            storage: createJSONStorage(() => storageImplementation),
          }
        ),
        {
          flatten: true,
        }
      );

      const namespace = createNamespace(
        'namespace',
        namespaced(
          (state) =>
            persist(
              () => ({
                ...state,
                byStander: 'hi',
              }),
              {
                name: 'namespace',
                storage: createJSONStorage(() => storageImplementation),
                partialize: (state) => ({
                  subNamespace_count: state.subNamespace_count,
                }),
              }
            ),
          {
            namespaces: [subNamespace, subNamespace2],
          }
        ),
        {
          flatten: true,
        }
      );

      type AppState = ExtractNamespace<typeof namespace>;

      storage['namespace'] = JSON.stringify({
        state: {
          subNamespace_count: 1,
        },
        version: 0,
      });

      storage['subNamespace2'] = JSON.stringify({
        state: {
          foo: 'bar',
        },
        version: 0,
      });

      const useStore = create<AppState>()(
        namespaced(
          (state) => () => ({
            ...state,
          }),
          {
            namespaces: [namespace],
          }
        )
      );

      expect(useStore.getState().namespace_subNamespace_count).toBe(1);
      expect(useStore.getState().namespace_byStander).toBe('hi');
    }
  );

  test('parallel persist', () => {
    const { storage, storageImplementation } = createStorage();
    const subNamespace = createNamespace(
      'subNamespace',
      persist(
        () => ({
          count: 0,
          count2: 0,
        }),
        {
          name: 'subNamespace',
          storage: createJSONStorage(() => storageImplementation),
          partialize: (state) => ({
            count: state.count,
          }),
        }
      ),
      {
        flatten: true,
      }
    );

    const subNamespace2 = createNamespace(
      'subNamespace2',
      persist(
        () => ({
          foo: 'bar',
          bar: 'foo',
        }),
        {
          name: 'subNamespace2',
          storage: createJSONStorage(() => storageImplementation),
          partialize: (state) => ({
            foo: state.foo,
          }),
        }
      ),
      {
        flatten: true,
      }
    );

    const namespace = createNamespace(
      'namespace',
      namespaced(
        (state) => () => ({
          ...state,
          byStander: 'hi',
        }),
        {
          namespaces: [subNamespace, subNamespace2],
        }
      ),
      {
        flatten: true,
      }
    );

    type AppState = ExtractNamespace<typeof namespace>;

    storage['subNamespace'] = JSON.stringify({
      state: {
        count: 1,
      },
      version: 0,
    });

    storage['subNamespace2'] = JSON.stringify({
      state: {
        foo: 'bar',
      },
      version: 0,
    });

    const useStore = create<AppState>()(
      namespaced(
        (state) => () => ({
          ...state,
        }),
        {
          namespaces: [namespace],
        }
      )
    );

    expect(useStore.getState().namespace_subNamespace_count).toBe(1);
    expect(useStore.getState().namespace_subNamespace_count2).toBe(0);
    expect(useStore.getState().namespace_subNamespace2_foo).toBe('bar');
    expect(useStore.getState().namespace_subNamespace2_bar).toBe('foo');
    expect(useStore.getState().namespace_byStander).toBe('hi');

    const { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
    const { subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace,
      subNamespace
    );

    expect(useSubNamespace.getState().count).toBe(1);

    // set data in namespace
    act(() => {
      useSubNamespace.setState({ count: 2 });
    });

    expect(useSubNamespace.getState().count).toBe(2);
    expect(useNamespace.getState().byStander).toBe('hi');
  });
});

describe('immer', () => {
  test('should be able to use immer with zustand', () => {
    type NamespaceState = {
      count: number;
      increment: () => void;
    };
    const namespace = createNamespace<NamespaceState>()(
      'namespace',
      immer((set) => ({
        count: 0,
        increment: () =>
          set((state) => {
            state.count += 1;
          }),
      })),
      {
        flatten: true,
      }
    );

    const useStore = create(
      namespaced((state) => () => ({ ...state }), {
        namespaces: [namespace],
      })
    );
    const { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
    expect(useNamespace.getState().count).toBe(0);
    act(() => {
      useNamespace.getState().increment();
    });
    expect(useNamespace.getState().count).toBe(1);
    act(() => {
      useStore.getState().namespace_increment();
    });
    expect(useNamespace.getState().count).toBe(2);
  });

  test('should be able to use immer if its on root store', () => {
    type NamespaceState = {
      count: number;
      increment: () => void;
    };
    const namespace = createNamespace<NamespaceState>()(
      'namespace',
      immer((set) => ({
        count: 0,
        increment: () =>
          set((state) => {
            state.count += 1;
          }),
      })),
      {
        flatten: true,
      }
    );

    type RootState = ExtractNamespace<typeof namespace> & {
      increment: () => void;
    };

    const useStore = create<RootState>()(
      immer(
        namespaced(
          (state) => (set) => ({
            ...state,
            increment: () =>
              set((state) => {
                state.namespace_count += 1;
              }),
          }),
          { namespaces: [namespace] }
        )
      )
    );
    const { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
    expect(useNamespace.getState().count).toBe(0);
    act(() => {
      useNamespace.getState().increment();
    });
    expect(useNamespace.getState().count).toBe(1);
    act(() => {
      useStore.getState().namespace_increment();
    });

    expect(useNamespace.getState().count).toBe(2);
    act(() => {
      useStore.getState().increment();
    });
    expect(useNamespace.getState().count).toBe(3);
    expect(useStore.getState().namespace_count).toBe(3);
  });
});
