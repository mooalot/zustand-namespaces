import { expectType } from 'ts-expect';
import { describe } from 'vitest';

import { create } from 'zustand';
import { createNamespace, namespaced } from '../src/utils';

describe('Mixed types', () => {
  it('should work with mixed types', () => {
    const namespace1 = createNamespace(
      'namespace1',
      () => ({
        data: 'Initial Data',
      }),
      {
        flatten: true,
      }
    );

    const namespace2 = createNamespace('namespace2', () => ({
      data: 'Initial Data',
    }));

    const store = create(
      namespaced(
        (state) => (set) => ({
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
      namespace2: { data: string };
    }>(store.getState());
  });
});
