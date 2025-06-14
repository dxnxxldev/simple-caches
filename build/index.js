/**
 * TTLCache is a custom Map-like class that supports TTL (Time To Live) functionality.
 * It allows items to be stored with an expiration time and automatically removes expired items.
 *
 * @template K - The type of the key
 * @template V - The type of the value
 */
export class TTLCache extends Map {
    interval;
    expirationTimes;
    expirationInterval;
    /**
     * Starts the expiration interval if it's not already active.
     * It checks periodically if any items have expired and removes them from the cache.
     */
    startExpirationInterval() {
        if (!this.expirationInterval && this.expirationTimes.size > 0 && this.interval > 0) {
            this.expirationInterval = setInterval(() => {
                const now = Date.now();
                this.expirationTimes.forEach((ttl, key) => {
                    if (now > ttl) {
                        this.expirationTimes.delete(key);
                        super.delete(key);
                    }
                });
                if (!this.expirationTimes.size) {
                    clearInterval(this.expirationInterval);
                    this.expirationInterval = undefined;
                }
            }, this.interval);
        }
    }
    ;
    /**
     * Constructs a TTLCache instance with an optional expiration interval.
     * If a non-zero interval is provided, the expiration check will run periodically.
     *
     * @param interval - The interval (in milliseconds) for checking expired items.
     */
    constructor(interval = 0) {
        super();
        this.interval = interval;
        this.expirationTimes = new Map();
        this.expirationInterval = undefined;
        if (this.interval > 0)
            this.startExpirationInterval();
    }
    /**
     * Sets a value in the cache with an optional TTL (Time To Live).
     * The item will expire after the specified TTL and be automatically removed.
     *
     * @param key - The key of the item to set.
     * @param data - The value associated with the key.
     * @param ttl - The time-to-live (TTL) for the item in milliseconds. Defaults to the interval.
     * @returns The TTLCache instance.
     */
    set(key, data, ttl = this.interval) {
        super.set(key, data);
        const expirationTime = Date.now() + ttl;
        this.expirationTimes.set(key, expirationTime);
        this.startExpirationInterval();
        return this;
    }
    ;
    /**
     * Gets a value from the cache. If the item has expired, it is removed from the cache.
     *
     * @param key - The key of the item to retrieve.
     * @returns The value associated with the key or `undefined` if the item has expired.
     */
    get(key) {
        const expirationTime = this.expirationTimes.get(key);
        if (expirationTime && Date.now() > expirationTime) {
            this.expirationTimes.delete(key);
            super.delete(key);
            return undefined;
        }
        return super.get(key);
    }
    ;
    /**
     * Deletes a value from the cache.
     *
     * @param key - The key of the item to delete.
     * @returns `true` if the item was deleted, `false` otherwise.
     */
    delete(key) {
        this.expirationTimes.delete(key);
        return super.delete(key);
    }
    ;
    /**
     * Clears the entire cache, including expiration times.
     */
    clear() {
        this.expirationTimes.clear();
        super.clear();
    }
    ;
}
/**
 * LRUCache is a custom Map-like class that implements a Least Recently Used (LRU) cache.
 * It automatically evicts the least recently accessed item when the cache reaches its capacity.
 *
 * @template K - The type of the key.
 * @template V - The type of the value.
 */
