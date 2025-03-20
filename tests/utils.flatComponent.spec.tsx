import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import React, { useCallback } from 'react';
import { afterEach, expect, test } from 'vitest';
import {
  create,
  createStore,
  Mutate,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  UseBoundStore,
  useStore as useZustandStore,
} from 'zustand';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';
import { ExtractNamespace, ExtractNamespaces } from '../src/types';

type Namespace1 = {
  dataInNamespace1: string;
  updateNamespace1Data: (data: string) => void;
  resetNamespace1Data: () => void;
};

type Namespace2 = {
  dataInNamespace2: string;
  updateNamespace2Data: (data: string) => void;
  resetNamespace2Data: () => void;
};

type SubNamespace1 = {
  dataInSubNamespace1: string;
  updateSubNamespace1Data: (data: string) => void;
  resetSubNamespace1Data: () => void;
};

const subNamespace = createNamespace<SubNamespace1>()(
  'subNamespace1',
  (set) => ({
    dataInSubNamespace1: 'Initial SubNamespace1 Data',
    updateSubNamespace1Data: (data) => set({ dataInSubNamespace1: data }),
    resetSubNamespace1Data: () =>
      set({ dataInSubNamespace1: 'Initial SubNamespace1 Data' }),
  }),
  {
    flatten: true,
  }
);

type Namespace1WithSubNamespace1 = Namespace1 &
  ExtractNamespace<typeof subNamespace>;

// Define namespacesƒ
const namespace1 = createNamespace<Namespace1WithSubNamespace1>()(
  'namespace1',
  namespaced(
    (state) => (set) => ({
      dataInNamespace1: 'Initial Namespace1 Data',
      updateNamespace1Data: (data) => set({ dataInNamespace1: data }),
      resetNamespace1Data: () =>
        set({ dataInNamespace1: 'Initial Namespace1 Data' }),
      ...state,
    }),
    {
      namespaces: [subNamespace],
    }
  ),
  {
    flatten: true,
  }
);

const namespace2 = createNamespace<Namespace2>()(
  'namespace2',
  (set) => ({
    dataInNamespace2: 'Initial Namespace2 Data',
    updateNamespace2Data: (data) => set({ dataInNamespace2: data }),
    resetNamespace2Data: () =>
      set({ dataInNamespace2: 'Initial Namespace2 Data' }),
  }),
  {
    flatten: true,
  }
);

const namespaces = [namespace1, namespace2];
type AppState = ExtractNamespaces<typeof namespaces>;

// Create zustand store
const useStore = create<AppState>()(namespaced({ namespaces }));

const { namespace1: useNamespace1, namespace2: useNamespace2 } =
  getNamespaceHooks(useStore, namespace1, namespace2);

const { subNamespace1: useSubNamespace1 } = getNamespaceHooks(
  useNamespace1,
  subNamespace
);

const SubNamespace1Component = () => {
  const data = useSubNamespace1((state) => state.dataInSubNamespace1);
  return (
    <div>
      <p data-testid="subNamespace1-data">{data}</p>
    </div>
  );
};

// React components for testing
const Namespace1Component = () => {
  const data = useNamespace1((state) => state.dataInNamespace1);
  return (
    <div>
      <p data-testid="namespace1-data">{data}</p>
    </div>
  );
};

const Namespace2Component = () => {
  const data = useNamespace2((state) => state.dataInNamespace2);
  return (
    <div>
      <p data-testid="namespace2-data">{data}</p>
    </div>
  );
};

