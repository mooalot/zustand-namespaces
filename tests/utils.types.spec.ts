// import { expect, test, describe } from 'vitest';
// import { expectType } from 'ts-expect';
// import type { TypeEqual } from 'ts-expect';

// import {
//   transformStateCreatorArgs,
//   getPrefixedObject,
//   getUnprefixedObject,
//   namespaced,
//   createNamespace,
//   toNamespace,
//   fromNamespace,
//   getNamespaceHooks,
// } from '../src/utils';
// import { StoreApi, StateCreator, create, UseBoundStore } from 'zustand';
// import {
//   FilterByPrefix,
//   Namespace,
//   PrefixObject,
//   UseBoundNamespace,
// } from '../src/types';

// type State = {
//   user_name: string;
//   user_age: number;
//   admin_level: number;
// };

// type UserNamespace = Namespace<FilterByPrefix<'user', State>, 'user'>;

// type AdminNamespace = Namespace<FilterByPrefix<'admin', State>, 'admin'>;

// describe('transformStateCreatorArgs', () => {
//   test('should transform state creator arguments', () => {
//     const mockNamespace: UserNamespace = {
//       name: 'user',
//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     };

//     const originalArgs: Parameters<StateCreator<State>> = [
//       () => {},
//       () => ({} as State),
//       {} as StoreApi<State>,
//     ];

//     const transformedArgs = transformStateCreatorArgs(
//       mockNamespace,
//       ...originalArgs
//     );

//     expect(transformedArgs).toBeDefined();
//     expectType<
//       TypeEqual<
//         typeof transformedArgs,
//         Parameters<typeof mockNamespace.creator>
//       >
//     >(true);
//   });
// });

// describe('getPrefixedObject', () => {
//   test('should prefix object keys', () => {
//     const obj = { name: 'Alice', age: 25 };
//     const prefixedObj = getPrefixedObject('user', obj);

//     expect(prefixedObj).toEqual({
//       user_name: 'Alice',
//       user_age: 25,
//     });

//     expectType<TypeEqual<typeof prefixedObj, PrefixObject<'user', typeof obj>>>(
//       true
//     );
//   });
// });

// describe('getUnprefixedObject', () => {
//   test('should remove prefix from object keys', () => {
//     const obj = { user_name: 'Alice', user_age: 25 };
//     const unprefixedObj = getUnprefixedObject('user', obj);

//     expect(unprefixedObj).toEqual({
//       name: 'Alice',
//       age: 25,
//     });

//     expectType<
//       TypeEqual<typeof unprefixedObj, FilterByPrefix<'user', typeof obj>>
//     >(true);
//   });
// });

// describe('divide', () => {
//   test('should create a state creator with namespaces', () => {
//     const userNamespace: UserNamespace = {
//       name: 'user',
//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     };

//     const adminNamespace: AdminNamespace = {
//       name: 'admin',
//       creator: () => ({
//         level: 1,
//       }),
//     };

//     const combinedCreator = create(
//       namespaced(userNamespace, adminNamespace)(() => ({}))
//     );

//     expectType<
//       StateCreator<
//         FilterByPrefix<'user', State> & FilterByPrefix<'admin', State>
//       >
//     >(combinedCreator);
//   });

//   test('the set method inside divide s hould be of type SetState', () => {
//     const userNamespace: UserNamespace = {
//       name: 'user',
//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     };

//     const adminNamespace: AdminNamespace = {
//       name: 'admin',
//       creator: () => ({
//         level: 1,
//       }),
//     };

//     create(
//       namespaced(
//         userNamespace,
//         adminNamespace
//       )((set) => {
//         expectType<StoreApi<State>['setState']>(set);
//         return {};
//       })
//     );
//   });

//   test('should infer the divide type', () => {
//     const userNamespace = createNamespace(() => ({
//       name: 'user',
//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     }));

//     const adminNamespace = createNamespace(() => ({
//       name: 'admin',
//       creator: () => ({
//         level: 1,
//       }),
//     }));

//     const useStore = create(
//       namespaced(
//         userNamespace,
//         adminNamespace
//       )(() => ({
//         admin_level: 1,
//       }))
//     );

//     expectType<UseBoundStore<StoreApi<State>>>(useStore);
//   });
// });

// describe('namespaceHook', () => {
//   test('should create a namespace hook', () => {
//     const userNamespace: UserNamespace = {
//       name: 'user',
//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     };

