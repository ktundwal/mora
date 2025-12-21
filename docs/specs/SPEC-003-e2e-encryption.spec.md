# Specification: End-to-End Encryption (E2EE)

**Document ID:** SPEC-003  
**Created:** December 19, 2025  
**Status:** Draft  

---

## 1. Purpose & Scope

**Purpose:** Implement zero-knowledge end-to-end encryption so that all user-generated content is encrypted client-side before storage. Even the developer/operator cannot read user data.

**Scope:**
- ✅ **Included:** Client-side encryption, recovery phrase key management, multi-device sync via phrase, encrypted Firestore storage, AI calls from client
- ❌ **Excluded:** Server-side key escrow, encrypted search indexes, QR device linking (v2), local SLM integration (v2)

**Target User:** Privacy-conscious individuals sharing intimate relationship details who want assurance that their data is truly private.

**Success Metric:** 
- Developer queries Firestore → all content fields are Base64 gibberish
- User can recover full data access on new device using 24-word phrase

---

## 2. Definitions

| Term | Definition |
|------|------------|
| **Master Key** | 256-bit AES key used to encrypt/decrypt all user data |
| **Recovery Phrase** | 24-word BIP39-style mnemonic that deterministically derives the master key |
| **Device Passphrase** | Optional local password to unlock the key stored on a specific device |
| **Encrypted Field** | A string field containing Base64-encoded AES-256-GCM ciphertext |
| **Key Metadata** | Non-sensitive info about user's encryption setup (salt, version) stored in Firestore |
| **Zero-Knowledge** | Server never has access to plaintext content or master key |

---

## 3. Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| **REQ-E2E-001** | On first sign-in, system generates a 256-bit master key |
| **REQ-E2E-002** | System displays 24-word recovery phrase derived from master key |
| **REQ-E2E-003** | (Deferred) User must confirm recovery phrase by entering 3 random words |
| **REQ-E2E-004** | Master key is stored in IndexedDB (browser) encrypted with optional device passphrase |
| **REQ-E2E-005** | User can recover access on new device by entering 24-word phrase |
| **REQ-E2E-006** | All sensitive content fields are encrypted before Firestore write |
| **REQ-E2E-007** | All sensitive content fields are decrypted after Firestore read |
| **REQ-E2E-008** | User can set optional device passphrase for quick unlock |
| **REQ-E2E-009** | Logout clears master key from memory (IndexedDB retained unless explicit) |
| **REQ-E2E-010** | AI Unpack works: decrypt client-side → call Cloud Function → encrypt result |
| **REQ-E2E-011** | Lost recovery phrase = permanent data loss (by design, documented) |
| **REQ-E2E-012** | User can export decrypted data for personal backup |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-E2E-001** | Use AES-256-GCM (authenticated encryption) |
| **NFR-E2E-002** | Each encryption operation uses a unique random IV |
| **NFR-E2E-003** | Key derivation uses PBKDF2 with 100,000 iterations minimum |
| **NFR-E2E-004** | Encryption/decryption of 500 messages completes in < 2 seconds |
| **NFR-E2E-005** | Crypto operations use Web Crypto API (native, no external libs) |
| **NFR-E2E-006** | Recovery phrase uses BIP39 2048-word list for compatibility |
| **NFR-E2E-007** | Master key never transmitted over network |
| **NFR-E2E-008** | Master key never stored in localStorage (IndexedDB only) |

### Constraints

| ID | Constraint |
|----|------------|
| **CON-E2E-001** | Crypto utilities must live in `packages/core` (shared with future native apps) |
| **CON-E2E-002** | Must use Web Crypto API (available in browsers + React Native polyfill) |
| **CON-E2E-003** | Firestore security rules unchanged (still enforce uid ownership) |
| **CON-E2E-004** | Schema version bump required (v1 → v2) |
| **CON-E2E-005** | All existing data will be deleted (fresh start approved) |
| **CON-E2E-006** | AI calls move from Cloud Functions to client-side (Functions become API proxy) |

