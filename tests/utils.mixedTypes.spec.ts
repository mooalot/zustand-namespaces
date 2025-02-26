import { expectType } from 'ts-expect';
import { describe } from 'vitest';

import { create } from 'zustand';
import { createNamespace, namespaced } from '../src/utils';

type Namespace1 = {
  data: string;
};

type Namespace2 = {
  data: string;
};

describe('Mixed types', () => {
  it('should work with mixed types', () => {
    const namespace1 = createNamespace<Namespace1>()(
      'namespace1',
      () => ({
        data: 'Initial Data',
      }),
      {
        flatten: true,
      }
    );

    const namespace2 = createNamespace<Namespace2>()('namespace2', () => ({
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
      namespace2: { data: string };
    }>(store.getState());
  });
});
