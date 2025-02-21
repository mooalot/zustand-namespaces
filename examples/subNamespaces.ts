import { create } from 'zustand';
import { namespaced, createNamespace, getNamespaceFactory } from '../src/utils';

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

const factory = getNamespaceFactory(useStore);
export const useNamespaceA = factory(namespaceA);
export const useNamespaceB = factory(namespaceB);
// NOTE THAT A NEW FACTORY IS CREATED FOR THE SUBNAMESPACE
const subFactory = getNamespaceFactory(useNamespaceA);
export const useSubNamespace = subFactory(subNamespace);

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
