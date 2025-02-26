import { expect, test, describe } from 'vitest';
import { expectType } from 'ts-expect';
import type { TypeEqual } from 'ts-expect';

import {
  transformStateCreatorArgs,
  getPrefixedObject,
  getUnprefixedObject,
  namespaced,
  createNamespace,
  toNamespace,
  fromNamespace,
  getNamespaceHooks,
} from '../src/utils';
import { StoreApi, StateCreator, create, UseBoundStore } from 'zustand';
import {
  ExtractNamespace,
  FilterByPrefix,
  Namespace,
  PrefixObject,
  ToNamespace,
  UseBoundNamespace,
} from '../src/types';
import { temporal, TemporalState } from 'zundo';
import { persist } from 'zustand/middleware';

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
      (set) => ({
        data: 'Initial Data',
      }),
      {
        flatten: true,
      }
    );

    const namespace2 = createNamespace<Namespace2>()('namespace2', (set) => ({
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
