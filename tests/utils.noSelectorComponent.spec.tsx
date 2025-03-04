import '@testing-library/jest-dom';
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { create } from 'zustand';
import { ExtractNamespaces } from '../src/types';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';

type Namespace1 = {
  dataInNamespace1: string;
};

// Define namespacesƒ
const namespace1 = createNamespace<Namespace1>()('namespace1', (set) => ({
  dataInNamespace1: 'Initial Namespace1 Data',
  updateNamespace1Data: (data) => set({ dataInNamespace1: data }),
  resetNamespace1Data: () =>
    set({ dataInNamespace1: 'Initial Namespace1 Data' }),
}));

const namespaces = [namespace1];
type AppState = ExtractNamespaces<typeof namespaces>;

// Create zustand store
const useStore = create<AppState>()(namespaced({ namespaces }));

const { namespace1: useNamespace1 } = getNamespaceHooks(useStore, namespace1);

// React components for testing
const Namespace1Component = () => {
  const data = useNamespace1();
  return (
    <div>
      <p data-testid="namespace1-data">{data.dataInNamespace1}</p>
    </div>
  );
};

const App = () => {
  return (
    <div>
      <Namespace1Component />
    </div>
  );
};

// Clean up after each test
afterEach(cleanup);

describe('Zustand Namespaces with No Selector Hook', () => {
  test('should render initial data for namespaces with no selector hook', () => {
    render(<App />);
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
  });

  test('should update namespace1 data when the button is clicked with no selector hook', async () => {
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
});
