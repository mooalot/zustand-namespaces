import { temporal } from 'zundo';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';

const s1 = createNamespace<{ data: string }>()(
  'namespace',
  temporal(
    persist(
      () => ({
        data: 'hi',
      }),
      { name: 'namespace' }
    )
  )
);

const n1 = createNamespace<{ data: string; namespace_data: string }>()(
  'namespace1',
  namespaced(s1)(
    temporal(() => ({
      data: 'hi',
    }))
  )
);

const n2 = createNamespace<{ data: string }>()(
  'namespace2',
  persist(
    () => ({
      data: 'hi',
    }),
    { name: 'namespace2' }
  )
);

const useStore = create(namespaced(n1, n2)(() => ({ hi: 'hi' })));
const [useNamespace1, useNamespace2] = getNamespaceHooks(useStore, n1, n2);
const [useSubNamespace] = getNamespaceHooks(useNamespace1, s1);

useStore.namespaces.namespace1.temporal.getState();
useStore.namespaces.namespace2.persist.clearStorage();
useNamespace1.temporal;
useNamespace2.persist.clearStorage();

useNamespace1.namespaces.namespace.temporal.getState();
useNamespace1((state) => state.data);

useSubNamespace.persist.clearStorage();
useSubNamespace((state) => state.data);
