import { afterEach, expect, test } from 'vitest';
import React from 'react';
import { create } from 'zustand';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { createDivision, divisionHooks, divide } from '../src/utils';
import { Divide } from '../src/types';

type Division1 = {
  dataInDivision1: string;
  updateDivision1Data: (data: string) => void;
  resetDivision1Data: () => void;
};

type Division2 = {
  dataInDivision2: string;
  updateDivision2Data: (data: string) => void;
  resetDivision2Data: () => void;
};

type SubDivision1 = {
  dataInSubDivision1: string;
  updateSubDivision1Data: (data: string) => void;
  resetSubDivision1Data: () => void;
};

const subDivisions = [
  createDivision<SubDivision1>()(() => ({
    prefix: 'subDivision1',
    creator: (set) => ({
      dataInSubDivision1: 'Initial SubDivision1 Data',
      updateSubDivision1Data: (data) => set({ dataInSubDivision1: data }),
      resetSubDivision1Data: () =>
        set({ dataInSubDivision1: 'Initial SubDivision1 Data' }),
    }),
  }))(),
] as const;

type Division1WithSubDivision1 = Division1 & Divide<typeof subDivisions>;

// Define divisions
const createDivision1 = createDivision<Division1WithSubDivision1>()(() => ({
  prefix: 'division1',
  creator: divide(subDivisions, (set) => ({
    dataInDivision1: 'Initial Division1 Data',
    updateDivision1Data: (data) => set({ dataInDivision1: data }),
    resetDivision1Data: () =>
      set({ dataInDivision1: 'Initial Division1 Data' }),
  })),
}));

const createDivision2 = createDivision<Division2>()(() => ({
  prefix: 'division2',
  creator: (set) => ({
    dataInDivision2: 'Initial Division2 Data',
    updateDivision2Data: (data) => set({ dataInDivision2: data }),
    resetDivision2Data: () =>
      set({ dataInDivision2: 'Initial Division2 Data' }),
  }),
}));

const divisions = [createDivision1(), createDivision2()] as const;
type AppState = Divide<typeof divisions>;

// Create zustand store
const useStore = create<AppState>(divide(divisions));

// Create utils for divisions
const [useDivision1, useDivision2] = divisionHooks(useStore, ...divisions);
const [useSubDivision1] = divisionHooks(useDivision1, ...subDivisions);

const SubDivision1Component = () => {
  const data = useSubDivision1((state) => state.dataInSubDivision1);
  const { updateSubDivision1Data } = useSubDivision1.getState();
  return (
    <div>
      <p data-testid="subDivision1-data">{data}</p>
      <button
        onClick={() => updateSubDivision1Data('Updated SubDivision1 Data')}
        type="button"
      >
        Update SubDivision1
      </button>
      <button
        onClick={() =>
          useDivision1.setState({
            subDivision1_dataInSubDivision1:
              'Updated SubDivision1 Data Using setState',
          })
        }
        type="button"
      >
        Update SubDivision1 Using setState
      </button>
    </div>
  );
};

// React components for testing
const Division1Component = () => {
  const data = useDivision1((state) => state.dataInDivision1);
  const { updateDivision1Data } = useDivision1.getState();
  return (
    <div>
      <p data-testid="division1-data">{data}</p>
      <button
        onClick={() => updateDivision1Data('Updated Division1 Data')}
        type="button"
      >
        Update Division1
      </button>
      <button
        onClick={() =>
          useDivision1.setState({
            dataInDivision1: 'Updated Division1 Data Using setState',
          })
        }
        type="button"
      >
        Update Division1 Using setState
      </button>
    </div>
  );
};

const Division2Component = () => {
  const data = useDivision2((state) => state.dataInDivision2);
  const { updateDivision2Data } = useDivision2.getState();
  return (
    <div>
      <p data-testid="division2-data">{data}</p>
      <button
        onClick={() => updateDivision2Data('Updated Division2 Data')}
        type="button"
      >
        Update Division2
      </button>
      <button
        onClick={() =>
          useDivision2.setState({
            dataInDivision2: 'Updated Division2 Data Using setState',
          })
        }
        type="button"
      >
        Update Division2 Using setState
      </button>
    </div>
  );
};

