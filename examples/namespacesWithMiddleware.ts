import { temporal } from 'zundo';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createNamespace, namespaced } from '../src/utils';

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
const useStore2 = create(temporal(() => ({ hi: 'hi' })));
const useStore3 = create(persist(() => ({ hi: 'hi' }), { name: 'namespace3' }));
useStore2.temporal;
useStore3.persist.clearStorage();
useStore.namespaces.namespace1.temporal;
useStore.namespaces.namespace2.persist.clearStorage();
