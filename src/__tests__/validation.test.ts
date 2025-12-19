import { validateRepoFullName, isValidUUID, sanitizeInput } from '../utils/validation';

describe('Validation Utilities', () => {
  describe('validateRepoFullName', () => {
    it('should accept valid repo names', () => {
      expect(validateRepoFullName('facebook/react')).toBe(true);
      expect(validateRepoFullName('vercel/next.js')).toBe(true);
      expect(validateRepoFullName('microsoft/vscode')).toBe(true);
      expect(validateRepoFullName('user_name/repo-name')).toBe(true);
    });

    it('should reject invalid repo names', () => {
      expect(validateRepoFullName('invalid')).toBe(false);
      expect(validateRepoFullName('no/slashes/allowed')).toBe(false);
      expect(validateRepoFullName('spaces not allowed/repo')).toBe(false);
      expect(validateRepoFullName('/no-owner')).toBe(false);
      expect(validateRepoFullName('no-repo/')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should accept valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
      expect(sanitizeInput('\n\ttest\n')).toBe('test');
    });

    it('should remove HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Test <div> content')).toBe('Test div content');
    });

    it('should preserve normal text', () => {
      expect(sanitizeInput('Normal text 123')).toBe('Normal text 123');
      expect(sanitizeInput('user@example.com')).toBe('user@example.com');
    });
  });
});


