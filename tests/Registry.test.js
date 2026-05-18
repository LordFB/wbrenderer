import { describe, it, expect } from 'vitest';
import { Registry } from '../src/fw/Registry.js';

describe('Registry', () => {
  it('adds, finds (case-insensitive), removes, lists', () => {
    const r = new Registry();
    r.add('FooBar', { v: 1 });
    expect(r.find('foobar').v).toBe(1);
    expect(r.find('FOOBAR').v).toBe(1);
    expect(r.list().length).toBe(1);
    r.remove('FOObar');
    expect(r.find('foobar')).toBeNull();
  });
});
