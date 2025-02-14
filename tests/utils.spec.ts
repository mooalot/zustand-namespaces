import { describe, it, expect } from 'vitest';
import {
  createNamespace,
  fromNamespace,
  getNamespaceHooks,
  getPrefixedObject,
  getUnprefixedObject,
  namespaced,
  partializeNamespace,
  partializeNamespaces,
  spreadNamespaces,
  toNamespace,
} from '../src/utils';
import { ExtractNamespaces, Namespace } from '../src/types';
import { create } from 'zustand';

describe('Utility Functions', () => {
  describe('getPrefixedObject', () => {
    it('should add a prefix to object keys', () => {
      const input = { key1: 'value1', key2: 'value2' };
      const prefix = 'prefix';

      const result = getPrefixedObject(prefix, input);

      expect(result).toEqual({
        prefix_key1: 'value1',
        prefix_key2: 'value2',
      });
    });
  });

  describe('getUnprefixedObject', () => {
    it('should remove a prefix from object keys', () => {
      const input = { prefix_key1: 'value1', prefix_key2: 'value2' };
      const prefix = 'prefix';

      const result = getUnprefixedObject(prefix, input);

      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should ignore keys without the prefix', () => {
      const input = { prefix_key1: 'value1', other_key: 'value2' };
      const prefix = 'prefix';

      const result = getUnprefixedObject(prefix, input);

      expect(result).toEqual({
        key1: 'value1',
      });
    });
  });

  describe('spreadNamespacesWithCallback', () => {
    it('should combine namespace results using a callback', () => {
      const namespaces: Namespace[] = [
        { name: 'namespace1', creator: () => {} },
        { name: 'namespace2', creator: () => {} },
      ];
      const callback = (namespace: Namespace) => ({
        [`${namespace.name}_foo`]: 'bar',
      });

      const result = spreadNamespaces(namespaces, callback);

      expect(result).toEqual({
        namespace1_foo: 'bar',
        namespace2_foo: 'bar',
      });
    });
  });

  describe('stateToNamespace', () => {
    it('should extract unprefixed state for a namespace', () => {
      const namespace: Namespace = {
        name: 'namespace1',
        creator: () => ({ key1: 'value1' }),
      };
      const state = { namespace1_key1: 'value1', namespace2_key2: 'value2' };

      const result = toNamespace(namespace, state);

      expect(result).toEqual({
        key1: 'value1',
      });
    });
  });

  describe('namespaceToState', () => {
    it('should add a prefix to namespace state', () => {
      const namespace: Namespace = {
        name: 'namespace1',
        creator: () => ({ key1: 'value1' }),
      };
      const state = { key1: 'value1' };

      const result = fromNamespace(namespace, state);

      expect(result).toEqual({
        namespace1_key1: 'value1',
      });
    });
  });

  describe('createNamespace', () => {
    it('should create a namespace definition', () => {
      const testNamespace = createNamespace<{ key: string }>()(() => ({
        name: 'test',
        creator: () => ({
          key: 'value',
        }),
      }));

      expect(testNamespace).toEqual({
        name: 'test',
        creator: expect.any(Function),
      });
    });
  });

  it('do crazy options', () => {
    type SubNamespace = {
      one: string;
      two: string;
    };

    type CustomOptions<T> = {
      partialized?: (state: T) => Partial<T>;
    };

    const createSubNamespace = createNamespace<
      SubNamespace,
      CustomOptions<SubNamespace>
    >()(() => ({
      name: 'subNamespace1',
      creator: () => ({
        one: 'one',
        two: 'two',
      }),
      options: {
        partialized: (state) => ({
          one: state.one,
        }),
      },
    }));

    const subNamespaces = [createSubNamespace] as const;

    type Namespace = {
      one: string;
      two: string;
    } & ExtractNamespaces<typeof subNamespaces>;

    const namespace = createNamespace<Namespace, CustomOptions<Namespace>>()(
      () => ({
        name: 'namespace1',
        creator: namespaced(...subNamespaces)(() => ({
          one: 'one',
          two: 'two',
        })),
        options: {
          partialized: (state) => ({
            dataInNamespace1: state.two,
            ...spreadNamespaces(subNamespaces, (subNamespace) => {
              const namespacedData = toNamespace(subNamespace, state);
              const partializedData =
                subNamespace.options?.partialized?.(namespacedData);
              return fromNamespace(subNamespace, partializedData ?? {});
            }),
          }),
        },
      })
    );

    const namespaces = [namespace] as const;

    const state: ExtractNamespaces<typeof namespaces> = {
      namespace1_one: 'one',
      namespace1_two: 'two',
      namespace1_subNamespace1_one: 'one',
      namespace1_subNamespace1_two: 'two',
    };

    const spread = spreadNamespaces(namespaces, (namespace) => {
      const namespaceData = toNamespace(namespace, state);
      const partializedData = namespace.options?.partialized?.(namespaceData);
      return fromNamespace(namespace, partializedData ?? {});
    });

    expect(spread).toEqual({
      namespace1_dataInNamespace1: 'two',
      namespace1_subNamespace1_one: 'one',
    });

    const partializedNamespace = spreadNamespaces(
      namespaces,
      partializeNamespace(state, (namespace) => namespace.options?.partialized)
    );
    expect(partializedNamespace).toEqual({
      namespace1_dataInNamespace1: 'two',
      namespace1_subNamespace1_one: 'one',
    });

    const partializedNamespaces = partializeNamespaces(
      state,
      namespaces,
      (namespace) => namespace.options?.partialized
    );
    expect(partializedNamespaces).toEqual({
      namespace1_dataInNamespace1: 'two',
      namespace1_subNamespace1_one: 'one',
    });
  });

  it('should be able to getRawState from a namespaced store', () => {
    const subNamespace = createNamespace(() => ({
      name: 'subNamespace',
      creator: () => ({ key: 'value' }),
    }));
    const namespace = createNamespace(() => ({
      name: 'namespace',
      creator: namespaced(subNamespace)(() => ({ key: 'value' })),
    }));

    const useStore = create(
      namespaced(namespace)(() => ({
        key: 'value',
      }))
    );

    const [useNamespaceStore] = getNamespaceHooks(useStore, namespace);
    const [usesubNamespaceStore] = getNamespaceHooks(
      useNamespaceStore,
      subNamespace
    );

    expect(useNamespaceStore.getRawState()).toEqual({
      namespace_key: 'value',
      namespace_subNamespace_key: 'value',
    });
    expect(usesubNamespaceStore.getRawState()).toEqual({
      namespace_subNamespace_key: 'value',
    });
  });
});
