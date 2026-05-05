import { describe, it, expect } from 'vitest';
import { DEFAULT_ORGANIZATION_SQL_ID } from './dataPlane';

describe('dataPlane', () => {
  it('default org id is a UUID', () => {
    expect(DEFAULT_ORGANIZATION_SQL_ID).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
