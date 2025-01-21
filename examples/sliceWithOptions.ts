import { create } from 'zustand';
import { Slices } from '../src/types';
import {
  createSlice,
  sliceHooks,
  slicer,
  sliceToState,
  spreadSlices,
  stateToSlice,
} from '../src/utils';
import { temporal } from 'zundo';

type CustomOptions<T> = {
  partialized?: (state: T) => Partial<T>;
};

type Slice1 = {
  dataInSlice1: string;
};

type Slice2 = {
  dataInSlice2: string;
};

const createSlice1 = createSlice<Slice1, CustomOptions<Slice1>>()(() => ({
  prefix: 'slice1',
  creator: () => ({
    dataInSlice1: 'data',
  }),
  options: {
    partialized: (state) => ({
      dataInSlice1: state.dataInSlice1,
    }),
  },
}));

const createSlice2 = createSlice<Slice2, CustomOptions<Slice2>>()(() => ({
  prefix: 'slice2',
  creator: () => ({
    dataInSlice2: 'data',
  }),
  options: {},
}));

const slices = [createSlice1(), createSlice2()] as const;

type AppState = Slices<typeof slices>;

const useStore = create<AppState>()(
  temporal(
    slicer(() => ({}), slices),
    {
      partialize: (state) => {
        return spreadSlices(slices, (slice) => {
          const slicedData = stateToSlice(slice, state);
          const partializedData = slice.options?.partialized?.(slicedData);
          return sliceToState(slice, partializedData ?? {});
        });
      },
    }
  )
);

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
