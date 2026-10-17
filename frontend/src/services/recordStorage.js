/**
 * Persistent Storage & Synchronization Service for Return Rescue Records.
 * 
 * Guarantees that:
 * 1. Strict per-user isolation: Each customer account only ever sees their own return requests.
 *    Customer A's returns are stored in `return_rescue_customer_records_<userA>`, and
 *    Customer B's returns are stored in `return_rescue_customer_records_<userB>`.
 * 2. Managers retain full operational visibility over all returns via `return_rescue_manager_records`.
 * 3. Past return records are permanently preserved across browser exit, logout, and login.
 * 4. Status updates, AI condition evaluations, and manager decisions sync immediately.
 * 5. Legacy unpartitioned data is automatically cleaned up to prevent cross-account leakage.
 */

const LEGACY_STORAGE_KEY = 'return_rescue_all_records_v1';
const MANAGER_STORAGE_KEY = 'return_rescue_manager_records';
const LISTENERS = new Set();

// Clean up legacy unpartitioned storage key if present
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get partitioned storage key for a user
 */
function getStorageKey(user, isManager = false) {
  if (isManager) return MANAGER_STORAGE_KEY;
  if (user && user.username) {
    const cleanUsername = String(user.username).trim().toLowerCase();
    return `return_rescue_customer_records_${cleanUsername}`;
  }
  return null;
}

/**
 * Notify all subscribed React components that records have updated.
 */
function notifyListeners() {
  LISTENERS.forEach((callback) => {
    try {
      callback();
    } catch (e) {
      console.error('Error notifying recordStorage listener:', e);
    }
  });
}

/**
 * Helper to safely read records from a given key
 */
function readStorage(key) {
  if (typeof window === 'undefined' || !key) return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn(`Failed to read records from localStorage (${key}):`, e);
    return [];
  }
}

/**
 * Helper to safely write records to a given key
 */
function writeStorage(key, records) {
  if (typeof window === 'undefined' || !key) return;
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch (e) {
    console.warn(`Failed to write records to localStorage (${key}):`, e);
  }
}

