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
  namespacePath?: Namespace<any, any, any, any, any, any>[];
  _traversed?: boolean;
  _payloadByNamespace?: Record<string, any>;
  _initializing?: boolean;
};

export type ExtractNamespace<T> = T extends Namespace<
  infer U,
  infer N,
  any,
  any,
  infer F,
  infer S
>
  ? F extends true
    ? PrefixObject<N, U, S>
    : { [K in N]: U }
  : never;
export type ExtractNamespaces<
  T extends readonly Namespace<any, string, any, any, any, any>[]
> = UnionToIntersection<ExtractNamespace<T[number]>>;

type NamespaceOptions<Flatten extends boolean, Separator extends string> = {
  /**
   * Whether to flatten the namespace.
   */
  flatten?: Flatten;

  /**
   * The separator to use when flattening the namespace.
   */
  separator?: Separator;
};

export type Namespace<
  T = any,
  Name extends string = string,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
  Flatten extends boolean = false,
  Separator extends string = '_'
> = {
  name: Name;
  creator: StateCreator<T, Mps, Mcs>;
  options?: NamespaceOptions<Flatten, Separator>;
};

export type PrefixObject<Name extends string, U, Separator extends string> = {
  [K in keyof U as `${Name}${Separator}${K & string}`]: U[K];
};

/**
 * Extracts all types that match the prefix, not altering the key names.
 */
export type IncludeByPrefix<
  Prefix extends string,
  T,
  Separator extends string
> = {
  [K in keyof T as K extends `${Prefix}${Separator}${string}`
    ? K
    : never]: T[K];
};

/**
 * Extracts all types that match the prefix, removing the prefix from the key names.
 */
export type FilterByPrefix<
  Prefix extends string,
  T,
  Separator extends string
> = {
  [K in keyof T as K extends `${Prefix}${Separator}${infer V}`
    ? V
    : never]: T[K];
};

/**
 * Excludes all types that match the prefix, not altering the key names.
 */
export type ExcludeByPrefix<
  Prefix extends string,
  T,
  Separator extends string
> = {
  [K in keyof T as K extends `${Prefix}${Separator}${string}`
    ? never
    : K]: T[K];
};

export type ToNamespace<
  State,
  N extends string,
  F extends boolean,
  S extends string
> = F extends true
  ? FilterByPrefix<N, State, S>
  : N extends keyof State
  ? State[N]
  : never;

export type FromNamespace<
  State,
  N extends string,
  F extends boolean,
  S extends string
> = F extends true ? PrefixObject<N, State, S> : { [K in N]: State };

export type UnionToIntersection<U> = (
  U extends any ? (arg: U) => void : never
) extends (arg: infer I) => void
  ? I
  : never;

type Readonly<T extends object> = {
  readonly [K in keyof T]: T[K];
};

export type UnNamespacedState<
  T,
  Namespaces extends readonly [...Namespace<any, string, any, any, any, any>[]]
> = Namespaces extends [
  infer First extends Namespace<any, string, any, any, any, any>,
  ...infer Rest extends Namespace<any, string, any, any, any, any>[]
]
  ? First extends Namespace<any, infer N, any, any, infer F, infer S>
    ? FromNamespace<UnNamespacedState<T, Rest>, N, F, S>
    : never
  : T;

export type NamespacedState<
  T,
  Namespaces extends readonly [...Namespace<any, string, any, any, any, any>[]]
> = Namespaces extends [
  infer First extends Namespace<any, string, any, any, any, any>,
  ...infer Rest extends Namespace<any, string, any, any, any, any>[]
]
  ? First extends Namespace<any, infer N, any, any, infer F, infer S>
    ? NamespacedState<ToNamespace<T, N, F, S>, Rest>
    : never
  : T;

export type UseBoundNamespace<
  S extends Readonly<StoreApi<unknown>>,
  Namespaces extends readonly [...Namespace<any, string, any, any, any, any>[]]
> = UseBoundStore<S> & {
  getRawState: () => UnNamespacedState<ExtractState<S>, Namespaces>;
  /**
   * The path of namespaces to get to root store. (e.g. ['namespace1','subNamespace1'])
   */
  namespacePath: Namespaces;
};

export type MergeMs<
  S,
  Ms extends [StoreMutatorIdentifier, unknown][],
  // eslint-disable-next-line
  Current = S
> = Ms extends [[infer M, infer A], ...infer Rest]
  ? Rest extends [StoreMutatorIdentifier, unknown][]
    ? M extends keyof StoreMutators<S, A>
      ? MergeMs<S, Rest, Current & StoreMutators<S, A>[M]>
      : Current
    : Current
  : Current;

export type Write<T, U> = Omit<T, keyof U> & U;
export type WithNamespaces<S, A> = A extends Namespace<
  any,
  string,
  any,
  any,
  any,
  any
>[]
  ? Write<
      S,
      {
        namespaces: {
          [NS in A[number] as NS extends Namespace<
            any,
            infer N,
            any,
            any,
            any,
            any
          >
            ? N extends string
              ? N
              : never
            : never]: NS extends Namespace<
            infer T,
            any,
            any,
            infer Mcs,
            any,
            any
          >
            ? MergeMs<StoreApi<T>, Mcs>
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
    Namespaces extends readonly Namespace<any, string, any, any, any, any>[],
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
  >(
    creator: (
      namespacedState: ExtractNamespaces<Namespaces>
    ) => StateCreator<T, [...Mps, ['zustand-namespaces', Namespaces]], Mcs, T>,
    options: {
      namespaces: Namespaces;
    }
  ): StateCreator<T, Mps, [['zustand-namespaces', Namespaces], ...Mcs]>;
  <
    T extends ExtractNamespaces<Namespaces>,
    Namespaces extends readonly Namespace<any, string, any, any, any, any>[],
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
    Mcs extends [StoreMutatorIdentifier, unknown][] = [],
    Flatten extends boolean = false,
    Separator extends string = '_'
  >(
    name: Name,
    creator: StateCreator<T, [], Mcs, T>,
    options?: NamespaceOptions<Flatten, Separator>
  ): Namespace<T, Name, Mps, Mcs, Flatten, Separator>;
  // explicit
  <T>(): <
    Name extends string,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = [],
    Flatten extends boolean = false,
    Separator extends string = '_'
  >(
    name: Name,
    creator: StateCreator<T, [], Mcs>,
    options?: NamespaceOptions<Flatten, Separator>
  ) => Namespace<T, Name, Mps, Mcs, Flatten, Separator>;
};
