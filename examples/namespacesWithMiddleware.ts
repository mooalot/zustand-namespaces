import { temporal } from 'zundo';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ExtractNamespace, ExtractNamespaces } from '../src/types';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';

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
    (namespacedState) =>
      temporal(
        () => ({
          data: 'hi',
          ...namespacedState,
        }),
        {
          partialize: (state) => ({ data: state.namespace_data }),
        }
      ),
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

export const { namespace1: useNamespace1, namespace2: useNamespace2 } =
  getNamespaceHooks(useStore, n1, n2);
export const { namespace: useSubNamespace } = getNamespaceHooks(
  useNamespace1,
  s1
);

// useStore.namespaces.namespace1.temporal.getState();
// useStore.namespaces.namespace2.persist.clearStorage();
// useNamespace1.temporal;
// useNamespace2.persist.clearStorage();

// useNamespace1.namespaces.namespace.temporal.getState();
// useNamespace1((state) => state.data);

// useSubNamespace.persist.clearStorage();
// useSubNamespace((state) => state.data);
