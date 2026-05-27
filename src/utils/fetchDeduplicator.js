// src/utils/fetchDeduplicator.js
class FetchDeduplicator {
  constructor() {
    this.pendingRequests = new Map()
  }

  async dedupe(key, fetchFn) {
    // If there's already a pending request for this key, return it
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 Deduplicating request for: ${key}`)
      return this.pendingRequests.get(key)
    }

    // Create new promise
    const promise = fetchFn().finally(() => {
      // Remove from pending after completion
      this.pendingRequests.delete(key)
    })

    // Store promise
    this.pendingRequests.set(key, promise)
    
    return promise
  }

  clear() {
    this.pendingRequests.clear()
  }
}

export const fetchDeduplicator = new FetchDeduplicator()

// Usage in your jobs service:
import { fetchDeduplicator } from '../utils/fetchDeduplicator'

const getJobs = async () => {
  return fetchDeduplicator.dedupe('jobs', async () => {
    const { data, error } = await supabase.from('jobs').select('*')
    if (error) throw error
    return data
  })
}
