/**
 * Storage utility module for managing Chrome storage API interactions
 * and local data persistence.
 * 
 * Provides a unified interface for:
 * - Chrome Local Storage (persistent across sessions)
 * - Chrome Sync Storage (synchronized across devices)
 * - In-memory caching (temporary data)
 */

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG = {
  storageType: 'local', // 'local' or 'sync'
  enableCache: true,
  cacheTTL: 3600000, // 1 hour in milliseconds
  maxRetries: 3,
  retryDelay: 100, // milliseconds
};

/**
 * In-memory cache for frequently accessed data
 */
const memoryCache = new Map();

/**
 * Storage utility class for managing data persistence
 */
class StorageManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isInitialized = false;
  }

  /**
   * Initialize the storage manager
   * Checks Chrome storage API availability
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.warn('Chrome storage API not available. Using in-memory storage only.');
        this.isInitialized = true;
        return;
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize storage manager:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate storage API based on configuration
   * @returns {Object} Chrome storage API object
   */
  _getStorageAPI() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return null;
    }
    return this.config.storageType === 'sync' 
      ? chrome.storage.sync 
      : chrome.storage.local;
  }

  /**
   * Get data from storage with automatic fallback and caching
   * @param {string|Array<string>} keys - Key(s) to retrieve
   * @param {Object} options - Optional configuration overrides
   * @returns {Promise<Object>} Retrieved data
   */
  async get(keys, options = {}) {
    const config = { ...this.config, ...options };
    
    // Check memory cache first if enabled
    if (config.enableCache) {
      const cachedData = this._getFromCache(keys);
      if (cachedData) return cachedData;
    }

    const storage = this._getStorageAPI();
    if (!storage) {
      return this._getFromMemoryStorage(keys);
    }

    try {
      return await this._retryOperation(
        () => new Promise((resolve, reject) => {
          storage.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              if (config.enableCache) {
                this._setInCache(result);
              }
              resolve(result);
            }
          });
        }),
        config.maxRetries,
        config.retryDelay
      );
    } catch (error) {
      console.error('Error retrieving from storage:', error);
      return this._getFromMemoryStorage(keys);
    }
  }

  /**
   * Set data in storage
   * @param {Object} items - Key-value pairs to store
   * @param {Object} options - Optional configuration overrides
   * @returns {Promise<void>}
   */
  async set(items, options = {}) {
    const config = { ...this.config, ...options };
    
    // Update memory storage immediately
    this._setInMemoryStorage(items);

    // Update memory cache
    if (config.enableCache) {
      this._setInCache(items);
    }

    const storage = this._getStorageAPI();
    if (!storage) {
      return;
    }

    try {
      await this._retryOperation(
        () => new Promise((resolve, reject) => {
          storage.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }),
        config.maxRetries,
        config.retryDelay
      );
    } catch (error) {
      console.error('Error saving to storage:', error);
      throw error;
    }
  }

  /**
   * Remove data from storage
   * @param {string|Array<string>} keys - Key(s) to remove
   * @param {Object} options - Optional configuration overrides
   * @returns {Promise<void>}
   */
  async remove(keys, options = {}) {
    const config = { ...this.config, ...options };
    
    // Remove from memory storage
    this._removeFromMemoryStorage(keys);

    // Remove from cache
    this._removeFromCache(keys);

    const storage = this._getStorageAPI();
    if (!storage) {
      return;
    }

    try {
      await this._retryOperation(
        () => new Promise((resolve, reject) => {
          storage.remove(keys, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }),
        config.maxRetries,
        config.retryDelay
      );
    } catch (error) {
      console.error('Error removing from storage:', error);
      throw error;
    }
  }

  /**
   * Clear all data from storage
   * @param {Object} options - Optional configuration overrides
   * @returns {Promise<void>}
   */
  async clear(options = {}) {
    const config = { ...this.config, ...options };
    
    // Clear memory storage
    this._clearMemoryStorage();

    // Clear cache
    memoryCache.clear();

    const storage = this._getStorageAPI();
    if (!storage) {
      return;
    }

    try {
      await this._retryOperation(
        () => new Promise((resolve, reject) => {
          storage.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }),
        config.maxRetries,
        config.retryDelay
      );
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Get all data from storage
   * @param {Object} options - Optional configuration overrides
   * @returns {Promise<Object>} All stored data
   */
  async getAll(options = {}) {
    const config = { ...this.config, ...options };
    
    const storage = this._getStorageAPI();
    if (!storage) {
      return this._getAllFromMemoryStorage();
    }

    try {
      return await this._retryOperation(
        () => new Promise((resolve, reject) => {
          storage.get(null, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              if (config.enableCache) {
                this._setInCache(result);
              }
              resolve(result);
            }
          });
        }),
        config.maxRetries,
        config.retryDelay
      );
    } catch (error) {
      console.error('Error retrieving all data from storage:', error);
      return this._getAllFromMemoryStorage();
    }
  }

  /**
   * Watch for changes in storage
   * @param {Function} callback - Callback function when storage changes
   * @returns {Function} Unsubscribe function
   */
  onChanged(callback) {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return () => {};
    }

    const listener = (changes, areaName) => {
      if (areaName === this.config.storageType) {
        callback(changes);
        // Invalidate cache on external changes
        Object.keys(changes).forEach(key => {
          memoryCache.delete(key);
        });
      }
    };

    chrome.storage.onChanged.addListener(listener);

    // Return unsubscribe function
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }

  /**
   * Migrate data from one storage type to another
   * @param {string} fromType - Source storage type ('local' or 'sync')
   * @param {string} toType - Destination storage type ('local' or 'sync')
   * @returns {Promise<void>}
   */
  async migrate(fromType, toType) {
    const currentType = this.config.storageType;
    
    try {
      // Temporarily switch to source storage
      this.config.storageType = fromType;
      const data = await this.getAll();

      // Switch to destination storage
      this.config.storageType = toType;
      await this.set(data);

      // Restore original storage type
      this.config.storageType = currentType;
    } catch (error) {
      this.config.storageType = currentType;
      console.error('Error during storage migration:', error);
      throw error;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Get data from memory cache
   * @private
   */
  _getFromCache(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const result = {};
    let foundAll = true;

    keysArray.forEach(key => {
      const cached = memoryCache.get(key);
      if (cached && !this._isCacheExpired(cached)) {
        result[key] = cached.value;
      } else {
        foundAll = false;
        memoryCache.delete(key);
      }
    });

    return foundAll ? result : null;
  }

  /**
   * Set data in memory cache
   * @private
   */
  _setInCache(items) {
    const now = Date.now();
    Object.entries(items).forEach(([key, value]) => {
      memoryCache.set(key, {
        value,
        timestamp: now,
      });
    });
  }

  /**
   * Remove data from cache
   * @private
   */
  _removeFromCache(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => memoryCache.delete(key));
  }

  /**
   * Check if cache entry has expired
   * @private
   */
  _isCacheExpired(cacheEntry) {
    return Date.now() - cacheEntry.timestamp > this.config.cacheTTL;
  }

  /**
   * Retry operation with exponential backoff
   * @private
   */
  async _retryOperation(operation, maxRetries, retryDelay) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }
    
    throw lastError;
  }

  // ==================== In-Memory Storage Fallback ====================

  /**
   * Fallback in-memory storage when Chrome storage API is unavailable
   * @private
   */
  _inMemoryStorage = {};

  /**
   * Get from in-memory storage
   * @private
   */
  _getFromMemoryStorage(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    const result = {};
    
    keysArray.forEach(key => {
      if (key in this._inMemoryStorage) {
        result[key] = this._inMemoryStorage[key];
      }
    });
    
    return result;
  }

  /**
   * Set in in-memory storage
   * @private
   */
  _setInMemoryStorage(items) {
    Object.assign(this._inMemoryStorage, items);
  }

  /**
   * Remove from in-memory storage
   * @private
   */
  _removeFromMemoryStorage(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => {
      delete this._inMemoryStorage[key];
    });
  }

  /**
   * Get all from in-memory storage
   * @private
   */
  _getAllFromMemoryStorage() {
    return { ...this._inMemoryStorage };
  }

  /**
   * Clear in-memory storage
   * @private
   */
  _clearMemoryStorage() {
    this._inMemoryStorage = {};
  }
}

/**
 * Create and export a singleton instance
 */
const storageManager = new StorageManager();

/**
 * Helper functions for common storage operations
 */
export const Storage = {
  /**
   * Initialize storage manager
   */
  async init(config) {
    const instance = new StorageManager(config);
    await instance.initialize();
    return instance;
  },

  /**
   * Use the default storage manager instance
   */
  getInstance() {
    return storageManager;
  },

  /**
   * Get data from storage
   */
  async get(keys, options) {
    await storageManager.initialize();
    return storageManager.get(keys, options);
  },

  /**
   * Set data in storage
   */
  async set(items, options) {
    await storageManager.initialize();
    return storageManager.set(items, options);
  },

  /**
   * Remove data from storage
   */
  async remove(keys, options) {
    await storageManager.initialize();
    return storageManager.remove(keys, options);
  },

  /**
   * Clear all storage
   */
  async clear(options) {
    await storageManager.initialize();
    return storageManager.clear(options);
  },

  /**
   * Get all data from storage
   */
  async getAll(options) {
    await storageManager.initialize();
    return storageManager.getAll(options);
  },

  /**
   * Watch for storage changes
   */
  onChanged(callback) {
    return storageManager.onChanged(callback);
  },
};

export default Storage;
export { StorageManager };
