import { create } from 'zustand';
import { Slices } from '../src/types';
import {
  createSliceWithOptions,
  createUtilsFromSlices,
  slicer,
  sliceToState,
  spreadSlicesWithCallback,
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

const createSlice1 = createSliceWithOptions<Slice1, CustomOptions<Slice1>>()(
  () => ({
    prefix: 'slice1',
    creator: () => ({
      dataInSlice1: 'data',
    }),
    options: {
      partialized: (state) => ({
        dataInSlice1: state.dataInSlice1,
      }),
    },
  })
);

const createSlice2 = createSliceWithOptions<Slice2, CustomOptions<Slice2>>()(
  () => ({
    prefix: 'slice2',
    creator: () => ({
      dataInSlice2: 'data',
    }),
    options: {},
  })
);

const slices = [createSlice1(), createSlice2()] as const;

type AppState = Slices<typeof slices>;

const useStore = create<AppState>()(
  temporal(
    slicer((set, get) => ({}), slices),
    {
      partialize: (state) => {
        return spreadSlicesWithCallback(slices, (slice) => {
          const slicedData = stateToSlice(slice, state);
          const partializedData = slice.options?.partialized?.(slicedData);
          return sliceToState(slice, partializedData ?? {});
        });
      },
    }
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
