import { describe, it, expect } from 'vitest';
import {
  createNamespace,
  fromNamespace,
  getNamespaceHooks,
  getPrefixedObject,
  getUnprefixedObject,
  namespaced,
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
      const subNamespace: Namespace = {
        name: 'subNamespace1',
        creator: () => ({ key: 'value' }),
      };
      const namespace: Namespace = {
        name: 'namespace1',
        creator: () => ({ key: 'value' }),
      };
      const state = {
        namespace1_key: 'value',
        namespace1_subNamespace1_key: 'value',
      };

      const result = toNamespace(state, namespace, subNamespace);

      expect(result).toEqual({
        key: 'value',
      });
    });
  });

  describe('createNamespace', () => {
    it('should create a namespace definition', () => {
      const testNamespace = createNamespace<{ key: string }>()('test', () => ({
        key: 'value',
      }));

      expect(testNamespace).toEqual({
        name: 'test',
        creator: expect.any(Function),
      });
    });
  });

  it('should be able to getRawState from a namespaced store', () => {
    const subNamespace = createNamespace('subNamespace', () => ({
      key: 'value',
    }));
    const namespace = createNamespace(
      'namespace',
      namespaced(() => ({ key: 'value' }), { namespaces: [subNamespace] })
    );

    const useStore = create(
      namespaced(
        () => ({
          key: 'value',
        }),
        { namespaces: [namespace] }
      )
    );

    const [useNamespaceStore] = getNamespaceHooks(useStore, namespace);
    const [useSubNamespaceStore] = getNamespaceHooks(
      useNamespaceStore,
      subNamespace
    );

    expect(useNamespaceStore.getRawState()).toEqual({
      namespace_key: 'value',
      namespace_subNamespace_key: 'value',
    });
    expect(useSubNamespaceStore.getRawState()).toEqual({
      namespace_subNamespace_key: 'value',
    });
  });

  it('should be able to go to and from a namespace', () => {
    const subNamespace = createNamespace('subNamespace', () => ({
      key: 'value',
    }));
    const namespace = createNamespace(
      'namespace',
      namespaced(() => ({ key: 'value' }), { namespaces: [subNamespace] })
    );

    const state = {
      namespace_key: 'value',
      namespace_subNamespace_key: 'value',
    };

    const result = toNamespace(state, namespace, subNamespace);
    const result2 = fromNamespace(result, subNamespace, namespace);

    expect(result).toEqual({
      key: 'value',
    });
    expect(result2).toEqual({
      namespace_subNamespace_key: 'value',
    });
  });
});
