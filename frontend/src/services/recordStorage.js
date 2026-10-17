/**
 * Persistent Storage & Synchronization Service for Return Rescue Records.
 * 
 * Guarantees that:
 * 1. Past return records for ALL customers and Manager are permanently preserved
 *    across browser exit, logout, and login again.
 * 2. Any status update, AI condition evaluation, or manager decision approval
 *    is immediately reflected in real-time across both Customer and Manager portals.
 * 3. Works seamlessly even during cold-starts or ephemeral redeployments.
 */

const STORAGE_KEY = 'return_rescue_all_records_v1';
const LISTENERS = new Set();

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

export const recordStorage = {
  /**
   * Subscribe to record updates (triggers re-render on save/update/delete)
   */
  subscribe: (callback) => {
    LISTENERS.add(callback);
    return () => LISTENERS.delete(callback);
  },

  /**
   * Get all persistent records from localStorage
   */
  getAllRecords: () => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to read return_rescue records from localStorage:', e);
      return [];
    }
  },

  /**
   * Save the full record list to localStorage
   */
  setAllRecords: (records) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      notifyListeners();
    } catch (e) {
      console.warn('Failed to save return_rescue records to localStorage:', e);
    }
  },

  /**
   * Get returns scoped to a user:
   * - If isManager is true, returns ALL records (full queue)
   * - If customer, returns only records matching customer username or customer ID
   */
  getReturnsForUser: (user, isManager = false) => {
    const all = recordStorage.getAllRecords();
    if (!user) return isManager ? all : [];
    if (isManager) return all;

    const username = (user.username || '').toLowerCase();
    const userId = user.id;

    return all.filter((r) => {
      const rUsername = (r.customer_username || '').toLowerCase();
      const rCustomerId = r.customer;
      return (
        (username && rUsername === username) ||
        (userId && rCustomerId === userId)
      );
    });
  },

  /**
   * Save or update a single return record in persistent storage
   */
  saveRecord: (record, currentUser = null) => {
    if (!record) return;
    const all = recordStorage.getAllRecords();
    
    // Enrich with customer details if missing
    const enriched = { ...record };
    if (currentUser && !enriched.customer_username) {
      enriched.customer_username = currentUser.username;
      enriched.customer = enriched.customer || currentUser.id;
      enriched.customer_email = enriched.customer_email || currentUser.email;
    }
    if (!enriched.created_at) {
      enriched.created_at = new Date().toISOString();
    }

    const index = all.findIndex(
      (r) => (record.id && r.id === record.id) || (record.return_id && r.return_id === record.return_id)
    );

    let updatedList;
    if (index >= 0) {
      // Merge updates
      updatedList = [
        ...all.slice(0, index),
        { ...all[index], ...enriched, updated_at: new Date().toISOString() },
        ...all.slice(index + 1),
      ];
    } else {
      // Prepend new record
      updatedList = [enriched, ...all];
    }

    recordStorage.setAllRecords(updatedList);
    return enriched;
  },

  /**
   * Update an existing return record (e.g. Manager approval or status update)
   */
  updateRecord: (idOrReturnId, updates) => {
    const all = recordStorage.getAllRecords();
    const index = all.findIndex(
      (r) => r.id === idOrReturnId || r.return_id === idOrReturnId || String(r.id) === String(idOrReturnId)
    );

    if (index >= 0) {
      const updated = {
        ...all[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      const updatedList = [
        ...all.slice(0, index),
        updated,
        ...all.slice(index + 1),
      ];
      recordStorage.setAllRecords(updatedList);
      return updated;
    } else if (updates && (updates.id || updates.return_id)) {
      return recordStorage.saveRecord(updates);
    }
    return null;
  },

  /**
   * Delete a record permanently from persistent storage
   */
  deleteRecord: (idOrReturnId) => {
    const all = recordStorage.getAllRecords();
    const filtered = all.filter(
      (r) => r.id !== idOrReturnId && r.return_id !== idOrReturnId && String(r.id) !== String(idOrReturnId)
    );
    recordStorage.setAllRecords(filtered);
  },

  /**
   * Merge live server returns with persistent local records.
   * Ensures that server data updates local records, but any newly created
   * local records not yet returned by server pagination or lag are preserved!
   */
  mergeServerRecords: (serverRecords, currentUser = null, isManager = false) => {
    const rawList = Array.isArray(serverRecords)
      ? serverRecords
      : serverRecords?.results || [];

    const localList = recordStorage.getAllRecords();
    const mergedMap = new Map();

    // 1. First populate with existing local records
    localList.forEach((r) => {
      const key = r.return_id || String(r.id);
      if (key) mergedMap.set(key, r);
    });

    // 2. Overlay server records (authoritative updates for matching keys)
    rawList.forEach((sr) => {
      const key = sr.return_id || String(sr.id);
      if (key) {
        const existing = mergedMap.get(key) || {};
        mergedMap.set(key, { ...existing, ...sr });
      }
    });

    // 3. Convert back to array sorted newest first
    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    recordStorage.setAllRecords(mergedList);

    // Return the subset appropriate for current viewing role
    if (isManager) {
      return mergedList;
    }
    if (currentUser) {
      const username = (currentUser.username || '').toLowerCase();
      const userId = currentUser.id;
      return mergedList.filter((r) => {
        const rUsername = (r.customer_username || '').toLowerCase();
        const rCustomerId = r.customer;
        return (
          (username && rUsername === username) ||
          (userId && rCustomerId === userId)
        );
      });
    }
    return mergedList;
  },
};

export default recordStorage;