---

## 4. Data Model

### New Types (add to `packages/core/src/types.ts`)

```typescript
/** Marker type for encrypted string fields (Base64 ciphertext) */
export type EncryptedString = string;

/** Encrypted array of strings */
export type EncryptedStringArray = string; // JSON array, then encrypted

/** User's encryption key metadata (stored in Firestore, NOT the key itself) */
export interface UserKeyMetadata {
  uid: string;
  /** Salt used for key derivation (public, stored) */
  keySalt: string;
  /** Version of encryption scheme (for future migrations) */
  encryptionVersion: number;
  /** When encryption was first set up */
  keyCreatedAt: string;
  /** SHA-256 hash of recovery phrase for verification (not the phrase itself) */
  recoveryPhraseHash: string;
  schemaVersion: number;
}

/** Local device key storage (IndexedDB only, never Firestore) */
export interface DeviceKeyStore {
  /** User ID this key belongs to */
  uid: string;
  /** Master key encrypted with device passphrase (or raw if no passphrase) */
  encryptedMasterKey: string;
  /** Salt for passphrase-based key derivation */
  passphraseSalt: string;
  /** IV used for master key encryption */
  iv: string;
  /** Whether device passphrase is required to unlock */
  passphraseRequired: boolean;
  /** When key was stored on this device */
  storedAt: string;
}

/** Encryption envelope for a single field */
export interface EncryptedEnvelope {
  /** Base64-encoded ciphertext */
  ct: string;
  /** Base64-encoded IV (12 bytes for GCM) */
  iv: string;
  /** Encryption version for future-proofing */
  v: number;
}
```

### Fields to Encrypt by Collection

| Collection | Encrypted Fields | Unencrypted (for queries) |
|------------|-----------------|---------------------------|
| `users/{uid}` | (none - only metadata) | `uid`, `email`, `isPro`, timestamps |
| `users/{uid}/keyMetadata` | (none - only metadata) | `keySalt`, `encryptionVersion`, `recoveryPhraseHash` |
| `conversations/{id}` | `title`, `summary` | `uid`, `personId`, `status`, `messageCount`, timestamps |
| `conversations/{id}/messages/{id}` | `text`, `originalRaw` | `speaker`, `order`, `timestamp` |
| `people/{id}` | `displayName`, `importanceNote`, `profileNotes` | `uid`, `relationshipType`, timestamps |
| `people/{id}/entries/{id}` | `whatTheySaid`, `whatISaid`, `content` | `uid`, `type`, `why`, timestamps |
| `artifacts/{id}` | `title`, `transcript`, `sourceUrl` | `uid`, `type`, `conversationId`, timestamps |
| `unpacks/{id}` | `summary`, `keyPoints`, `triggers`, `harmfulActions`, `agencyCheck`, `dontSayList`, `customSections` | `uid`, `conversationId`, `modelUsed`, timestamps |
| `replyDrafts/{id}` | `content`, `editHistory`, `riskFlags`, `therapySpeakFlags` | `uid`, `conversationId`, `tone`, `isSent`, timestamps |
| `playbook/{id}` | `title`, `content` | `uid`, `type`, `tags`, `usageCount`, timestamps |

---

## 5. Architecture

