import { expectType } from 'ts-expect';
import { describe } from 'vitest';

import { create } from 'zustand';
import { createNamespace, getNamespaceHooks, namespaced } from '../src/utils';

describe('Mixed types', () => {
  it('should work with mixed types', () => {
    const subNamespace = createNamespace('subNamespace', () => ({
      data: 'Initial SubNamespace Data',
    }));

    const namespace1 = createNamespace(
      'namespace1',
      namespaced(
        (state) => () => ({
          data: 'Initial Data',
          ...state,
        }),
        {
          namespaces: [subNamespace],
        }
      ),
      {
        flatten: true,
      }
    );

    const namespace2 = createNamespace('namespace2', () => ({
      data: 'Initial Data',
    }));

    const store = create(
      namespaced(
        (state) => () => ({
          data: 'Initial Data',
          ...state,
        }),
        {
          namespaces: [namespace1, namespace2],
        }
      )
    );

    expectType<{
      data: string;
      namespace1_data: string;
      namespace1_subNamespace: { data: string };
      namespace2: { data: string };
    }>(store.getState());

    const { namespace1: useNamespace1, namespace2: useNamespace2 } =
      getNamespaceHooks(store, namespace1, namespace2);

    expectType<string>(useNamespace1.getState().data);
    expectType<string>(useNamespace1.getState().subNamespace.data);
    expectType<string>(useNamespace2.getState().data);

    const { subNamespace: useSubNamespace } = getNamespaceHooks(
      useNamespace1,
      subNamespace
    );

    expectType<string>(useSubNamespace.getState().data);
  });
});
