import { temporal } from 'zundo';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExtractNamespace, ExtractNamespaces } from '../src/types';
import { createNamespace, getNamespaceFactory, namespaced } from '../src/utils';

type SubNamespace = {
  data: string;
};

const s1 = createNamespace<SubNamespace>()(
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

type Namespace1 = ExtractNamespace<typeof s1> & {
  data: string;
};

const n1 = createNamespace<Namespace1>()(
  'namespace1',
  namespaced(
    temporal(() => ({
      data: 'hi',
    })),
    {
      namespaces: [s1],
    }
  )
);

type Namespace2 = {
  data: string;
};

const n2 = createNamespace<Namespace2>()(
  'namespace2',
  persist(
    () => ({
      data: 'hi',
    }),
    { name: 'namespace2' }
  )
);

type AppState = ExtractNamespaces<[typeof n1, typeof n2]>;

const useStore = create<AppState>()(namespaced({ namespaces: [n1, n2] }));

const factory = getNamespaceFactory(useStore);
export const useNamespace1 = factory(n1);
export const useNamespace2 = factory(n2);
const subFactory = getNamespaceFactory(useNamespace1);
export const useSubNamespace = subFactory(s1);

// useStore.namespaces.namespace1.temporal.getState();
// useStore.namespaces.namespace2.persist.clearStorage();
// useNamespace1.temporal;
// useNamespace2.persist.clearStorage();

// useNamespace1.namespaces.namespace.temporal.getState();
// useNamespace1((state) => state.data);

// useSubNamespace.persist.clearStorage();
// useSubNamespace((state) => state.data);