### Encryption Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  1. User signs in (Google Auth)                                  │
│  2. Check IndexedDB for master key                               │
│     ├─ Found + no passphrase → unlock immediately               │
│     ├─ Found + passphrase → prompt for passphrase → decrypt     │
│     └─ Not found → redirect to /setup or /recover               │
│  3. Master key in memory for session                             │
│  4. On write: encrypt(plaintext, masterKey) → Firestore         │
│  5. On read: Firestore → decrypt(ciphertext, masterKey)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIRESTORE (Encrypted)                       │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    "title": "eyJjdCI6IkFCQ0QxMjM0Li4uIiwiaXYiOiIuLi4iLCJ2IjoxfQ",│
│    "summary": "eyJjdCI6IlhZWjk4NzYuLi4iLCJpdiI6Ii4uLiIsInYiOjF9",│
│    "uid": "abc123",           // NOT encrypted (for rules)       │
│    "status": "active",        // NOT encrypted (for queries)     │
│    "messageCount": 42,        // NOT encrypted (for display)     │
│    "createdAt": "2025-12-19"  // NOT encrypted (for sorting)     │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Generation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIRST-TIME SETUP (/setup)                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Generate 256-bit random master key (crypto.getRandomValues)  │
│  2. Convert key to 24-word recovery phrase (BIP39 encoding)      │
│  3. Display phrase: "Write these down. You WILL lose data        │
│     without them."                                               │
│  4. User confirms by typing words #3, #7, #12                    │
│  5. Optional: set device passphrase for quick unlock             │
│  6. Store key in IndexedDB:                                      │
│     - If passphrase: encrypt(masterKey, deriveKey(passphrase))  │
│     - If no passphrase: store raw (protected by browser)         │
│  7. Store metadata in Firestore:                                 │
│     - keySalt, encryptionVersion, recoveryPhraseHash             │
│  8. Redirect to /people                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Device Recovery Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVICE RECOVERY (/recover)                    │
├─────────────────────────────────────────────────────────────────┤
│  1. User signs in on new device                                  │
│  2. IndexedDB has no key for this uid                            │
│  3. Redirect to /recover                                         │
│  4. User enters 24-word recovery phrase                          │
│  5. Derive master key from phrase                                │
│  6. Verify: hash(phrase) matches stored recoveryPhraseHash       │
│  7. Optional: set device passphrase                              │
│  8. Store key in IndexedDB                                       │
│  9. Redirect to /people - all data decrypts normally             │
└─────────────────────────────────────────────────────────────────┘
```

### AI Processing Flow (Client-Side)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Load conversation + messages from Firestore                  │
│  2. Decrypt all content fields using master key                  │
│  3. Build prompt from plaintext                                  │
│  4. POST to Cloud Function (plaintext in request body)           │
│     └─ HTTPS encrypted in transit                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD FUNCTION (Proxy)                        │
├─────────────────────────────────────────────────────────────────┤
│  1. Validate auth token                                          │
│  2. Forward prompt to OpenAI/Anthropic (with API key)            │
│  3. Return AI response (plaintext)                               │
│  4. NO LOGGING of request/response content                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
├─────────────────────────────────────────────────────────────────┤
│  5. Receive AI response                                          │
│  6. Encrypt response fields using master key                     │
│  7. Save encrypted Unpack to Firestore                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. File Structure

### New Files

```
packages/core/src/
├── crypto/
│   ├── index.ts              # Public API exports
│   ├── key-generation.ts     # generateMasterKey(), keyToPhrase(), phraseToKey()
│   ├── encryption.ts         # encrypt(), decrypt() using AES-256-GCM
│   ├── recovery-phrase.ts    # BIP39 encoding/decoding
│   ├── wordlist.ts           # 2048-word BIP39 English wordlist
│   └── field-crypto.ts       # encryptFields(), decryptFields() for documents

apps/web/src/
├── lib/
│   └── crypto/
│       ├── key-store.ts      # IndexedDB operations for master key
│       ├── key-context.tsx   # React context: useCryptoKey(), CryptoProvider
│       └── crypto-guard.tsx  # Route guard: redirect if no key
├── app/(app)/
│   ├── setup/
│   │   └── page.tsx          # First-time encryption setup wizard
│   ├── unlock/
│   │   └── page.tsx          # Device passphrase unlock screen
│   └── recover/
│       └── page.tsx          # Recovery phrase input screen
```

### Modified Files

| File | Changes |
|------|---------|
| `packages/core/src/types.ts` | Add `EncryptedString`, `UserKeyMetadata`, `DeviceKeyStore`, `EncryptedEnvelope` |
| `packages/core/src/index.ts` | Export crypto module |
| `apps/web/src/lib/services/conversation-service.ts` | Encrypt/decrypt title, summary, messages |
| `apps/web/src/lib/services/person-service.ts` | Encrypt/decrypt displayName, notes |
| `apps/web/src/lib/services/entry-service.ts` | Encrypt/decrypt content fields |
| `apps/web/src/lib/auth-guard.tsx` | Add crypto key check before allowing access |
| `apps/web/src/app/(app)/layout.tsx` | Wrap with CryptoProvider |
| `apps/functions/src/index.ts` | Refactor AI functions to be API proxies only |

---

## 7. User Flows

### Flow 1: New User Setup

```
Google Sign-In
     │
     ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│  /setup     │────▶│ "Your data will be encrypted"           │
