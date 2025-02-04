import { KVClock } from "./helpers";
import {
  KVGetOptions,
  KVListOptions,
  KVListResult,
  KVPutOptions,
  KVPutValueType,
  KVStorageNamespace,
  KVValue,
  KVValueWithMetadata,
} from "./namespace";
import { KVStorage } from "./storage";

export interface FilteredKVStorageNamespaceOptions {
  readOnly?: boolean;
  include?: RegExp[];
  exclude?: RegExp[];
}

export class FilteredKVStorageNamespace extends KVStorageNamespace {
  readonly #options: FilteredKVStorageNamespaceOptions;

  constructor(
    storage: KVStorage,
    options: FilteredKVStorageNamespaceOptions = {},
    clock?: KVClock
  ) {
    super(storage, clock);
    this.#options = options;
  }

  #isIncluded(key: string): boolean {
    if (this.#options.include?.length) {
      return this.#options.include.some((regexp) => key.match(regexp));
    }
    if (this.#options.exclude?.length) {
      return !this.#options.exclude.some((regexp) => key.match(regexp));
    }
    return true;
  }

  async get(key: string, options?: KVGetOptions): KVValue<any> {
    return (await this.getWithMetadata(key, options as any)).value;
  }

  async getWithMetadata<Metadata = unknown>(
    key: string,
    options?: KVGetOptions
  ): KVValueWithMetadata<any, Metadata> {
    if (!this.#isIncluded(key)) return { value: null, metadata: null };
    return super.getWithMetadata(key, options as any);
  }

  async put(
    key: string,
    value: KVPutValueType,
    options?: KVPutOptions
  ): Promise<void> {
    if (this.#options.readOnly) {
      throw new TypeError("Unable to put into read-only namespace");
    }
    return super.put(key, value, options);
  }

  async delete(key: string): Promise<void> {
    if (this.#options.readOnly) {
      throw new TypeError("Unable to delete from read-only namespace");
    }
    return super.delete(key);
  }

  async list(options?: KVListOptions): Promise<KVListResult> {
    const { keys, list_complete, cursor } = await super.list(options);
    return {
      keys: keys.filter((key) => this.#isIncluded(key.name)),
      list_complete,
      cursor,
    };
  }
}
