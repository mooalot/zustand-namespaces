import { afterEach, expect, test } from 'vitest';
import React from 'react';
import { create } from 'zustand';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createSlice, sliceHooks, slicer } from '../src/utils';
import { Slices } from '../src/types';

type Slice1 = {
  dataInSlice1: string;
  updateSlice1Data: (data: string) => void;
  resetSlice1Data: () => void;
};

type Slice2 = {
  dataInSlice2: string;
  updateSlice2Data: (data: string) => void;
  resetSlice2Data: () => void;
};

// Define slices
const createSlice1 = createSlice<Slice1>()(() => ({
  prefix: 'slice1',
  creator: (set) => ({
    dataInSlice1: 'Initial Slice1 Data',
    updateSlice1Data: (data) => set({ dataInSlice1: data }),
    resetSlice1Data: () => set({ dataInSlice1: 'Initial Slice1 Data' }),
  }),
}));

const createSlice2 = createSlice<Slice2>()(() => ({
  prefix: 'slice2',
  creator: (set) => ({
    dataInSlice2: 'Initial Slice2 Data',
    updateSlice2Data: (data) => set({ dataInSlice2: data }),
    resetSlice2Data: () => set({ dataInSlice2: 'Initial Slice2 Data' }),
  }),
}));

const slices = [createSlice1(), createSlice2()] as const;
type AppState = Slices<typeof slices>;

// Create zustand store
const useStore = create<AppState>(slicer((set, get) => ({}), slices));

// Create utils for slices
const [useSlice1, useSlice2] = sliceHooks(useStore, ...slices);

// React components for testing
const Slice1Component = () => {
  const data = useSlice1((state) => state.dataInSlice1);
  const { updateSlice1Data } = useSlice1.getState();
  return (
    <div>
      <p data-testid="slice1-data">{data}</p>
      <button
        onClick={() => updateSlice1Data('Updated Slice1 Data')}
        type="button"
      >
        Update Slice1
      </button>
      <button
        onClick={() =>
          useSlice1.setState({
            dataInSlice1: 'Updated Slice1 Data Using setState',
          })
        }
        type="button"
      >
        Update Slice1 Using setState
      </button>
    </div>
  );
};

const Slice2Component = () => {
  const data = useSlice2((state) => state.dataInSlice2);
  const { updateSlice2Data } = useSlice2.getState();
  return (
    <div>
      <p data-testid="slice2-data">{data}</p>
      <button
        onClick={() => updateSlice2Data('Updated Slice2 Data')}
        type="button"
      >
        Update Slice2
      </button>
      <button
        onClick={() =>
          useSlice2.setState({
            dataInSlice2: 'Updated Slice2 Data Using setState',
          })
        }
        type="button"
      >
        Update Slice2 Using setState
      </button>
    </div>
  );
};

const App = () => {
  const { slice1_resetSlice1Data, slice2_resetSlice2Data } =
    useStore.getState();
  const resetAll = () => {
    slice1_resetSlice1Data();
    slice2_resetSlice2Data();
  };
  return (
    <div>
      <Slice1Component />
      <Slice2Component />
      <button onClick={resetAll} type="button">
        Reset All
      </button>
      <button
        onClick={() =>
          useStore.setState({
            slice1_dataInSlice1: 'Initial Slice1 Data',
            slice2_dataInSlice2: 'Initial Slice2 Data',
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

// Tests
describe('Zustand Slices with Components', () => {
  const resetStore = () => {
    useStore.setState({
      slice1_dataInSlice1: 'Initial Slice1 Data',
      slice2_dataInSlice2: 'Initial Slice2 Data',
    });
  };
  afterEach(resetStore);

  test('should render initial data for slices', () => {
    render(<App />);
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Initial Slice1 Data'
    );
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Initial Slice2 Data'
    );
  });

  test('should update slice1 data when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Initial Slice1 Data'
    );
    await user.click(screen.getByRole('button', { name: 'Update Slice1' }));
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Updated Slice1 Data'
    );
  });

  test('should update slice1 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Initial Slice1 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update Slice1 Using setState' })
    );
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Updated Slice1 Data Using setState'
    );
  });

  test('should update slice2 data when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Initial Slice2 Data'
    );
    await user.click(screen.getByRole('button', { name: 'Update Slice2' }));
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Updated Slice2 Data'
    );
  });

  test('should update slice2 data when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Initial Slice2 Data'
    );
    await user.click(
      screen.getByRole('button', { name: 'Update Slice2 Using setState' })
    );
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Updated Slice2 Data Using setState'
    );
  });

  test('should reset all slices when the reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Update Slice1' }));
    await user.click(screen.getByRole('button', { name: 'Update Slice2' }));
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Updated Slice1 Data'
    );
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Updated Slice2 Data'
    );

    await user.click(screen.getByRole('button', { name: 'Reset All' }));
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Initial Slice1 Data'
    );
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Initial Slice2 Data'
    );
  });

  test('should reset all slices when the setState button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Update Slice1' }));
    await user.click(screen.getByRole('button', { name: 'Update Slice2' }));
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Updated Slice1 Data'
    );
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Updated Slice2 Data'
    );

    await user.click(
      screen.getByRole('button', { name: 'Reset All Using setState' })
    );
    expect(screen.getByTestId('slice1-data')).toHaveTextContent(
      'Initial Slice1 Data'
    );
    expect(screen.getByTestId('slice2-data')).toHaveTextContent(
      'Initial Slice2 Data'
    );
  });
});
