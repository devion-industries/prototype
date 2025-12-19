import { generateSnapshotHash } from '../analysis/idempotency';

describe('Idempotency', () => {
  it('should generate consistent snapshot hash', () => {
    const hash1 = generateSnapshotHash('repo-1', 'main', 'abc123', 'deep');
    const hash2 = generateSnapshotHash('repo-1', 'main', 'abc123', 'deep');

    expect(hash1).toBe(hash2);
  });

  it('should generate different hash for different inputs', () => {
    const hash1 = generateSnapshotHash('repo-1', 'main', 'abc123', 'deep');
    const hash2 = generateSnapshotHash('repo-1', 'main', 'def456', 'deep');

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hash for different depth', () => {
    const hash1 = generateSnapshotHash('repo-1', 'main', 'abc123', 'deep');
    const hash2 = generateSnapshotHash('repo-1', 'main', 'abc123', 'fast');

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hash for different branch', () => {
    const hash1 = generateSnapshotHash('repo-1', 'main', 'abc123', 'deep');
    const hash2 = generateSnapshotHash('repo-1', 'develop', 'abc123', 'deep');

    expect(hash1).not.toBe(hash2);
  });
});


