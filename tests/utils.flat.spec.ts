import { describe, expect, it } from 'vitest';
import { createNamespace, namespaced } from '../src/utils';
import { create } from 'zustand';

describe('utils', () => {
  it('should be able to flatten if needed', () => {
    const n1 = createNamespace('n1', () => ({ key: 'value' }));

    const n2 = createNamespace('n2', () => ({ key: 'value' }), {
      flatten: true,
      separator: '_',
    });

    const store = create(
      namespaced((state) => () => ({ key: 'value', ...state }), {
        namespaces: [n1, n2],
      })
    );
  });
});
