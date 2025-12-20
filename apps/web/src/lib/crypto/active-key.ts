let activeKey: CryptoKey | null = null;

export function setActiveCryptoKey(key: CryptoKey | null): void {
  activeKey = key;
}

export function getActiveCryptoKey(): CryptoKey {
  if (!activeKey) {
    throw new Error('Master encryption key is not loaded');
  }
  return activeKey;
}

export function hasActiveCryptoKey(): boolean {
  return Boolean(activeKey);
}
