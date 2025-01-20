import { create } from 'zustand';
import { Slices } from '../src/types';
import { createSlice, createUtilsFromSlices, slicer } from '../src/utils';
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

type NotSlicedData = {
  foo: string;
};

type AppState = Slices<typeof slices> & NotSlicedData;

const useStore = create<AppState>(
  slicer(
    (set, get) => ({
      foo: 'bar',
    }),
    slices
  )
);

export const [
  { hook: useSlice1, get: getSlice1State, set: setSlice1State },
  { hook: useSlice2, get: getSlice2State, set: setSlice2State },
] = createUtilsFromSlices(useStore, ...slices);

// useStore has all the slices, but they are prefixed
useStore((state) => state.slice1_dataInSlice1);
useStore((state) => state.slice2_dataInSlice2);

// useSlice1 and useSlice2 are the hooks for the slices. They are no prefixed and self contained
useSlice1((state) => state.dataInSlice1);
useSlice2((state) => state.dataInSlice2);
