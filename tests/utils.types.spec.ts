import { expect, test, describe } from 'vitest';
import { expectType } from 'ts-expect';
import type { TypeEqual } from 'ts-expect';

import {
  transformStateCreatorArgs,
  getPrefixedObject,
  getUnprefixedObject,
  divide,
  divisionHook,
  divisionHooks,
  stateToDivision,
  divisionToState,
  createDivision,
} from '../src/utils';
import { StoreApi, StateCreator, create, UseBoundStore } from 'zustand';
import { FilterByPrefix, PrefixObject, Division } from '../src/types';

type State = {
  user_name: string;
  user_age: number;
  admin_level: number;
};

type UserDivision = Division<FilterByPrefix<'user', State>, 'user'>;

type AdminDivision = {
  prefix: 'admin';
  creator: StateCreator<FilterByPrefix<'admin', State>>;
};

describe('transformStateCreatorArgs', () => {
  test('should transform state creator arguments', () => {
    const mockDivision: UserDivision = {
      prefix: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const originalArgs: Parameters<StateCreator<State>> = [
      () => {},
      () => ({} as State),
      {} as StoreApi<State>,
    ];

    const transformedArgs = transformStateCreatorArgs(
      mockDivision,
      ...originalArgs
    );

    expect(transformedArgs).toBeDefined();
    expectType<
      TypeEqual<typeof transformedArgs, Parameters<typeof mockDivision.creator>>
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

describe('divide', () => {
  test('should create a state creator with divisions', () => {
    const userDivision: UserDivision = {
      prefix: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const adminDivision: AdminDivision = {
      prefix: 'admin',
      creator: () => ({
        level: 1,
      }),
    };

    const combinedCreator = create(divide([userDivision, adminDivision]));

    expectType<
      StateCreator<
        FilterByPrefix<'user', State> & FilterByPrefix<'admin', State>
      >
    >(combinedCreator);
  });

  test('the set method inside divide s hould be of type SetState', () => {
    const userDivision: UserDivision = {
      prefix: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const adminDivision: AdminDivision = {
      prefix: 'admin',
      creator: () => ({
        level: 1,
      }),
    };

    create(
      divide([userDivision, adminDivision], (set) => {
        expectType<StoreApi<State>['setState']>(set);
        return {};
      })
    );
  });

  test('should infer the divide type', () => {
    const userDivision = createDivision(() => ({
      prefix: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    }));

    const adminDivision = createDivision(() => ({
      prefix: 'admin',
      creator: () => ({
        level: 1,
      }),
    }));

    const useStore = create(
      divide([userDivision(), adminDivision()], () => ({
        admin_level: 1,
      }))
    );

    expectType<UseBoundStore<StoreApi<State>>>(useStore);
  });
});

describe('divisionHook', () => {
  test('should create a division hook', () => {
    const userDivision: UserDivision = {
      prefix: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const useStore = create<State>(
      divide([userDivision], () => ({
        admin_level: 1,
      }))
    );

    const hook = divisionHook(useStore, userDivision);

    expect(hook).toBeDefined();
    expectType<UseBoundStore<StoreApi<FilterByPrefix<'user', State>>>>(hook);
  });
});

describe('divisionHooks', () => {
  test('should create multiple division hooks', () => {
    const userDivision: UserDivision = {
      prefix: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const adminDivision: AdminDivision = {
      prefix: 'admin',
      creator: () => ({
        level: 1,
      }),
    };

    const useStore = create<State>(
      divide([userDivision, adminDivision], () => ({
        admin_level: 1,
      }))
    );

    const [useUser, useAdmin] = divisionHooks(
      useStore,
      userDivision,
      adminDivision
    );

    expect(useUser).toBeDefined();
    expect(useAdmin).toBeDefined();

    expectType<UseBoundStore<StoreApi<FilterByPrefix<'user', State>>>>(useUser);
    expectType<UseBoundStore<StoreApi<FilterByPrefix<'admin', State>>>>(
      useAdmin
    );
  });
});

describe('stateToDivision', () => {
  test('should extract division from state', () => {
    const userDivision: UserDivision = {
      prefix: 'user',
      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const state: State = {
      user_name: 'Alice',
      user_age: 25,
      admin_level: 1,
    };

    const division = stateToDivision(userDivision, state);

    expect(division).toEqual({
      name: 'Alice',
      age: 25,
    });

    expectType<FilterByPrefix<'user', State>>(division);
  });
});

describe('divisionToState', () => {
  test('should add prefix to division state', () => {
    const userDivision: UserDivision = {
      prefix: 'user',

      creator: () => ({
        name: 'Alice',
        age: 25,
      }),
    };

    const state = { name: 'Alice', age: 25 };

    const divisiondState = divisionToState(userDivision, state);

    expect(divisiondState).toEqual({
      user_name: 'Alice',
      user_age: 25,
    });

    expectType<PrefixObject<'user', typeof state>>(divisiondState);
  });
});

describe('createDivision', () => {
  test('should create a division definition', () => {
    const createTestDivision = createDivision<{ key: string }>()(() => ({
      prefix: 'test',
      creator: () => ({
        key: 'value',
      }),
    }));

    const result = createTestDivision();

    expect(result).toBeDefined();
    expectType<ReturnType<typeof createTestDivision>>(result);

    expect(result.prefix).toBe('test');
    expect(result.creator).toBeDefined();
  });

  test('should create a division definition with options', () => {
    const createTestDivision = createDivision<
      { key: string },
      { option: string }
    >()(() => ({
      prefix: 'test',
      creator: () => ({
        key: 'value',
      }),
      options: {
        option: 'value',
      },
    }));

    const result = createTestDivision();

    expect(result).toBeDefined();
    expectType<ReturnType<typeof createTestDivision>>(result);

    expect(result.prefix).toBe('test');
    expect(result.creator).toBeDefined();
    expect(result.options).toEqual({ option: 'value' });
  });
});
