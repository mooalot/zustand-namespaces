import { create } from 'zustand';
import {
  createNamespace,
  getNamespaceHooks,
  namespaced,
} from 'zustand-namespaces';

const namespaceA = createNamespace('namespaceA', () => ({
  dataInNamespaceA: 'data',
}));

const namespaceB = createNamespace('namespaceB', () => ({
  dataInNamespaceB: 'data',
}));

const useStore = create(
  namespaced(
    (namespacedState) => () => ({
      mainData: 'data',
      ...namespacedState,
    }),
    {
      namespaces: [namespaceA, namespaceB],
    }
  )
);

export const { namespaceA: useNamespaceA, namespaceB: useNamespaceB } =
  getNamespaceHooks(useStore, namespaceA, namespaceB);

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
