import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { create } from 'zustand';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';
import { ExtractNamespace, ExtractNamespaces } from '../src/types';

const subNamespace = createNamespace('subNamespace', () => ({
  data: 'Initial SubNamespace Data',
  data2: 'Initial SubNamespace Data 2',
}));

// Define namespacesƒ
const namespace = createNamespace(
  'namespace',
  namespaced(
    (state) => () => ({
      ...state,
      data: 'Initial Namespace Data',
    }),
    {
      namespaces: [subNamespace],
    }
  )
);

// Create zustand store
const useStore = create(namespaced({ namespaces: [namespace] }));

const { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
const { subNamespace: useSubNamespace } = getNamespaceHooks(
  useNamespace,
  subNamespace
);

// React components for testing
const NamespaceComponent = () => {
  const data = useNamespace((state) => state.data);
  return (
    <div>
      <p data-testid="namespace-data">{data}</p>
    </div>
  );
};

const SubNamespaceComponent = () => {
  const data = useSubNamespace((state) => state.data);
  return (
    <div>
      <p data-testid="subnamespace-data">{data}</p>
    </div>
  );
};

const App = () => {
  return (
    <div>
      <NamespaceComponent />
      <SubNamespaceComponent />
    </div>
  );
};

// Clean up after each test
afterEach(cleanup);

describe('Zustand Namespace Stores', () => {
  test('should have namespaces on store', () => {
    const namespaces = useStore.namespaces;

    expect(namespaces.namespace).toBeTruthy();
    expect(namespaces.namespace.namespaces.subNamespace).toBeTruthy();
  });

  test('should have namespacs should have a path', () => {
    expect(useNamespace.namespacePath).toHaveLength(1);
    expect(useSubNamespace.namespacePath).toHaveLength(2);
  });
});

// Render the App component
describe('App', () => {
  beforeEach(() => {
    useStore.setState({
      namespace_data: 'Initial Namespace Data',
      namespace_subNamespace_data: 'Initial SubNamespace Data',
    });
    render(<App />);
  });

  test('should render the App component', () => {
    expect(screen.getByTestId('namespace-data')).toHaveTextContent(
      'Initial Namespace Data'
    );
  });

  test('should set state from the store', () => {
    act(() => {
      useStore.setState({
        namespace_subNamespace_data: 'Updated SubNamespace Data',
        namespace_data: 'Updated Namespace Data',
      });
    });
    expect(screen.getByTestId('subnamespace-data')).toHaveTextContent(
      'Updated SubNamespace Data'
    );
    expect(screen.getByTestId('namespace-data')).toHaveTextContent(
      'Updated Namespace Data'
    );
  });

  test('should update the namespace data', () => {
    act(() => {
      useNamespace.setState({ data: 'Updated Namespace Data' });
    });

    expect(screen.getByTestId('namespace-data')).toHaveTextContent(
      'Updated Namespace Data'
    );
  });

  test('should update the subnamespace data', () => {
    act(() => {
      useSubNamespace.setState({ data: 'Updated SubNamespace Data' });
    });

    expect(screen.getByTestId('subnamespace-data')).toHaveTextContent(
      'Updated SubNamespace Data'
    );
  });
});
