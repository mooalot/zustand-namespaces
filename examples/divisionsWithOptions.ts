import { create } from 'zustand';
import { Divide } from '../src/types';
import {
  createDivision,
  divisionHooks,
  divide,
  partializeDivisions,
} from '../src/utils';
import { temporal, ZundoOptions } from 'zundo';

type CustomOptions<T> = {
  partialized?: ZundoOptions<T, Partial<T>>['partialize'];
};

type Division1 = {
  dataInDivision1: string;
  data: string;
};

type Division2 = {
  dataInDivision2: string;
  data: number;
};

const createDivision1 = createDivision<Division1, CustomOptions<Division1>>()(
  () => ({
    prefix: 'division1',
    creator: () => ({
      dataInDivision1: 'data',
      data: 'data',
    }),
    options: {
      partialized: (state) => ({
        dataInDivision1: state.dataInDivision1,
      }),
    },
  })
);

const createDivision2 = createDivision<Division2, CustomOptions<Division2>>()(
  () => ({
    prefix: 'division2',
    creator: () => ({
      dataInDivision2: 'data',
      data: 1,
    }),
    options: {},
  })
);

const divisions = [createDivision1(), createDivision2()] as const;

type AppState = Divide<typeof divisions>;

const useStore = create<AppState>()(
  temporal(divide(divisions), {
    partialize: (state) => {
      return partializeDivisions(
        state,
        divisions,
        (division) => division.options?.partialized
      );
    },
  })
);

export const [useDivision1, useDivision2] = divisionHooks(
  useStore,
  ...divisions
);

// useStore((state) => state.division1_dataInDivision1);
// useStore((state) => state.division2_dataInDivision2);
// useStore.getState;
// useStore.setState;

// useDivision1((state) => state.dataInDivision1);
// useDivision1.getState;
// useDivision1.setState;
// useDivision2((state) => state.dataInDivision2);
// useDivision2.getState;
// useDivision2.setState;
