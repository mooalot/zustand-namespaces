import { create } from 'zustand';
import { Divisions } from '../src/types';
import { createDivision, divisionHooks, divide } from '../src/utils';
type Division1 = {
  dataInDivision1: string;
};

type Division2 = {
  dataInDivision2: string;
};

const createDivision1 = createDivision<Division1>()(() => ({
  prefix: 'division1',
  creator: () => ({
    dataInDivision1: 'data',
  }),
}));

const createDivision2 = createDivision<Division2>()(() => ({
  prefix: 'division2',
  creator: () => ({
    dataInDivision2: 'data',
  }),
}));

const divisions = [createDivision1(), createDivision2()] as const;

type NotDivisiondData = {
  foo: string;
};

type AppState = Divisions<typeof divisions> & NotDivisiondData;

const useStore = create<AppState>(
  divide(
    () => ({
      foo: 'bar',
    }),
    divisions
  )
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