export class LRUCache extends Map {
    capacity;
    /**
     * Constructs a LRUCache instance with a specified capacity.
     * Once the cache reaches the given capacity, the least recently used item will be evicted when adding new items.
     *
     * @param capacity - The maximum number of items the cache can hold before eviction. Defaults to 100.
     */
    constructor(capacity = 100) {
        super();
        this.capacity = capacity;
    }
    ;
    /**
     * Retrieves a value from the cache. If the item exists, it is moved to the end to mark it as the most recently used.
     * If the item does not exist, it returns `undefined`.
     *
     * @param key - The key of the item to retrieve.
     * @returns The value associated with the key or `undefined` if the item does not exist in the cache.
     */
    get(key) {
        const value = super.get(key);
        if (!value)
            return undefined;
        super.delete(key);
        super.set(key, value);
        return value;
    }
    ;
    /**
     * Sets a value in the cache. If the cache exceeds its capacity, the least recently used item will be removed.
     *
     * @param key - The key of the item to set.
     * @param value - The value associated with the key.
     * @returns The LRUCache instance.
     */
    set(key, value) {
        if (super.size >= this.capacity) {
            const value = super.keys().next().value;
            if (value) {
                super.delete(value);
            }
        }
        super.set(key, value);
        return this;
    }
    ;
}
/**
 * A simple Redis-based cache with TTL support.
 * @template K The type of cache keys.
 * @template V The type of cached values.
 */
export class REDISCache {
    identifier;
    redis;
    /**
     * Initializes the Redis cache.
     * @param redis The Redis client instance.
     * @param identifier A unique prefix for cache keys.
     */
    constructor(redis, identifier) {
        this.identifier = identifier;
        this.redis = redis;
    }
    ;
    /**
     * Retrieves a value from the cache.
     * @param key The key to retrieve.
     * @returns The cached value, or undefined if not found.
     */
    async get(key) {
        try {
            const value = await this.redis.get(`${this.identifier}:${key}`);
            return value ? JSON.parse(value) : undefined;
        }
        catch (error) {
            console.error(error);
            return undefined;
        }
    }
    ;
    /**
     * Stores a value in the cache.
     * @param key The key to store the value under.
     * @param value The value to store.
     * @param ttl Optional TTL (in seconds). If 0, the value does not expire.
     * @returns True if the value was stored successfully, false otherwise.
     */
    async set(key, value, ttl = 0) {
        try {
            if (ttl > 0) {
                await this.redis.set(`${this.identifier}:${key}`, JSON.stringify(value), {
                    expiration: {
                        type: "EX",
                        value: ttl,
                    },
                });
            }
            else {
                await this.redis.set(`${this.identifier}:${key}`, JSON.stringify(value));
            }
            return true;
        }
        catch (error) {
            console.error(error);
            return false;
        }
    }
    ;
    /**
     * Deletes a value from the cache.
     * @param key The key to delete.
     * @returns True if the key was deleted, false otherwise.
     */
    async delete(key) {
        try {
            return (await this.redis.del(`${this.identifier}:${key}`)) === 1;
        }
        catch (error) {
            console.error(error);
            return false;
        }
    }
    ;
    /**
     * Checks if a key exists in the cache.
     * @param key The key to check.
     * @returns True if the key exists, false otherwise.
     */
    async has(key) {
        try {
            return (await this.redis.exists(`${this.identifier}:${key}`)) === 1;
        }
        catch (error) {
            console.error(error);
            return false;
        }
    }
    ;
    /**
     * Retrieves all stored values in the cache.
     * @returns An array of cached values.
     */
    async values() {
        try {
            const keys = await this.redis.keys(`${this.identifier}:*`);
            const values = [];
            for (const key of keys) {
                const value = await this.redis.get(key);
                if (value)
                    values.push(JSON.parse(value));
            }
            return values;
        }
        catch (error) {
            console.error(error);
            return [];
        }
    }
    ;
    /**
     * Clears all cache entries under the given identifier.
     */
    async clear() {
        try {
            const keys = await this.redis.keys(`${this.identifier}:*`);
            if (keys.length > 0)
                await this.redis.del(keys);
        }
        catch (err) {
            console.error(err);
        }
    }
    ;
    /**
     * Gets the number of stored keys in the cache.
     * @returns The number of cached entries.
     */
    async size() {
        try {
            return (await this.redis.keys(`${this.identifier}:*`)).length;
        }
        catch (error) {
            console.error(error);
            return 0;
        }
    }
    ;
}
