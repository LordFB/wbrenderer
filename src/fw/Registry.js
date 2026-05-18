// BRender resource registry. Named lookup keyed case-insensitively
// (matches BRender's BrMaterialFind / BrMapFind / BrModelFind semantics).

export class Registry {
  constructor() {
    this._byName = new Map();
  }

  add(name, value) {
    if (!name) return value;
    this._byName.set(name.toUpperCase(), value);
    return value;
  }

  find(name) {
    if (!name) return null;
    return this._byName.get(name.toUpperCase()) || null;
  }

  remove(name) {
    if (!name) return;
    this._byName.delete(name.toUpperCase());
  }

  list() {
    return Array.from(this._byName.values());
  }

  clear() {
    this._byName.clear();
  }
}

// Singleton-style global registries to match BRender's global state.
export const materialRegistry = new Registry();
export const mapRegistry = new Registry();
export const modelRegistry = new Registry();
