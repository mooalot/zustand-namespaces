import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { temporal } from 'zundo';
import { create } from 'zustand';
import { createJSONStorage, persist, StateStorage } from 'zustand/middleware';
import { createNamespace, namespaced, getNamespaceHooks } from '../src/utils';

const storage: { [key: string]: string } = {};

const storageImplementation: StateStorage = {
  getItem: async (name) => {
    return storage[name];
  },
  setItem: async (name, value) => {
    storage[name] = value;
  },
  removeItem: async (name) => {
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
  )
);

const n1 = createNamespace<{ data: string; subNamespace_data: string }>()(
  'namespace1',
  namespaced(
    (state) =>
      temporal(() => ({
        data: 'hi',
        ...state,
      })),
    {
      namespaces: [sn],
    }
  )
);

const n2 = createNamespace<{ data: string }>()(
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
    console.log('useStore', useStore);
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
    console.log('useStore', useNamespace1);

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
});