export const recordStorage = {
  /**
   * Subscribe to record updates (triggers re-render on save/update/delete)
   */
  subscribe: (callback) => {
    LISTENERS.add(callback);
    return () => LISTENERS.delete(callback);
  },

  /**
   * Get all persistent records:
   * - If isManager is true, returns all records from manager queue
   * - If user is provided, returns user's records from their partition
   * - If no user and not manager, returns empty array (strict safety)
   */
  getAllRecords: (user = null, isManager = false) => {
    if (isManager) {
      return readStorage(MANAGER_STORAGE_KEY);
    }
    if (user && user.username) {
      const key = getStorageKey(user, false);
      return readStorage(key);
    }
    return [];
  },

  /**
   * Set records for manager or a specific user
   */
  setAllRecords: (records, user = null, isManager = false) => {
    const key = getStorageKey(user, isManager);
    if (key) {
      writeStorage(key, records);
      notifyListeners();
    }
  },

  /**
   * Get returns scoped to a user:
   * - If isManager is true, returns ALL records (full queue)
   * - If customer, returns strictly records matching customer username or customer ID
   *   from their isolated storage partition.
   */
  getReturnsForUser: (user, isManager = false) => {
    if (isManager) {
      return readStorage(MANAGER_STORAGE_KEY);
    }
    if (!user || !user.username) {
      return [];
    }

    const key = getStorageKey(user, false);
    const userRecords = readStorage(key);

    const username = (user.username || '').trim().toLowerCase();
    const userEmail = (user.email || '').trim().toLowerCase();
    const userId = user.id ? String(user.id) : null;

    // Strict user filtering
    return userRecords.filter((r) => {
      const rUsername = (r.customer_username || '').trim().toLowerCase();
      const rEmail = (r.customer_email || '').trim().toLowerCase();
      const rCustomerId = r.customer ? String(r.customer) : null;
      return (
        (username && rUsername === username) ||
        (userEmail && rEmail === userEmail) ||
        (userId && rCustomerId === userId)
      );
    });
  },

  /**
   * Save or update a single return record in persistent storage
   */
  saveRecord: (record, currentUser = null) => {
    if (!record) return;
    
    // Enrich with customer details if missing
    const enriched = { ...record };
    if (currentUser) {
      enriched.customer_username = enriched.customer_username || currentUser.username;
      enriched.customer = enriched.customer || currentUser.id;
      enriched.customer_email = enriched.customer_email || currentUser.email;
    }
    if (!enriched.created_at) {
      enriched.created_at = new Date().toISOString();
    }

    // 1. If we know the customer, save to their partitioned storage
    const targetUser = currentUser || (record.customer_username ? { username: record.customer_username } : null);
    if (targetUser && targetUser.username) {
      const userKey = getStorageKey(targetUser, false);
      const userList = readStorage(userKey);
      const idx = userList.findIndex(
        (r) => (record.id && r.id === record.id) || (record.return_id && r.return_id === record.return_id)
      );

      let updatedUserList;
      if (idx >= 0) {
        updatedUserList = [
          ...userList.slice(0, idx),
          { ...userList[idx], ...enriched, updated_at: new Date().toISOString() },
          ...userList.slice(idx + 1),
        ];
      } else {
        updatedUserList = [enriched, ...userList];
      }
      writeStorage(userKey, updatedUserList);
    }

    // 2. Also save to Manager queue storage for full operational visibility
    const mgrList = readStorage(MANAGER_STORAGE_KEY);
    const mgrIdx = mgrList.findIndex(
      (r) => (record.id && r.id === record.id) || (record.return_id && r.return_id === record.return_id)
    );
    let updatedMgrList;
    if (mgrIdx >= 0) {
      updatedMgrList = [
        ...mgrList.slice(0, mgrIdx),
        { ...mgrList[mgrIdx], ...enriched, updated_at: new Date().toISOString() },
        ...mgrList.slice(mgrIdx + 1),
      ];
    } else {
      updatedMgrList = [enriched, ...mgrList];
    }
    writeStorage(MANAGER_STORAGE_KEY, updatedMgrList);

    notifyListeners();
    return enriched;
  },

  /**
   * Update an existing return record (e.g. Manager approval or status update)
   */
  updateRecord: (idOrReturnId, updates) => {
    // 1. Update in Manager storage
    const mgrList = readStorage(MANAGER_STORAGE_KEY);
    const mgrIdx = mgrList.findIndex(
      (r) => r.id === idOrReturnId || r.return_id === idOrReturnId || String(r.id) === String(idOrReturnId)
    );

    let updatedRecord = null;
    if (mgrIdx >= 0) {
      updatedRecord = {
        ...mgrList[mgrIdx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const updatedMgrList = [
        ...mgrList.slice(0, mgrIdx),
        updatedRecord,
        ...mgrList.slice(mgrIdx + 1),
      ];
      writeStorage(MANAGER_STORAGE_KEY, updatedMgrList);
    }

    // 2. Also update in customer partition
    const customerUsername = updates?.customer_username || updatedRecord?.customer_username;
    if (customerUsername) {
      const userKey = `return_rescue_customer_records_${customerUsername.trim().toLowerCase()}`;
      const userList = readStorage(userKey);
      const userIdx = userList.findIndex(
        (r) => r.id === idOrReturnId || r.return_id === idOrReturnId || String(r.id) === String(idOrReturnId)
      );
      if (userIdx >= 0) {
        const updatedUserList = [
          ...userList.slice(0, userIdx),
          { ...userList[userIdx], ...updates, updated_at: new Date().toISOString() },
          ...userList.slice(userIdx + 1),
        ];
        writeStorage(userKey, updatedUserList);
      }
    }

    notifyListeners();
    return updatedRecord || updates;
  },

  /**
   * Delete a record permanently from persistent storage
   */
  deleteRecord: (idOrReturnId) => {
    // 1. Delete from Manager storage
    const mgrList = readStorage(MANAGER_STORAGE_KEY);
    const target = mgrList.find(
      (r) => r.id === idOrReturnId || r.return_id === idOrReturnId || String(r.id) === String(idOrReturnId)
    );
    const filteredMgr = mgrList.filter(
      (r) => r.id !== idOrReturnId && r.return_id !== idOrReturnId && String(r.id) !== String(idOrReturnId)
    );
    writeStorage(MANAGER_STORAGE_KEY, filteredMgr);

    // 2. Delete from Customer partition if found
    if (target?.customer_username) {
      const userKey = `return_rescue_customer_records_${target.customer_username.trim().toLowerCase()}`;
      const userList = readStorage(userKey);
      const filteredUser = userList.filter(
        (r) => r.id !== idOrReturnId && r.return_id !== idOrReturnId && String(r.id) !== String(idOrReturnId)
      );
      writeStorage(userKey, filteredUser);
    }

    notifyListeners();
  },

  /**
   * Merge live server returns with persistent partitioned records.
   * Ensures that server data updates records, but past local records are preserved.
   * Guarantees that customers ONLY see their own records.
   */
  mergeServerRecords: (serverRecords, currentUser = null, isManager = false) => {
    const rawList = Array.isArray(serverRecords)
      ? serverRecords
      : serverRecords?.results || [];

    // Case 1: Manager Queue (full operational view)
    if (isManager) {
      const localList = readStorage(MANAGER_STORAGE_KEY);
      const mergedMap = new Map();

      localList.forEach((r) => {
        const key = r.return_id || String(r.id);
        if (key) mergedMap.set(key, r);
      });

      rawList.forEach((sr) => {
        const key = sr.return_id || String(sr.id);
        if (key) {
          const existing = mergedMap.get(key) || {};
          const pName = sr.product_name || sr.item_name || existing.product_name || existing.item_name || 'Returned Item';
          mergedMap.set(key, {
            ...existing,
            ...sr,
            product_name: pName,
            item_name: pName,
          });
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      writeStorage(MANAGER_STORAGE_KEY, mergedList);
      notifyListeners();
      return mergedList;
    }

    // Case 2: Customer Isolation (strict per-user partition)
    if (!currentUser || !currentUser.username) {
      // Never leak records when user is unknown or unauthenticated
      return [];
    }

    const username = currentUser.username.trim().toLowerCase();
    const userEmail = (currentUser.email || '').trim().toLowerCase();
    const userId = currentUser.id ? String(currentUser.id) : null;
    const userKey = `return_rescue_customer_records_${username}`;

    const localList = readStorage(userKey);
    const mergedMap = new Map();

    // Populate with existing user-scoped local records
    localList.forEach((r) => {
      const key = r.return_id || String(r.id);
      if (key) mergedMap.set(key, r);
    });

    // Filter server records strictly to this customer
    const filteredServerList = rawList.filter((sr) => {
      const rUsername = (sr.customer_username || '').trim().toLowerCase();
      const rEmail = (sr.customer_email || '').trim().toLowerCase();
      const rCustomerId = sr.customer ? String(sr.customer) : null;
      if (!rUsername && !rEmail && !rCustomerId) {
        // Authenticated customer endpoint returned it
        return true;
      }
      return (
        (username && rUsername === username) ||
        (userEmail && rEmail === userEmail) ||
        (userId && rCustomerId === userId)
      );
    });

    filteredServerList.forEach((sr) => {
      const key = sr.return_id || String(sr.id);
      if (key) {
        const existing = mergedMap.get(key) || {};
        const pName = sr.product_name || sr.item_name || existing.product_name || existing.item_name || 'Returned Item';
        mergedMap.set(key, {
          ...existing,
          ...sr,
          customer_username: sr.customer_username || currentUser.username,
          customer_email: sr.customer_email || currentUser.email,
          customer: sr.customer || currentUser.id,
          product_name: pName,
          item_name: pName,
        });
      }
    });

    const userMergedList = Array.from(mergedMap.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    writeStorage(userKey, userMergedList);
    notifyListeners();
    return userMergedList;
  },
};

export default recordStorage;
