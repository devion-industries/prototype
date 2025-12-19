import { encrypt, decrypt, hashString } from '../utils/encryption';

describe('Encryption Utilities', () => {
  const testData = 'sensitive-github-token-12345';

  it('should encrypt and decrypt data correctly', () => {
    const encrypted = encrypt(testData);
    expect(encrypted).not.toBe(testData);
    expect(encrypted.length).toBeGreaterThan(0);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(testData);
  });

  it('should produce different ciphertext for same input', () => {
    const encrypted1 = encrypt(testData);
    const encrypted2 = encrypt(testData);

    // Should be different due to random IV
    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt to same value
    expect(decrypt(encrypted1)).toBe(testData);
    expect(decrypt(encrypted2)).toBe(testData);
  });

  it('should fail to decrypt invalid data', () => {
    expect(() => decrypt('invalid-encrypted-data')).toThrow();
  });

  it('should hash strings consistently', () => {
    const input = 'repo-123:main:abc123:deep';
    const hash1 = hashString(input);
    const hash2 = hashString(input);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashString('input1');
    const hash2 = hashString('input2');

    expect(hash1).not.toBe(hash2);
  });
});


