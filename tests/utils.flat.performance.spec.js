import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import {
  createNamespace,
  fromNamespace,
  getNamespaceHooks,
  getPrefixedObject,
  getUnprefixedObject,
  namespaced,
  toNamespace,
} from '../src/utils';

function produceStore(useStore, produceFn) {
  return useStore.setState(produce(useStore.getState(), produceFn));
}

const count = 15;

describe('performance', () => {
  it('should be able to handle large state trees with a regular store', () => {
    //create 1 store with 110 keys
    let start = performance.now();
    const useStore = create(() => {
      return {
        ...Array.from(
          { length: count * count * count + count * count + count },
          (_, i) => ({
            [`key${i}`]: `value${i}`,
          })
        ).reduce((acc, cur) => ({ ...acc, ...cur }), {}),
      };
    });
    let end = performance.now();
    console.log('create store:', end - start);

    console.log('keycount:', Object.keys(useStore.getState()).length);
    //getting state
    start = performance.now();
    useStore.getState();
    end = performance.now();
    console.log('getState:', end - start);
    //setting state
    start = performance.now();
    useStore.setState((state) => ({
      key0: 'value0',
    }));
    end = performance.now();
    console.log('setState:', end - start);

    //setting state with immer
    start = performance.now();
    produceStore(useStore, (state) => {
      state.key0 = 'value1';
    });
    end = performance.now();
    console.log('setState immer:', end - start);
  });
  it('should be able to handle super large state trees', () => {
    let start = performance.now();
    // create 10 namespaces, each with 10 subnamespaces, each with 10 keys
    const subNamespaces = Array.from({ length: count }, (_, i) =>
      createNamespace(
        `subNamespace${i}`,
        () => {
          return {
            ...Array.from({ length: count }, (_, j) => ({
              [`key${j}`]: `value${j}`,
            })).reduce((acc, cur) => ({ ...acc, ...cur }), {}),
          };
        },
        { flatten: true }
      )
    );
    const namespaces = Array.from({ length: count }, (_, i) =>
      createNamespace(
        `namespace${i}`,
        namespaced(
          (state) => () => {
            return {
              ...state,
              ...Array.from({ length: count }, (_, j) => ({
                [`key${j}`]: `value${j}`,
              })).reduce((acc, cur) => ({ ...acc, ...cur }), {}),
            };
          },
          {
            namespaces: subNamespaces,
          }
        ),
        { flatten: true }
      )
    );

    const useStore = create(
      namespaced(
        (state) => () => {
          return {
            ...state,
            ...Array.from({ length: 10 }, (_, j) => ({
              [`key${j}`]: `value${j}`,
            })).reduce((acc, cur) => ({ ...acc, ...cur }), {}),
          };
        },
        { namespaces }
      )
    );
    let end = performance.now();
    console.log('create store:', end - start);

    console.log('keycount:', Object.keys(useStore.getState()).length);

    const { namespace0: useNamespaceStore } = getNamespaceHooks(
      useStore,
      namespaces[0]
    );
    const { subNamespace0: useSubNamespaceStore } = getNamespaceHooks(
      useNamespaceStore,
      subNamespaces[0]
    );

    //getting state
    start = performance.now();
    useStore.getState();
    end = performance.now();
    console.log('getState:', end - start);
    start = performance.now();
    useNamespaceStore.getState();
    end = performance.now();
    console.log('getNamespaceState:', end - start);
    start = performance.now();
    useSubNamespaceStore.getState();
    end = performance.now();
    console.log('getSubNamespaceState:', end - start);

    //setting state
    start = performance.now();
    useStore.setState({
      key0: 'value0',
    });
    expect(useStore.getState().key0).toEqual('value0');
    end = performance.now();
    console.log('setState:', end - start);
    start = performance.now();
    useNamespaceStore.setState({
      key0: 'value0',
    });
    expect(useNamespaceStore.getState().key0).toEqual('value0');
    end = performance.now();
    console.log('setNamespaceState:', end - start);
    start = performance.now();
    useSubNamespaceStore.setState({
      key0: 'value0',
    });
    expect(useSubNamespaceStore.getState().key0).toEqual('value0');
    end = performance.now();
    console.log('setSubNamespaceState:', end - start);

    //setting state with immer
    start = performance.now();
    produceStore(useStore, (state) => {
      state.key0 = 'value1';
    });
    expect(useStore.getState().key0).toEqual('value1');
    end = performance.now();
    console.log('setState immer:', end - start);
    start = performance.now();
    produceStore(useNamespaceStore, (state) => {
      state.key0 = 'value1';
    });
    expect(useNamespaceStore.getState().key0).toEqual('value1');
    end = performance.now();
    console.log('setNamespaceState immer:', end - start);
    start = performance.now();
    produceStore(useSubNamespaceStore, (state) => {
      state.key0 = 'value1';
    });
    expect(useSubNamespaceStore.getState().key0).toEqual('value1');
    end = performance.now();
    console.log('setSubNamespaceState immer:', end - start);
  });
});
