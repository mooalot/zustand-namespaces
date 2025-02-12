import { create } from 'zustand';
import { namespaced, createNamespace } from '../src/utils';

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

export const useNamespaceA = useStore.getNamespaceHook(namespaceA);
export const useNamespaceB = useStore.getNamespaceHook(namespaceB);

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
