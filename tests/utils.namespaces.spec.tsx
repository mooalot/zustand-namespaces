import { act, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { create } from 'zustand';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';

function createStores() {
  const subNamespace = createNamespace('subNamespace', () => ({
    data: 'Initial SubNamespace Data',
  }));

  // Define namespacesƒ
  const namespace = createNamespace(
    'namespace',
    namespaced(
      (state) => () => ({
        data: 'Initial Namespace Data',
        ...state,
      }),
      { namespaces: [subNamespace] }
    )
  );

  // Create zustand store
  const useStore = create(namespaced({ namespaces: [namespace] }));

  const { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
  const { subNamespace: useSubNamespace } = getNamespaceHooks(
    useNamespace,
    subNamespace
  );

  return { useStore, useNamespace, useSubNamespace };
}

// Clean up after each test
afterEach(cleanup);

describe('Zustand Namespace Stores', () => {
  test('should have namespaces on store', () => {
    const { useStore } = createStores();
    const namespaces = useStore.namespaces;

    expect(namespaces.namespace).toBeTruthy();
  });

  test('should have namespacs should have a path', () => {
    const { useNamespace } = createStores();
    expect(useNamespace.namespacePath).toHaveLength(1);
  });

  test('set should be called once for each namespace', () => {
    const { useNamespace, useSubNamespace } = createStores();

    const logSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    act(() => {
      useNamespace.setState({
        data: 'Updated Namespace Data',
      });
    });

    // check that its only been called with the setState_
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('test: setState_namespace');

    act(() => {
      useSubNamespace.setState({ data: 'Updated again Namespace Data' });
    });

    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenCalledWith('test: setState_subNamespace');
  });
});