const App = () => {
  return (
    <div>
      <SubNamespace1Component />
      <Namespace1Component />
      <Namespace2Component />
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
      useStore.setState({
        namespace1_dataInNamespace1: 'Initial Namespace1 Data',
        namespace2_dataInNamespace2: 'Initial Namespace2 Data',
        namespace1_subNamespace1_dataInSubNamespace1:
          'Initial SubNamespace1 Data',
      });
    });
  };
  afterEach(resetStore);

  test('should render initial data for namespaces', () => {
    render(<App />);
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Initial SubNamespace1 Data'
    );
  });

  test('should update namespace1 data when the button is clicked', async () => {
    render(<App />);
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    act(() => {
      useNamespace1.setState({
        dataInNamespace1: 'Updated Namespace1 Data',
      });
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data'
    );
  });

  test('should update namespace1 data when the setState button is clicked', async () => {
    render(<App />);
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    act(() => {
      useNamespace1.setState({
        dataInNamespace1: 'Updated Namespace1 Data Using setState',
      });
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data Using setState'
    );
  });

  test('should update namespace2 data when the button is clicked', async () => {
    render(<App />);
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    act(() => {
      useNamespace2.setState({
        dataInNamespace2: 'Updated Namespace2 Data',
      });
    });
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data'
    );
  });

  test('should update namespace2 data when the setState button is clicked', async () => {
    render(<App />);
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    act(() => {
      useNamespace2.setState({
        dataInNamespace2: 'Updated Namespace2 Data Using setState',
      });
    });
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data Using setState'
    );
  });

  test('should update subNamespace1 data when the button is clicked', async () => {
    render(<App />);
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Initial SubNamespace1 Data'
    );
    act(() => {
      useSubNamespace1.setState({
        dataInSubNamespace1: 'Updated SubNamespace1 Data',
      });
    });
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Updated SubNamespace1 Data'
    );
  });

  test('should update subNamespace1 data when the setState button is clicked', async () => {
    render(<App />);
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Initial SubNamespace1 Data'
    );
    act(() => {
      useSubNamespace1.setState({
        dataInSubNamespace1: 'Updated SubNamespace1 Data Using setState',
      });
    });
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Updated SubNamespace1 Data Using setState'
    );
  });

  test('should reset all namespaces when the reset button is clicked', async () => {
    render(<App />);
    act(() => {
      useNamespace1.getState().updateNamespace1Data('Updated Namespace1 Data');
      useNamespace2.getState().updateNamespace2Data('Updated Namespace2 Data');
      useSubNamespace1
        .getState()
        .updateSubNamespace1Data('Updated SubNamespace1 Data');
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data'
    );

    act(() => {
      useNamespace1.getState().resetNamespace1Data();
      useNamespace2.getState().resetNamespace2Data();
      useSubNamespace1.getState().resetSubNamespace1Data();
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Initial SubNamespace1 Data'
    );
  });

  test('should reset all namespaces when the setState button is clicked', async () => {
    render(<App />);
    act(() => {
      useNamespace1.setState({
        dataInNamespace1: 'Updated Namespace1 Data',
      });
      useNamespace2.setState({
        dataInNamespace2: 'Updated Namespace2 Data',
      });
      useSubNamespace1.setState({
        dataInSubNamespace1: 'Updated SubNamespace1 Data',
      });
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data'
    );
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Updated SubNamespace1 Data'
    );

    act(() => {
      useStore.setState({
        namespace1_dataInNamespace1: 'Initial Namespace1 Data',
        namespace2_dataInNamespace2: 'Initial Namespace2 Data',
        namespace1_subNamespace1_dataInSubNamespace1:
          'Initial SubNamespace1 Data',
      });
    });
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Initial SubNamespace1 Data'
    );
  });
});

describe('Hook reads from state', () => {
  type CreateWithProxy = {
    <T, Mos extends [StoreMutatorIdentifier, unknown][] = []>(
      initializer: StateCreator<T, [], Mos>
    ): UseBoundStore<Mutate<StoreApi<T>, Mos>>;
    <T>(): <Mos extends [StoreMutatorIdentifier, unknown][] = []>(
      initializer: StateCreator<T, [], Mos>
    ) => UseBoundStore<Mutate<StoreApi<T>, Mos>>;
  };
  const keys = new Set<string>();
  function createWithProxyImpl<T extends object>(fn?: () => T) {
    if (!fn) {
      return doStuff;
    } else {
      return doStuff(fn);
    }

    function doStuff(fn: () => T) {
      const store = create(fn);
      function hook(selector: (state: T) => any) {
        const smartSelector = useCallback(
          (state: T) => {
            const proxyState = new Proxy(
              { ...state },
              {
                get: (_, prop) => {
                  const key = prop as keyof T;
                  keys.add(key as string);
                  return state[key];
                },
              }
            );

            return selector(proxyState);
          },
          [selector]
        );

        return useZustandStore(store, smartSelector as any);
      }
      return Object.assign(hook, store) as UseBoundStore<StoreApi<T>>;
    }
  }

  const createWithProxy = createWithProxyImpl as CreateWithProxy;

  const subNamespace = createNamespace(
    'subNamespace',
    () => ({
      key: 'value',
      key2: 'value2',
      key3: 'value3',
    }),
    { flatten: true }
  );
  const namespace = createNamespace(
    'namespace',
    namespaced(
      (state) => () => ({
        key: 'value',
        key2: 'value2',
        key3: 'value3',
        ...state,
      }),
      {
        namespaces: [subNamespace],
      }
    ),
    { flatten: true }
  );
  const useNamespacedStore = createWithProxy(
    namespaced(
      (state) => () => ({
        key: 'value',
        key2: 'value2',
        key3: 'value3',
        ...state,
      }),
      {
        namespaces: [namespace],
      }
    )
  );

  const { namespace: useNamespaceStore } = getNamespaceHooks(
    useNamespacedStore,
    namespace
  );
  const { subNamespace: useSubNamespaceStore } = getNamespaceHooks(
    useNamespaceStore,
    subNamespace
  );

  const App = () => {
    const data = useSubNamespaceStore((state) => state.key);
    return <div>{data}</div>;
  };

  it('should read only read one key from state', () => {
    render(<App />);
    expect(screen.getByText('value')).toBeInTheDocument();
    expect(keys.has('namespace_subNamespace_key')).toBeTruthy();
    expect(keys.size).toBe(1);

    // clear the keys set
    keys.clear();
    act(() => {
      useSubNamespaceStore.setState({
        key: 'new value',
      });
    });
    expect(screen.getByText('new value')).toBeInTheDocument();
    expect(keys.has('namespace_subNamespace_key')).toBeTruthy();
    expect(keys.size).toBe(1);
  });
});