//     const useStore = create<State>()(
//       namespaced(userNamespace)(() => ({
//         admin_level: 1,
//       }))
//     );

//     const [hook] = getNamespaceHooks(useStore, userNamespace);

//     expect(hook).toBeDefined();
//     expectType<UseBoundNamespace<StoreApi<FilterByPrefix<'user', State>>, any>>(
//       hook
//     );
//   });
// });

// describe('namespaceHooks', () => {
//   test('should create multiple namespace hooks', () => {
//     const userNamespace: UserNamespace = {
//       name: 'user',
//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     };

//     const adminNamespace: AdminNamespace = {
//       name: 'admin',
//       creator: () => ({
//         level: 1,
//       }),
//     };

//     const useStore = create<State>()(
//       namespaced(
//         userNamespace,
//         adminNamespace
//       )(() => ({
//         admin_level: 1,
//       }))
//     );

//     const [useUser, useAdmin] = getNamespaceHooks(
//       useStore,
//       userNamespace,
//       adminNamespace
//     );

//     expect(useUser).toBeDefined();
//     expect(useAdmin).toBeDefined();

//     expectType<UseBoundNamespace<StoreApi<FilterByPrefix<'user', State>>, any>>(
//       useUser
//     );
//     expectType<
//       UseBoundNamespace<StoreApi<FilterByPrefix<'admin', State>>, any>
//     >(useAdmin);
//   });
// });

// describe('stateToNamespace', () => {
//   test('should extract namespace from state', () => {
//     const userNamespace: UserNamespace = {
//       name: 'user',
//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     };

//     const state: State = {
//       user_name: 'Alice',
//       user_age: 25,
//       admin_level: 1,
//     };

//     const namespace = toNamespace(state, userNamespace);

//     expect(namespace).toEqual({
//       name: 'Alice',
//       age: 25,
//     });

//     expectType<FilterByPrefix<'user', State>>(namespace);
//   });
// });

// describe('namespaceToState', () => {
//   test('should add prefix to namespace state', () => {
//     const userNamespace: UserNamespace = {
//       name: 'user',

//       creator: () => ({
//         name: 'Alice',
//         age: 25,
//       }),
//     };

//     const state = { name: 'Alice', age: 25 };

//     const namespacedState = fromNamespace(state, userNamespace);

//     expect(namespacedState).toEqual({
//       user_name: 'Alice',
//       user_age: 25,
//     });

//     expectType<PrefixObject<'user', typeof state>>(namespacedState);
//   });
// });

// describe('createNamespace', () => {
//   test('should create a namespace definition', () => {
//     const testNamespace = createNamespace<{ key: string }>()(() => ({
//       name: 'test',
//       creator: () => ({
//         key: 'value',
//       }),
//     }));

//     expect(testNamespace).toBeDefined();
//     expect(testNamespace.name).toBe('test');
//     expect(testNamespace.creator).toBeDefined();
//   });

//   test('should create a namespace definition with options', () => {
//     const testNamespace = createNamespace<
//       { key: string },
//       { option: string }
//     >()(() => ({
//       name: 'test',
//       creator: () => ({
//         key: 'value',
//       }),
//       options: {
//         option: 'value',
//       },
//     }));

//     expect(testNamespace).toBeDefined();
//     expectType<typeof testNamespace>(testNamespace);

//     expect(testNamespace.name).toBe('test');
//     expect(testNamespace.creator).toBeDefined();
//     expect(testNamespace.options).toEqual({ option: 'value' });
//   });

//   test('should create have typed raw state', () => {
//     const subNamespace = createNamespace(() => ({
//       name: 'subNamespace',
//       creator: () => ({ key: 'value' }),
//     }));
//     const namespace = createNamespace(() => ({
//       name: 'namespace',
//       creator: namespaced(subNamespace)(() => ({ key: 'value' })),
//     }));

//     const useStore = create(
//       namespaced(namespace)(() => ({
//         key: 'value',
//       }))
//     );

//     const [useNamespaceStore] = getNamespaceHooks(useStore, namespace);
//     const [usesubNamespaceStore] = getNamespaceHooks(
//       useNamespaceStore,
//       subNamespace
//     );

//     expectType<string>(useNamespaceStore.getRawState().namespace_key);
//     expectType<string>(
//       useNamespaceStore.getRawState().namespace_subNamespace_key
//     );
//     expectType<string>(
//       usesubNamespaceStore.getRawState().namespace_subNamespace_key
//     );
//   });
// });
