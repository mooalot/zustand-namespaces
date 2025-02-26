import { expectType } from 'ts-expect';
import { describe } from 'vitest';

import { create } from 'zustand';
import { createNamespace, namespaced } from '../src/utils';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

describe('Mixed types', () => {
  it('should work with mixed types', () => {
    const namespace1 = createNamespace(
      'namespace1',
      persist(
        () => ({
          data: 'Initial Data',
        }),
        { name: 'namespace1' }
      ),
      {
        flatten: true,
      }
    );

    const namespace2 = createNamespace(
      'namespace2',
      temporal(() => ({
        data: 'Initial Data',
      }))
    );

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
      namespace2: { data: string };
    }>(store.getState());
  });
});
