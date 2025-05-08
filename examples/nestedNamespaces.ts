import { create } from 'zustand';
import {
  namespaced,
  createNamespace,
  getNamespaceHooks,
} from 'zustand-namespaces';
import { makeHooks } from '../src/utils';
import { useStoreWithEqualityFn } from 'zustand/traditional';

const subNamespace = createNamespace('subNamespace', () => ({
  dataInSubNamespace: 'data',
}));

const namespaceA = createNamespace(
  'namespaceA',
  namespaced(
    (namespacedState) => () => ({
      dataInNamespaceA: 'data',
      ...namespacedState,
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
    (namespacedState) => () => ({
      mainData: 'data',
      ...namespacedState,
    }),
    {
      namespaces: [namespaceA, namespaceB],
    }
  )
);

const {
  namespaceA: useNamespaceA,
  namespaceB: useNamespaceB,
  'namespaceA.subNamespace': useSubNamespace,
} = makeHooks(
  useStore,
  (api) => (selector: any) => useStoreWithEqualityFn(api, selector)
);

// export const { namespaceA: useNamespaceA, namespaceB: useNamespaceB } =
//   getNamespaceHooks(useStore, namespaceA, namespaceB);
// // NOTE THAT YOU NEED TO USE THE PARENT HOOK TO GET THE SUBNAMESPACE HOOK
// export const { subNamespace: useSubNamespace } = getNamespaceHooks(
//   useNamespaceA,
//   subNamespace
// );

useStore((state) => state.namespaceA.dataInNamespaceA);
useStore((state) => state.namespaceB.dataInNamespaceB);
useStore((state) => state.mainData);
useStore.getState;
useStore.setState;

useNamespaceA((state) => state.dataInNamespaceA);
useNamespaceA.getState;
useNamespaceA.setState;
useNamespaceB((state) => state.dataInNamespaceB);
useNamespaceB.getState;
useNamespaceB.setState;
useSubNamespace((state) => state.dataInSubNamespace);
useSubNamespace.getState;
useSubNamespace.setState;
