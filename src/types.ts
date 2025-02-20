import {
  ExtractState,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  UseBoundStore,
} from 'zustand';

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
  Namespaces extends readonly [...Namespace[]]
> = Namespaces extends [
  infer First extends Namespace,
  ...infer Rest extends Namespace[]
]
  ? `${First['name']}_${PrefixNamespaces<K, Rest>}`
  : K;

type UnprefixNamespaces<
  K extends string,
  Namespaces extends readonly [...Namespace[]]
> = Namespaces extends [
  infer First extends Namespace,
  ...infer Rest extends Namespace[]
]
  ? K extends `${First['name']}_${infer R}`
    ? UnprefixNamespaces<R, Rest>
    : never
  : K;

export type UnNamespacedState<
  T,
  Namespaces extends readonly [...Namespace[]]
> = {
  [K in keyof T as PrefixNamespaces<K & string, Namespaces>]: T[K];
};

export type NamespacedState<T, Namespaces extends readonly [...Namespace[]]> = {
  [K in keyof T as UnprefixNamespaces<K & string, Namespaces>]: T[K];
};

export type UseBoundNamespace<
  S extends Readonly<StoreApi<unknown>>,
  Namespaces extends readonly [...Namespace[]]
> = UseBoundStore<S> & {
  getRawState: () => UnNamespacedState<ExtractState<S>, Namespaces>;
  namespaces: {
    [K in keyof Namespaces as Namespaces[K] extends Namespace<any, infer N>
      ? N
      : never]: {
      path: Namespaces;
    };
  };
  /**
   * The path of namespaces to get to root store
   */
  namespacePath: Namespaces;
};
