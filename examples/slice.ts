import { create } from 'zustand';
import { Slices } from '../src/types';
import { createSlice, sliceHooks, slicer } from '../src/utils';

type Slice1 = {
  dataInSlice1: string;
};

type Slice2 = {
  dataInSlice2: string;
};

const createSlice1 = createSlice<Slice1>()(() => ({
  prefix: 'slice1',
  creator: () => ({
    dataInSlice1: 'data',
  }),
}));

const createSlice2 = createSlice<Slice2>()(() => ({
  prefix: 'slice2',
  creator: () => ({
    dataInSlice2: 'data',
  }),
}));

const slices = [createSlice1(), createSlice2()] as const;

type AppState = Slices<typeof slices>;

const useStore = create<AppState>(slicer(() => ({}), slices));

export const [useSlice1, useSlice2] = sliceHooks(useStore, ...slices);

// useStore((state) => state.slice1_dataInSlice1);
// useStore((state) => state.slice2_dataInSlice2);
// useStore.getState;
// useStore.setState;

// useSlice1((state) => state.dataInSlice1);
// useSlice1.getState;
// useSlice1.setState;
// useSlice2((state) => state.dataInSlice2);
// useSlice2.getState;
// useSlice2.setState;
