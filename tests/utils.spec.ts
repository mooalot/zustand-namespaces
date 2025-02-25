import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { Namespace } from '../src/types';
import {
  createNamespace,
  fromNamespace,
  getNamespaceHooks,
  getPrefixedObject,
  getUnprefixedObject,
  namespaced,
  toNamespace,
} from '../src/utils';
import { produce } from 'immer';
import { immer } from 'zustand/middleware/immer';

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
      namespaced((state) => () => ({ key: 'value', ...state }), {
        namespaces: [subNamespace],
      })
    );

    const useStore = create(
      namespaced((state) => () => ({ key: 'value', ...state }), {
        namespaces: [namespace],
      })
    );

    const { namespace: useNamespaceStore } = getNamespaceHooks(
      useStore,
      namespace
    );
    const { subNamespace: useSubNamespaceStore } = getNamespaceHooks(
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
      namespaced((state) => () => ({ key: 'value', ...state }), {
        namespaces: [subNamespace],
      })
    );

    const state = {
      namespace_key: 'value',
      namespace_subNamespace_key: 'value',
    };

    const result = toNamespace(state, namespace, subNamespace);
    const result2 = fromNamespace(result, namespace, subNamespace);

    expect(result).toEqual({
      key: 'value',
    });
    expect(result2).toEqual({
      namespace_subNamespace_key: 'value',
    });
  });

  it('should be able to modify api methods with middleware', () => {
    const subNamespace = createNamespace('subNamespace', () => ({
      key: 'value',
    }));
    const namespace = createNamespace(
      'namespace',
      namespaced((state) => immer(() => ({ key: 'value', ...state })), {
        namespaces: [subNamespace],
      })
    );

    const useStore = create(
      immer(
        namespaced((state) => () => ({ key: 'value', ...state }), {
          namespaces: [namespace],
        })
      )
    );

    useStore.setState((state) => {
      state.namespace_key = 'updated';
    });

    const { namespace: useNamespaceStore } = getNamespaceHooks(
      useStore,
      namespace
    );
    const { subNamespace: useSubNamespaceStore } = getNamespaceHooks(
      useNamespaceStore,
      subNamespace
    );

    useNamespaceStore.setState((state) =>
      produce(state, (draft) => {
        draft.key = 'updated';
      })
    );

    useSubNamespaceStore.setState((state) =>
      produce(state, (draft) => {
        draft.key = 'updated';
      })
    );

    expect(useNamespaceStore.getRawState()).toEqual({
      namespace_key: 'updated',
      namespace_subNamespace_key: 'updated',
    });
  });

  it('should replace state', () => {
    const namespace = createNamespace('namespace', () => ({
      key: 'value',
      key2: 'value2',
    }));

    const useStore = create(
      namespaced((state) => () => ({ key: 'value', ...state }), {
        namespaces: [namespace],
      })
    );

    const { namespace: useNamespaceStore } = getNamespaceHooks(
      useStore,
      namespace
    );

    //@ts-expect-error
    useNamespaceStore.setState({ key: 'updated' }, true);
    expect(useNamespaceStore.getRawState()).toEqual({
      namespace_key: 'updated',
    });
    expect(useNamespaceStore.getState()).toEqual({
      key: 'updated',
    });
    expect(useStore.getState()).toEqual({
      namespace_key: 'updated',
      key: 'value',
    });
  });
});
