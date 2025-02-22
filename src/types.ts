import {
  ExtractState,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  StoreMutators,
  UseBoundStore,
} from 'zustand';

declare module 'zustand/vanilla' {
  interface StoreMutators<S, A> {
    'zustand-namespaces': WithNamespaces<S, A>;
  }
}

export type WithNames<T> = T & {
  namespaces: any;
  namespacePath?: Namespace[];
  _payload?: any;
};

export type ExtractNamespace<T> = ExtractNamespaceType<T>;
export type ExtractNamespaces<
  T extends readonly Namespace<any, string, any, any>[]
> = UnionToIntersection<ExtractNamespaceType<T[number]>>;

export type Namespace<
  T = any,
  Name extends string = string,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
> = {
  name: Name;
  creator: StateCreator<T, Mps, Mcs>;
};

export type PrefixObject<Name extends string, U> = {
  [K in keyof U as `${Name}_${K & string}`]: U[K];
};

/**
 * Extracts all types that match the prefix, not altering the key names.
 */
export type IncludeByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${string}` ? K : never]: T[K];
};

/**
 * Extracts all types that match the prefix, removing the prefix from the key names.
 */
export type FilterByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${infer V}` ? V : never]: T[K];
};

/**
 * Excludes all types that match the prefix, not altering the key names.
 */
export type ExcludeByPrefix<Prefix extends string, T> = {
  [K in keyof T as K extends `${Prefix}_${string}` ? never : K]: T[K];
};

type ExtractNamespaceType<T> = T extends Namespace<infer N, infer U, any, any>
  ? PrefixObject<U, N>
  : never;

export type UnionToIntersection<U> = (
  U extends any ? (arg: U) => void : never
) extends (arg: infer I) => void
  ? I
  : never;

type Readonly<T extends object> = {
  readonly [K in keyof T]: T[K];
};

type PrefixNamespaces<
  K extends string,
  Namespaces extends readonly [...Namespace<any, string, any, any>[]]
> = Namespaces extends [
  infer First extends Namespace<any, string, any, any>,
  ...infer Rest extends Namespace<any, string, any, any>[]
]
  ? `${First['name']}_${PrefixNamespaces<K, Rest>}`
  : K;

export type UnNamespacedState<
  T,
  Namespaces extends readonly [...Namespace<any, string, any, any>[]]
> = {
  [K in keyof T as PrefixNamespaces<K & string, Namespaces>]: T[K];
};

export type UnprefixNamespaces<
  K extends string,
  Namespaces extends readonly [...Namespace<any, string, any, any>[]]
> = Namespaces extends [
  infer First extends Namespace<any, string, any, any>,
  ...infer Rest extends Namespace<any, string, any, any>[]
]
  ? K extends `${First['name']}_${infer R}`
    ? UnprefixNamespaces<R, Rest>
    : never
  : K;

export type NamespacedState<
  T,
  Namespaces extends readonly [...Namespace<any, string, any, any>[]]
> = {
  [K in keyof T as UnprefixNamespaces<K & string, Namespaces>]: T[K];
};

export type UseBoundNamespace<
  S extends Readonly<StoreApi<unknown>>,
  Namespaces extends readonly [...Namespace<any, string, any, any>[]]
> = UseBoundStore<S> & {
  getRawState: () => UnNamespacedState<ExtractState<S>, Namespaces>;
  /**
   * The path of namespaces to get to root store. (e.g. ['subNamespace1', 'namespace1'])
   */
  namespacePath: Namespaces;
};

export type MergeMs<
  S,
  Ms extends [StoreMutatorIdentifier, unknown][],
  // eslint-disable-next-line
  Current = {}
> = Ms extends [[infer M, infer A], ...infer Rest]
  ? Rest extends [StoreMutatorIdentifier, unknown][]
    ? M extends keyof StoreMutators<S, A>
      ? MergeMs<
          S,
          Rest,
          Current & Omit<StoreMutators<S, A>[M], keyof StoreApi<any>>
        >
      : Current
    : Current
  : Current;

export type Write<T, U> = Omit<T, keyof U> & U;
export type WithNamespaces<S, A> = A extends Namespace<any, string, any, any>[]
  ? Write<
      S,
      {
        namespaces: {
          [NS in A[number] as NS extends Namespace<any, infer N, any, any>
            ? N extends string
              ? N
              : never
            : never]: NS extends Namespace<any, any, any, infer Mcs>
            ? MergeMs<S, Mcs>
            : // eslint-disable-next-line
              {};
        };
      }
    >
  : S;

export type Assert<T, Expected> = T extends Expected ? T : never;
export type Namespaced = {
  <
    T,
    Namespaces extends readonly Namespace<any, string, any, any>[],
    Excluded extends ExcludeByPrefix<Namespaces[number]['name'], T>,
    Result extends Excluded & ExtractNamespaces<Namespaces>,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    creator: (
      namespacedState: ExtractNamespaces<Namespaces>
    ) => StateCreator<
      Result,
      [...Mps, ['zustand-namespaces', Namespaces]],
      Mcs,
      Result
    >,
    options: {
      namespaces: Namespaces;
    }
  ): StateCreator<Result, Mps, [['zustand-namespaces', Namespaces], ...Mcs]>;
  <
    T extends ExtractNamespaces<Namespaces>,
    Namespaces extends readonly Namespace<any, string, any, any>[],
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(options: {
    namespaces: Namespaces;
  }): StateCreator<T, Mps, [['zustand-namespaces', Namespaces], ...Mcs], T> &
    Assert<T, ExtractNamespaces<Namespaces>>;
};

export type CreateNamespace = {
  // inferred
  <
    T,
    Name extends string,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    name: Name,
    creator: StateCreator<T, Mps, Mcs>
  ): Namespace<T, Name, Mps, Mcs>;
  // explicit
  <T>(): <
    Name extends string,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    name: Name,
    creator: StateCreator<T, Mps, Mcs>
  ) => Namespace<T, Name, Mps, Mcs>;
};
