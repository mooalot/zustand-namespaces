import { create } from 'zustand';
import { namespaced, createNamespace, getNamespaceHook } from '../src/utils';

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

const namespace = namespaced(namespaceA, namespaceB);

const useStore = create(
  namespace(() => ({
    mainData: 'data',
  }))
);

export const useNamespaceA = getNamespaceHook(useStore, namespaceA);
export const useNamespaceB = getNamespaceHook(useStore, namespaceB);

// useStore((state) => state.namespaceA_dataInNamespaceA);
// useStore((state) => state.namespaceB_dataInNamespaceB);
// useStore((state) => state.mainData);
// useStore.getState;
// useStore.setState;

// useNamespaceA((state) => state.dataInNamespaceA);
// useNamespaceA.getState;
// useNamespaceA.setState;
// useNamespaceB((state) => state.dataInNamespaceB);
// useNamespaceB.getState;
// useNamespaceB.setState;
