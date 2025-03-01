import { create } from 'zustand';
import {
  ExtractNamespaces,
  createNamespace,
  getNamespaceHooks,
  namespaced,
} from 'zustand-namespaces';

type Namespace1 = {
  dataInNamespace1: string;
};

type Namespace2 = {
  dataInNamespace2: string;
};

const namespace1 = createNamespace<Namespace1>()('namespace1', () => ({
  dataInNamespace1: 'data',
}));

const namespace2 = createNamespace<Namespace2>()('namespace2', () => ({
  dataInNamespace2: 'data',
}));

const namespaces = [namespace1, namespace2];

type AppState = ExtractNamespaces<typeof namespaces> & { hi: string };

const useStore = create<AppState>()(
  namespaced((namespacedState) => () => ({ hi: 'hi', ...namespacedState }), {
    namespaces,
  })
);

export const { namespace1: useNamespace1, namespace2: useNamespace2 } =
  getNamespaceHooks(useStore, namespace1, namespace2);

useStore((state) => state.namespace1.dataInNamespace1);
useStore((state) => state.namespace2.dataInNamespace2);
useStore.getState;
useStore.setState;

useNamespace1((state) => state.dataInNamespace1);
useNamespace1.getState;
useNamespace1.setState;
useNamespace2((state) => state.dataInNamespace2);
useNamespace2.getState;
useNamespace2.setState;
