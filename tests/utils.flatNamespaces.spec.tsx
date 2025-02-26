import { act, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi, describe } from 'vitest';
import { create } from 'zustand';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';

// Clean up after each test
afterEach(cleanup);

describe('Zustand Namespace Stores', () => {
  const subNamespace = createNamespace(
    'subNamespace',
    () => ({
      data: 'Initial SubNamespace Data',
    }),
    {
      flatten: true,
    }
  );

  // Define namespacesƒ
  const namespace = createNamespace(
    'namespace',
    namespaced(
      (state) => () => ({
        data: 'Initial Namespace Data',
        ...state,
      }),
      { namespaces: [subNamespace] }
    ),
    {
      flatten: true,
    }
  );

  // Create zustand store
  const useStore = create(namespaced({ namespaces: [namespace] }));

  const { namespace: useNamespace } = getNamespaceHooks(useStore, namespace);
  const { subNamespace: useSubNamespace } = getNamespaceHooks(
    useNamespace,
    subNamespace
  );

  test('should have namespaces on store', () => {
    const namespaces = useStore.namespaces;

    expect(namespaces.namespace).toBeTruthy();
  });

  test('should have namespacs should have a path', () => {
    expect(useNamespace.namespacePath).toHaveLength(1);
  });

  test('set should be called once for each namespace', () => {
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

// same tests as before but not passing flattened
describe('Nested Namespaces', () => {
  const subNamespace = createNamespace('subNamespace', () => ({
    data: 'Initial SubNamespace Data',
  }));

  // Define namespaces
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

  test('should have namespaces on store', () => {
    const namespaces = useStore.namespaces;

    expect(namespaces.namespace).toBeTruthy();
  });

  test('should have namespacs should have a path', () => {
    expect(useNamespace.namespacePath).toHaveLength(1);
  });

  test('set should be called once for each namespace', () => {
    const originalDebug = console.debug;
    const messageSet = new Set();

    console.debug = vi.fn((msg) => {
      if (!messageSet.has(msg)) {
        messageSet.add(msg);
        originalDebug(msg); // Optionally, call the original debug for reference
      }
    });

    act(() => {
      useNamespace.setState({
        data: 'Updated Namespace Data',
      });
    });

    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.debug).toHaveBeenCalledWith('test: setState_namespace');

    act(() => {
      useSubNamespace.setState({ data: 'Updated again Namespace Data' });
    });

    expect(console.debug).toHaveBeenCalledTimes(3); // Ensuring only unique logs
    expect(console.debug).toHaveBeenCalledWith('test: setState_subNamespace');

    console.debug = originalDebug; // Restore the original function
  });
});
