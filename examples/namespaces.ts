import { create } from 'zustand';
import { getNamespaceHook, namespace, createNamespace } from '../src/utils';

const namespaceA = createNamespace(() => ({
  name: 'namespaceA',
  creator: () => ({
    dataInNamespaceA: 'data',
  }),
}));

const namespaceB = createNamespace(() => ({
  name: 'namespaceB',
  creator: () => ({
    dataInNamespaceB: 'data',
  }),
}));

const namespace = createNamespace(namespaceA, namespaceB);

const useStore = create(namespace([namespaceA, namespaceB]));

export const useDivision1 = getNamespaceHook(useStore, namespaceA);

export const useDivision2 = getNamespaceHook(useStore, namespaceB);

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
