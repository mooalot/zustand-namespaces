import { create } from 'zustand';
import { Divide } from '../src/types';
import {
  createDivision,
  divisionHooks,
  divide,
  partializeDivisions,
} from '../src/utils';
import { temporal, ZundoOptions } from 'zundo';

type Division2 = {
  dataInDivision2: string;
};

type SubDivision1 = {
  dataInSubDivision1: string;
};

type CustomOptions<T> = {
  partialized?: ZundoOptions<T, Partial<T>>['partialize'];
};

const createSubDivision1 = createDivision<
  SubDivision1,
  CustomOptions<SubDivision1>
>()(() => ({
  prefix: 'subDivision1',
  creator: () => ({
    dataInSubDivision1: 'data',
  }),
  options: {
    partialized: (state) => ({
      dataInSubDivision1: state.dataInSubDivision1,
    }),
  },
}));

const subDivisions = [createSubDivision1()] as const;

type Division1 = {
  dataInDivision1: string;
} & Divide<typeof subDivisions>;

const createDivision1 = createDivision<Division1, CustomOptions<Division1>>()(
  () => ({
    prefix: 'division1',
    creator: divide(subDivisions, () => ({
      dataInDivision1: 'data',
    })),
    options: {
      partialized: (state) => ({
        dataInDivision1: state.dataInDivision1,
        ...partializeDivisions(
          state,
          subDivisions,
          (division) => division.options?.partialized
        ),
      }),
    },
  })
);

const createDivision2 = createDivision<Division2, CustomOptions<Division2>>()(
  () => ({
    prefix: 'division2',
    creator: () => ({
      dataInDivision2: 'data',
    }),
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
// using useDivision1, we can create a hook for its nested divisions
export const [useSubDivision1] = divisionHooks(useDivision1, ...subDivisions);

// useStore((state) => state.division1_dataInDivision1);
// useStore((state) => state.division2_dataInDivision2);
// useStore((state) => state.division1_subDivision1_dataInSubDivision1);
// useStore.getState;
// useStore.setState;

// useDivision1((state) => state.dataInDivision1);
// useDivision1.getState;
// useDivision1.setState;

// useDivision2((state) => state.dataInDivision2);
// useDivision2.getState;
// useDivision2.setState;

// useSubDivision1((state) => state.dataInSubDivision1);
// useSubDivision1.getState;
// useSubDivision1.setState;
