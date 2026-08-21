/**
 * Small persistence boundary used by app ViewModels.
 * Concrete repositories should depend on an adapter/client supplied here;
 * UI components should never need to know which database is underneath.
 */
export class Repository {
  constructor(adapter) {
    if (!adapter) throw new Error('Repository requires an adapter');
    this.adapter = adapter;
  }

  async findAll() {
    throw new Error('Repository.findAll() must be implemented by a concrete repository');
  }

  async findById(id) {
    throw new Error(`Repository.findById(${id}) must be implemented by a concrete repository`);
  }

  async create(value) {
    throw new Error('Repository.create() must be implemented by a concrete repository');
  }

  async update(id, value) {
    throw new Error('Repository.update() must be implemented by a concrete repository');
  }

  async remove(id) {
    throw new Error('Repository.remove() must be implemented by a concrete repository');
  }
}

window.eB = window.eB || {};
window.eB.Repository = Repository;
