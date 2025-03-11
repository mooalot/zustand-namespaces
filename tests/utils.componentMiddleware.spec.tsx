import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, test, describe } from 'vitest';
import { temporal } from 'zundo';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { createNamespace, namespaced, getNamespaceHooks } from '../src/utils';
import { ExtractNamespace } from '../src/types';

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

type SubNamespace = {
  data: string;
};

const sn = createNamespace<SubNamespace>()(
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
  )
);

type Namespace1 = ExtractNamespace<typeof sn> & {
  data: string;
  updateData: (data: string) => void;
};

const n1 = createNamespace<Namespace1>()(
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
  )
);

type Namespace2 = {
  data: string;
};

const n2 = createNamespace<Namespace2>()(
  'namespace2',
  persist(
    () => ({
      data: 'hi',
    }),
    {
      name: 'namespace2',
      storage: createJSONStorage(() => storageImplementation),
    }
  )
);

const useStore = create(
  namespaced((state) => () => ({ foo: 'hi', ...state }), {
    namespaces: [n1, n2],
  })
);

const { namespace1: useNamespace1, namespace2: useNamespace2 } =
  getNamespaceHooks(useStore, n1, n2);
const { subNamespace: useSubNamespace } = getNamespaceHooks(useNamespace1, sn);

useNamespace1.getState();

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

// Clean up after each test
afterEach(cleanup);

describe('Zustand Namespace Stores', () => {
  test('should have namespace1 methods in useStore', () => {
    Object.keys(useStore).forEach((key) => {
      if (key === 'namespaces') return;
      expect(key in useNamespace1).toBeTruthy();
    });
  });
});

// Tests
describe('Zustand Namespaces with Components', () => {
  const resetStore = () => {
    act(() => {
      useStore.setState((state) => ({
        namespace1: {
          ...state.namespace1,
          data: 'Initial Namespace1 Data',
          subNamespace: {
            data: 'Initial SubNamespace Data',
          },
        },
        namespace2: {
          ...state.namespace2,
          data: 'Initial Namespace2 Data',
        },
      }));
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
      useStore.setState((state) => ({
        namespace1: {
          ...state.namespace1,
          data: 'New Namespace1 Data',
        },
      }));
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
    const subNamespace = createNamespace('subNamespace', () => ({
      data: 'hi',
    }));
    const namespace = createNamespace(
      'namespace',
      namespaced(
        (state) =>
          persist(
            () => ({
              data: 'hi',
              ...state,
            }),
            {
              name: 'namespace',
              storage: createJSONStorage(() => storageImplementation),
            }
          ),
        {
          namespaces: [subNamespace],
        }
      )
    );
    let store = create(
      namespaced({
        namespaces: [namespace],
      })
    );

    let { namespace: useNamespace } = getNamespaceHooks(store, namespace);
    let { subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace,
      subNamespace
    );

    // set data in namespace
    act(() => {
      store.setState((state) => ({
        namespace: {
          ...state.namespace,
          subNamespace: {
            data: 'New SubNamespace Data',
          },
        },
      }));
    });

    // check t omake sure the data is set in storage
    expect(JSON.parse(storage['namespace'])).toEqual({
      state: { subNamespace: { data: 'New SubNamespace Data' } },
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
      state: { subNamespace: { data: 'New SubNamespace Data' } },
      version: 0,
    });

    // get the hook for the new store
    ({ namespace: useNamespace } = getNamespaceHooks(store, namespace));
    ({ subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace,
      subNamespace
    ));

    // check to make sure the data is still there
    expect(useSubNamespace.getState().data).toBe('New SubNamespace Data');
  });
});
