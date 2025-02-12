import '@testing-library/jest-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { create } from 'zustand';
import { createNamespace, namespaced } from '../src/utils';
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

const subNamespace = createNamespace<SubNamespace1>()(() => ({
  name: 'subNamespace1',
  creator: (set) => ({
    dataInSubNamespace1: 'Initial SubNamespace1 Data',
    updateSubNamespace1Data: (data) => set({ dataInSubNamespace1: data }),
    resetSubNamespace1Data: () =>
      set({ dataInSubNamespace1: 'Initial SubNamespace1 Data' }),
  }),
}));

type Namespace1WithSubNamespace1 = Namespace1 &
  ExtractNamespace<typeof subNamespace>;

// Define namespacesƒ
const namespace1 = createNamespace<Namespace1WithSubNamespace1>()(() => ({
  name: 'namespace1',
  creator: namespaced(subNamespace)((set) => ({
    dataInNamespace1: 'Initial Namespace1 Data',
    updateNamespace1Data: (data) => set({ dataInNamespace1: data }),
    resetNamespace1Data: () =>
      set({ dataInNamespace1: 'Initial Namespace1 Data' }),
  })),
}));

const namespace2 = createNamespace<Namespace2>()(() => ({
  name: 'namespace2',
  creator: (set) => ({
    dataInNamespace2: 'Initial Namespace2 Data',
    updateNamespace2Data: (data) => set({ dataInNamespace2: data }),
    resetNamespace2Data: () =>
      set({ dataInNamespace2: 'Initial Namespace2 Data' }),
  }),
}));

const namespaces = [namespace1, namespace2];
type AppState = ExtractNamespaces<typeof namespaces>;

const namespace = namespaced(...namespaces);

// Create zustand store
const useStore = create<AppState>()(namespace(() => ({})));

const useNamespace1 = useStore.getNamespaceHook(namespace1);
const useSubNamespace1 = useNamespace1.getNamespaceHook(subNamespace);
const useNamespace2 = useStore.getNamespaceHook(namespace2);

const SubNamespace1Component = () => {
  const data = useSubNamespace1((state) => state.dataInSubNamespace1);
  const { updateSubNamespace1Data } = useSubNamespace1.getState();
  return (
    <div>
      <p data-testid="subNamespace1-data">{data}</p>
      <button
        onClick={() => updateSubNamespace1Data('Updated SubNamespace1 Data')}
        type="button"
      >
        Update SubNamespace1
      </button>
      <button
        onClick={() =>
          useNamespace1.setState({
            subNamespace1_dataInSubNamespace1:
              'Updated SubNamespace1 Data Using setState',
          })
        }
        type="button"
      >
        Update SubNamespace1 Using setState
      </button>
    </div>
  );
};

// React components for testing
const Namespace1Component = () => {
  const data = useNamespace1((state) => state.dataInNamespace1);
  const updateNamespace1Data = useNamespace1(
    (state) => state.updateNamespace1Data
  );
  return (
    <div>
      <p data-testid="namespace1-data">{data}</p>
      <button
        onClick={() => updateNamespace1Data('Updated Namespace1 Data')}
        type="button"
      >
        Update Namespace1
      </button>
      <button
        onClick={() =>
          useNamespace1.setState({
            dataInNamespace1: 'Updated Namespace1 Data Using setState',
          })
        }
        type="button"
      >
        Update Namespace1 Using setState
      </button>
    </div>
  );
};

const Namespace2Component = () => {
  const data = useNamespace2((state) => state.dataInNamespace2);
  const { updateNamespace2Data } = useNamespace2.getState();
  return (
    <div>
      <p data-testid="namespace2-data">{data}</p>
      <button
        onClick={() => updateNamespace2Data('Updated Namespace2 Data')}
        type="button"
      >
        Update Namespace2
      </button>
      <button
        onClick={() =>
          useNamespace2.setState({
            dataInNamespace2: 'Updated Namespace2 Data Using setState',
          })
        }
        type="button"
      >
        Update Namespace2 Using setState
      </button>
    </div>
  );
};

const App = () => {
  const {
    namespace1_resetNamespace1Data,
    namespace2_resetNamespace2Data,
    namespace1_subNamespace1_resetSubNamespace1Data,
  } = useStore.getState();
  const resetAll = () => {
    namespace1_resetNamespace1Data();
    namespace2_resetNamespace2Data();
    namespace1_subNamespace1_resetSubNamespace1Data();
  };

  return (
    <div>
      <SubNamespace1Component />
      <Namespace1Component />
      <Namespace2Component />
      <button onClick={resetAll} type="button">
        Reset All
      </button>
      <button
        onClick={() =>
          useStore.setState({
            namespace1_dataInNamespace1: 'Initial Namespace1 Data',
            namespace2_dataInNamespace2: 'Initial Namespace2 Data',
            namespace1_subNamespace1_dataInSubNamespace1:
              'Initial SubNamespace1 Data',
          })
        }
        type="button"
      >
        Reset All Using setState
      </button>
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
    useStore.setState({
      namespace1_dataInNamespace1: 'Initial Namespace1 Data',
      namespace2_dataInNamespace2: 'Initial Namespace2 Data',
      namespace1_subNamespace1_dataInSubNamespace1:
        'Initial SubNamespace1 Data',
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
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    await user.click(screen.getByRole('button', { name: 'Update Namespace1' }));
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data'
    );
  });

  test('should update namespace1 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Initial Namespace1 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update Namespace1 Using setState' })
    );
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data Using setState'
    );
  });

  test('should update namespace2 data when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    await user.click(screen.getByRole('button', { name: 'Update Namespace2' }));
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data'
    );
  });

  test('should update namespace2 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Initial Namespace2 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update Namespace2 Using setState' })
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data Using setState'
    );
  });

  test('should update subNamespace1 data when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Initial SubNamespace1 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update SubNamespace1' })
    );
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Updated SubNamespace1 Data'
    );
  });

  test('should update subNamespace1 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Initial SubNamespace1 Data'
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Update SubNamespace1 Using setState',
      })
    );
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Updated SubNamespace1 Data Using setState'
    );
  });

  test('should reset all namespaces when the reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Update Namespace1' }));
    await user.click(screen.getByRole('button', { name: 'Update Namespace2' }));
    await user.click(
      screen.getByRole('button', { name: 'Update SubNamespace1' })
    );
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data'
    );

    await user.click(screen.getByRole('button', { name: 'Reset All' }));
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
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Update Namespace1' }));
    await user.click(screen.getByRole('button', { name: 'Update Namespace2' }));
    await user.click(
      screen.getByRole('button', { name: 'Update SubNamespace1' })
    );
    expect(screen.getByTestId('namespace1-data')).toHaveTextContent(
      'Updated Namespace1 Data'
    );
    expect(screen.getByTestId('namespace2-data')).toHaveTextContent(
      'Updated Namespace2 Data'
    );
    expect(screen.getByTestId('subNamespace1-data')).toHaveTextContent(
      'Updated SubNamespace1 Data'
    );

    await user.click(
      screen.getByRole('button', { name: 'Reset All Using setState' })
    );
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
