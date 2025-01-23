import { create } from 'zustand';
import { createDivision, divide, divisionHook } from '../src/utils';

const division1 = createDivision(() => ({
  prefix: 'division1',
  creator: () => ({
    dataInDivision1: 'data',
  }),
}));

const division2 = createDivision(() => ({
  prefix: 'division2',
  creator: () => ({
    dataInDivision2: 'data',
  }),
}));

const useStore = create(
  divide([division1(), division2()], () => ({
    mainData: 'data',
  }))
);

export const useDivision1 = divisionHook(useStore, division1());

export const useDivision2 = divisionHook(useStore, division2());

// useStore((state) => state.division1_dataInDivision1);
// useStore((state) => state.division2_dataInDivision2);
// useStore((state) => state.mainData);
// useStore.getState;
// useStore.setState;

// useDivision1((state) => state.dataInDivision1);
// useDivision1.getState;
// useDivision1.setState;
// useDivision2((state) => state.dataInDivision2);
// useDivision2.getState;
// useDivision2.setState;