│  (Step 1)   │     │ "Only you can read it"                  │
└─────────────┘     │ [Generate My Encryption Key]            │
                    └─────────────────────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────────┐
                    │ "Write down your recovery phrase"        │
                    │                                          │
                    │  1. apple    7. brave   13. door  19. fox│
                    │  2. banana   8. crane   14. echo  20. gem│
                    │  ...                                     │
                    │                                          │
                    │ ⚠️ If you lose this, you lose your data │
                    │ [I've written it down]                   │
                    └─────────────────────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────────┐
                    │ "Confirm your phrase"                    │
                    │                                          │
                    │ Enter word #3: [________]                │
                    │ Enter word #7: [________]                │
                    │ Enter word #12: [________]               │
                    │                                          │
                    │ [Confirm]                                │
                    └─────────────────────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────────┐
                    │ "Set a device passphrase (optional)"     │
                    │                                          │
                    │ This lets you unlock quickly on this     │
                    │ device without your full phrase.         │
                    │                                          │
                    │ Passphrase: [________]                   │
                    │ Confirm:    [________]                   │
                    │                                          │
                    │ [Set Passphrase]  [Skip]                 │
                    └─────────────────────────────────────────┘
                                     │
                                     ▼
                              /people (app)
```

### Flow 2: Returning User (Same Device, With Passphrase)

```
Google Sign-In
     │
     ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│  /unlock    │────▶│ "Welcome back"                          │
│             │     │                                          │
│             │     │ Enter your passphrase:                   │
│             │     │ [________________]                       │
│             │     │                                          │
│             │     │ [Unlock]                                 │
│             │     │                                          │
│             │     │ Forgot passphrase? Use recovery phrase   │
└─────────────┘     └─────────────────────────────────────────┘
                                     │
                                     ▼
                              /people (app)
```

### Flow 3: New Device Recovery

```
Google Sign-In (new device)
     │
     ▼
No key in IndexedDB
     │
     ▼
┌─────────────┐     ┌─────────────────────────────────────────┐
│  /recover   │────▶│ "Recover your encrypted data"           │
│             │     │                                          │
│             │     │ Enter your 24-word recovery phrase:      │
│             │     │                                          │
│             │     │ [1.____] [2.____] [3.____] [4.____]      │
│             │     │ [5.____] [6.____] [7.____] [8.____]      │
│             │     │ ...                                      │
│             │     │                                          │
│             │     │ [Recover My Data]                        │
└─────────────┘     └─────────────────────────────────────────┘
                                     │
                                     ▼
                    (Optional: set device passphrase)
                                     │
                                     ▼
                              /people (app)
```

---

## 8. Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Server breach | Data is encrypted; attacker gets ciphertext only |
| Developer access | Developer cannot decrypt; no key escrow |
| Man-in-middle | HTTPS for all traffic; encryption is additional layer |
| Browser storage access | IndexedDB is origin-restricted; optional passphrase adds layer |
| Weak passphrase | PBKDF2 with 100k iterations; passphrase is convenience, not security |
| Lost recovery phrase | User education; no recovery possible (by design) |
| XSS attack | Standard XSS prevention; key in memory only during session |

### What We Don't Protect Against

- **Compromised device**: If attacker has full device access, they can keylog
- **User sharing**: If user shares recovery phrase, they share data access
- **AI provider**: During AI calls, plaintext is sent to OpenAI/Anthropic (HTTPS encrypted)

### Audit Points

- [ ] Master key never in localStorage
- [ ] Master key never in Firestore
- [ ] Master key never in Cloud Function logs
- [ ] All network traffic over HTTPS
- [ ] IV is unique per encryption operation
- [ ] Recovery phrase hash, not phrase, stored in Firestore

---

## 9. Migration Plan

### Phase 1: Fresh Start (Approved)

Since existing data deletion is approved:

1. Announce to existing users: "We're implementing E2EE. Please export any data you need."
2. Delete all Firestore documents
3. Bump `CURRENT_SCHEMA_VERSION` from 1 to 2
4. Deploy new code
5. All users go through `/setup` on next login

### Phase 2: Schema Markers

Add to all encrypted documents:
```typescript
{
  ...existingFields,
  _encrypted: true,           // Marker for tooling
  _encryptionVersion: 1,      // For future migration
}
```

---

## 10. Testing Strategy

### Unit Tests (`packages/core`)

| Test | Description |
|------|-------------|
| `key-generation.test.ts` | Key generation produces 256 bits, deterministic from phrase |
| `encryption.test.ts` | Encrypt → decrypt roundtrip, IV uniqueness, tamper detection |
| `recovery-phrase.test.ts` | Phrase encoding/decoding, word validation |
| `field-crypto.test.ts` | Document encryption, nested fields, arrays |

### Integration Tests (`apps/web`)

| Test | Description |
|------|-------------|
| `key-store.test.ts` | IndexedDB storage, passphrase encryption |
| `crypto-guard.test.ts` | Redirect behavior when key missing |

### E2E Tests (`apps/web/tests/e2e`)

| Test | Description |
|------|-------------|
| `encryption-setup.spec.ts` | Full setup flow with phrase confirmation |
| `multi-device.spec.ts` | Recovery phrase on "new device" (cleared IndexedDB) |
| `encrypted-crud.spec.ts` | Create person → verify Firestore is encrypted → read back |

---

## 11. Rollout Plan

| Phase | Tasks | Duration |
|-------|-------|----------|
| **1. Foundation** | Crypto utilities in `@mora/core`, unit tests | 1 day |
| **2. Key Management** | IndexedDB store, React context, guards | 2 days |
| **3. Onboarding** | /setup, /unlock, /recover pages | 1.5 days |
| **4. Services** | Encrypt all services, update stores | 2 days |
| **5. AI Refactor** | Move AI calls to client, Function as proxy | 2 days |
| **6. Data Wipe** | Delete existing data, bump schema | 0.5 days |
| **7. Testing** | E2E tests, security audit | 1 day |
| **Total** | | **~10 days** |

---

## 12. Future Enhancements (Out of Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **QR Device Linking** | Scan QR to link new device (WhatsApp-style) | v1.1 |
| **Encrypted Search** | Searchable encryption for server-side queries | v2 |
| **Local SLM** | Run AI models on-device for full privacy | v2 |
| **Biometric Unlock** | FaceID/TouchID for native apps | v2 |
| **Key Rotation** | Re-encrypt all data with new key | v2 |
| **Trusted Contacts Recovery** | Social recovery via trusted contacts | v2 |

---

## 13. Open Questions

| Question | Status | Decision |
|----------|--------|----------|
| Should AI calls ever see plaintext? | ✅ Decided | Yes, during request. Acceptable trade-off. |
| Multi-device sync method? | ✅ Decided | Recovery phrase import (QR linking is v1.1) |
| What if user forgets passphrase? | ✅ Decided | Use recovery phrase to re-derive key |
| Delete existing data? | ✅ Decided | Yes, fresh start approved |
| Store recovery phrase hash? | ✅ Decided | Yes, SHA-256 hash for verification |

---

## 14. References

- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [BIP39 Mnemonic Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [AES-GCM NIST Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
