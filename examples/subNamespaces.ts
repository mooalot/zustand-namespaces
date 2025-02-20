import { create } from 'zustand';
import { namespaced, createNamespace, getNamespaceHooks } from '../src/utils';

const subNamespace = createNamespace('subNamespace', () => ({
  dataInSubNamespace: 'data',
}));

const namespaceA = createNamespace(
  'namespaceA',
  namespaced(
    () => ({
      dataInNamespaceA: 'data',
    }),
    {
      namespaces: [subNamespace],
    }
  )
);

const namespaceB = createNamespace('namespaceB', () => ({
  dataInNamespaceB: 'data',
}));

const useStore = create(
  namespaced(
    () => ({
      mainData: 'data',
    }),
    {
      namespaces: [namespaceA, namespaceB],
    }
  )
);

export const [useNamespaceA] = getNamespaceHooks(useStore, namespaceA);
export const [useNamespaceB] = getNamespaceHooks(useStore, namespaceB);
// NOTE THAT YOU PASS IN THE PARENT STORE, NOT THE ROOT STORE
export const [useSubNamespace] = getNamespaceHooks(useNamespaceA, subNamespace);

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
// useSubNamespace((state) => state.dataInSubNamespace);
// useSubNamespace.getState;
// useSubNamespace.setState;
