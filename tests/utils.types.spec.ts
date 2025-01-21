import { expect, test, describe } from 'vitest';
import { expectType } from 'ts-expect';
import type { TypeEqual } from 'ts-expect';

import {
  transformStateCreatorArgs,
  getPrefixedObject,
  getUnprefixedObject,
  slicer,
  sliceHook,
  sliceHooks,
  stateToSlice,
  sliceToState,
  createSlice,
} from '../src/utils';
import { StoreApi, StateCreator, create } from 'zustand';
import {
  FilterByPrefix,
  PrefixObject,
  Slice,
  UseBoundSlice,
} from '../src/types';

type State = {
  user_name: string;
  user_age: number;
  admin_level: number;
};

type UserSlice = Slice<'user', FilterByPrefix<'user', State>>;

type AdminSlice = {
  prefix: 'admin';
  creator: StateCreator<FilterByPrefix<'admin', State>>;
};

describe('transformStateCreatorArgs', () => {
  test('should transform state creator arguments', () => {
    const mockSlice: UserSlice = {
      prefix: 'user',
      creator: (set, get) => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const originalArgs: Parameters<StateCreator<State>> = [
      (fn) => {},
      () => ({} as State),
      {} as StoreApi<State>,
    ];

    const transformedArgs = transformStateCreatorArgs(
      mockSlice,
      ...originalArgs
    );

    expect(transformedArgs).toBeDefined();
    expectType<
      TypeEqual<typeof transformedArgs, Parameters<typeof mockSlice.creator>>
    >(true);
  });
});

describe('getPrefixedObject', () => {
  test('should prefix object keys', () => {
    const obj = { name: 'Alice', age: 25 };
    const prefixedObj = getPrefixedObject('user', obj);

    expect(prefixedObj).toEqual({
      user_name: 'Alice',
      user_age: 25,
    });

    expectType<TypeEqual<typeof prefixedObj, PrefixObject<'user', typeof obj>>>(
      true
    );
  });
});

describe('getUnprefixedObject', () => {
  test('should remove prefix from object keys', () => {
    const obj = { user_name: 'Alice', user_age: 25 };
    const unprefixedObj = getUnprefixedObject('user', obj);

    expect(unprefixedObj).toEqual({
      name: 'Alice',
      age: 25,
    });

    expectType<
      TypeEqual<typeof unprefixedObj, FilterByPrefix<'user', typeof obj>>
    >(true);
  });
});

describe('slicer', () => {
  test('should create a state creator with slices', () => {
    const userSlice: UserSlice = {
      prefix: 'user',
      creator: (set, get) => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const adminSlice: AdminSlice = {
      prefix: 'admin',
      creator: (set, get) => ({
        level: 1,
      }),
    };

    const combinedCreator = create(
      slicer((set, get) => ({}), [userSlice, adminSlice])
    );

    expectType<
      StateCreator<
        FilterByPrefix<'user', State> & FilterByPrefix<'admin', State>
      >
    >(combinedCreator);
  });
});

describe('sliceHook', () => {
  test('should create a slice hook', () => {
    const userSlice: UserSlice = {
      prefix: 'user',
      creator: (set, get) => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const useStore = create<State>(
      slicer(
        (set, get) => ({
          admin_level: 1,
        }),
        [userSlice]
      )
    );

    const hook = sliceHook(useStore, userSlice);

    expect(hook).toBeDefined();
    expectType<UseBoundSlice<FilterByPrefix<'user', State>>>(hook);
  });
});

describe('sliceHooks', () => {
  test('should create multiple slice hooks', () => {
    const userSlice: UserSlice = {
      prefix: 'user',
      creator: (set, get) => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const adminSlice: AdminSlice = {
      prefix: 'admin',
      creator: (set, get) => ({
        level: 1,
      }),
    };

    const useStore = create<State>(
      slicer(
        (set, get) => ({
          admin_level: 1,
        }),
        [userSlice, adminSlice]
      )
    );

    const [useUser, useAdmin] = sliceHooks(useStore, userSlice, adminSlice);

    expect(useUser).toBeDefined();
    expect(useAdmin).toBeDefined();

    expectType<UseBoundSlice<FilterByPrefix<'user', State>>>(useUser);
    expectType<UseBoundSlice<FilterByPrefix<'admin', State>>>(useAdmin);
  });
});

describe('stateToSlice', () => {
  test('should extract slice from state', () => {
    const userSlice: UserSlice = {
      prefix: 'user',
      creator: (set, get) => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const state: State = {
      user_name: 'Alice',
      user_age: 25,
      admin_level: 1,
    };

    const slice = stateToSlice(userSlice, state);

    expect(slice).toEqual({
      name: 'Alice',
      age: 25,
    });

    expectType<FilterByPrefix<'user', State>>(slice);
  });
});

describe('sliceToState', () => {
  test('should add prefix to slice state', () => {
    const userSlice: UserSlice = {
      prefix: 'user',

      creator: (set, get) => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const state = { name: 'Alice', age: 25 };

    const slicedState = sliceToState(userSlice, state);

    expect(slicedState).toEqual({
      user_name: 'Alice',
      user_age: 25,
    });

    expectType<PrefixObject<'user', typeof state>>(slicedState);
  });
});

describe('createSlice', () => {
  test('should create a slice definition', () => {
    const createTestSlice = createSlice<{ key: string }>()(() => ({
      prefix: 'test',
      creator: () => ({
        key: 'value',
      }),
    }));

    const result = createTestSlice();

    expect(result).toBeDefined();
    expectType<ReturnType<typeof createTestSlice>>(result);

    expect(result.prefix).toBe('test');
    expect(result.creator).toBeDefined();
  });

  test('should create a slice definition with options', () => {
    const createTestSlice = createSlice<{ key: string }, { option: string }>()(
      () => ({
        prefix: 'test',
        creator: () => ({
          key: 'value',
        }),
        options: {
          option: 'value',
        },
      })
    );

    const result = createTestSlice();

    expect(result).toBeDefined();
    expectType<ReturnType<typeof createTestSlice>>(result);

    expect(result.prefix).toBe('test');
    expect(result.creator).toBeDefined();
    expect(result.options).toEqual({ option: 'value' });
  });
});