const App = () => {
  const {
    division1_resetDivision1Data,
    division2_resetDivision2Data,
    division1_subDivision1_resetSubDivision1Data,
  } = useStore.getState();
  const resetAll = () => {
    division1_resetDivision1Data();
    division2_resetDivision2Data();
    division1_subDivision1_resetSubDivision1Data();
  };

  return (
    <div>
      <SubDivision1Component />
      <Division1Component />
      <Division2Component />
      <button onClick={resetAll} type="button">
        Reset All
      </button>
      <button
        onClick={() =>
          useStore.setState({
            division1_dataInDivision1: 'Initial Division1 Data',
            division2_dataInDivision2: 'Initial Division2 Data',
            division1_subDivision1_dataInSubDivision1:
              'Initial SubDivision1 Data',
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

describe('Zustand Division Stores', () => {
  test('should have division1 methods in useStore', () => {
    Object.keys(useStore).forEach((key) => {
      expect(key in useDivision1).toBeTruthy();
    });
  });
});

// Tests
describe('Zustand Divisions with Components', () => {
  const resetStore = () => {
    useStore.setState({
      division1_dataInDivision1: 'Initial Division1 Data',
      division2_dataInDivision2: 'Initial Division2 Data',
      division1_subDivision1_dataInSubDivision1: 'Initial SubDivision1 Data',
    });
  };
  afterEach(resetStore);

  test('should render initial data for divisions', () => {
    render(<App />);
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Initial Division1 Data'
    );
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Initial Division2 Data'
    );
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Initial SubDivision1 Data'
    );
  });

  test('should update division1 data when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Initial Division1 Data'
    );
    await user.click(screen.getByRole('button', { name: 'Update Division1' }));
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Updated Division1 Data'
    );
  });

  test('should update division1 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Initial Division1 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update Division1 Using setState' })
    );
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Updated Division1 Data Using setState'
    );
  });

  test('should update division2 data when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Initial Division2 Data'
    );
    await user.click(screen.getByRole('button', { name: 'Update Division2' }));
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Updated Division2 Data'
    );
  });

  test('should update division2 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Initial Division2 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update Division2 Using setState' })
    );
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Updated Division2 Data Using setState'
    );
  });

  test('should update subDivision1 data when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Initial SubDivision1 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update SubDivision1' })
    );
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Updated SubDivision1 Data'
    );
  });

  test('should update subDivision1 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Initial SubDivision1 Data'
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Update SubDivision1 Using setState',
      })
    );
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Updated SubDivision1 Data Using setState'
    );
  });

  test('should reset all divisions when the reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Update Division1' }));
    await user.click(screen.getByRole('button', { name: 'Update Division2' }));
    await user.click(
      screen.getByRole('button', { name: 'Update SubDivision1' })
    );
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Updated Division1 Data'
    );
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Updated Division2 Data'
    );

    await user.click(screen.getByRole('button', { name: 'Reset All' }));
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Initial Division1 Data'
    );
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Initial Division2 Data'
    );
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Initial SubDivision1 Data'
    );
  });

  test('should reset all divisions when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Update Division1' }));
    await user.click(screen.getByRole('button', { name: 'Update Division2' }));
    await user.click(
      screen.getByRole('button', { name: 'Update SubDivision1' })
    );
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Updated Division1 Data'
    );
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Updated Division2 Data'
    );
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Updated SubDivision1 Data'
    );

    await user.click(
      screen.getByRole('button', { name: 'Reset All Using setState' })
    );
    expect(screen.getByTestId('division1-data')).toHaveTextContent(
      'Initial Division1 Data'
    );
    expect(screen.getByTestId('division2-data')).toHaveTextContent(
      'Initial Division2 Data'
    );
    expect(screen.getByTestId('subDivision1-data')).toHaveTextContent(
      'Initial SubDivision1 Data'
    );
  });
});
