# Milestone 020: Settings and Persistence

**Status:** Approved  
**Depends on:** 019  
**Owns:** Local settings, tutorial state, codecs, and storage fallback  
**Production-file budget:** 8

## Deliver

Add sound, music, speech, animation, timer, contrast, and accessibility settings
plus tutorial state. Implement versioned codecs, browser storage, migrations,
corrupt-data recovery, an in-memory fallback, and a non-blocking failure notice.

Use `localStorage` for settings and tutorial state. IndexedDB needs a later
approved volume requirement. The browser adapter alone calls storage. When
storage is blocked, full, corrupt, or unavailable, continue through an in-memory
adapter and show a non-blocking notice that changes will not persist.

## Verify and stop

Codec tests cover round trip and migration. Browser tests cover reload, corrupt
data, quota and security exceptions, fallback, and notice behavior. Storage
failure never blocks setup or play. `npm run ci` passes. Stop before audio
output, speech output, AI, or tutorial content.
