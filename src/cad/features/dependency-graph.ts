/**
 * Dependency Graph — Directed Acyclic Graph (DAG) for feature ordering.
 * Tracks which features depend on which others, provides topological sort
 * for correct rebuild ordering, and identifies features affected by a change.
 */

export interface DependencyNode {
  id: string;
  dependencies: string[];
  dependents: string[];
}

export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();

  /** Add a node to the graph */
  addNode(id: string, dependencies: string[]): void {
    const existing = this.nodes.get(id);
    const deps = dependencies.filter((d) => this.nodes.has(d));

    if (existing) {
      // Remove old edges
      for (const oldDep of existing.dependencies) {
        const depNode = this.nodes.get(oldDep);
        if (depNode) {
          depNode.dependents = depNode.dependents.filter((d) => d !== id);
        }
      }
      existing.dependencies = deps;
    } else {
      this.nodes.set(id, { id, dependencies: deps, dependents: [] });
    }

    // Add forward edges
    for (const dep of deps) {
      const depNode = this.nodes.get(dep)!;
      if (!depNode.dependents.includes(id)) {
        depNode.dependents.push(id);
      }
    }
  }

  /** Remove a node and all its edges */
  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove from dependents lists
    for (const dep of node.dependencies) {
      const depNode = this.nodes.get(dep);
      if (depNode) {
        depNode.dependents = depNode.dependents.filter((d) => d !== id);
      }
    }

    // Remove from dependencies lists of dependents
    for (const dependent of node.dependents) {
      const depNode = this.nodes.get(dependent);
      if (depNode) {
        depNode.dependencies = depNode.dependencies.filter((d) => d !== id);
      }
    }

    this.nodes.delete(id);
  }

  /** Get a node by ID */
  getNode(id: string): DependencyNode | undefined {
    return this.nodes.get(id);
  }

  /** Get all direct dependencies of a node */
  getDependencies(id: string): string[] {
    return this.nodes.get(id)?.dependencies ?? [];
  }

  /** Get all direct dependents of a node */
  getDependents(id: string): string[] {
    return this.nodes.get(id)?.dependents ?? [];
  }

  /** Get all ancestors (transitive dependencies) of a node */
  getAncestors(id: string): string[] {
    const visited = new Set<string>();
    const stack = [...this.getDependencies(id)];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      stack.push(...this.getDependencies(current));
    }

    return Array.from(visited);
  }

  /** Get all descendants (transitive dependents) of a node */
  getDescendants(id: string): string[] {
    const visited = new Set<string>();
    const stack = [...this.getDependents(id)];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      stack.push(...this.getDependents(current));
    }

    return Array.from(visited);
  }

  /**
   * Topological sort — returns node IDs in evaluation order.
   * Dependencies come before dependents.
   * Throws if a cycle is detected.
   */
  topologicalSort(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const visit = (id: string) => {
      if (inStack.has(id)) {
        throw new Error(`Circular dependency detected involving: ${id}`);
      }
      if (visited.has(id)) return;

      inStack.add(id);
      for (const dep of this.getDependencies(id)) {
        visit(dep);
      }
      inStack.delete(id);
      visited.add(id);
      result.push(id);
    };

    for (const id of this.nodes.keys()) {
      visit(id);
    }

    return result;
  }

  /**
   * Get the evaluation order for a subset of nodes.
   * Includes all ancestors needed to correctly evaluate the given nodes.
   */
  getEvaluationOrder(nodeIds: string[]): string[] {
    const needed = new Set<string>();
    for (const id of nodeIds) {
      needed.add(id);
      for (const ancestor of this.getAncestors(id)) {
        needed.add(ancestor);
      }
    }

    const fullOrder = this.topologicalSort();
    return fullOrder.filter((id) => needed.has(id));
  }

  /** Check if adding a dependency would create a cycle */
  wouldCreateCycle(fromId: string, toId: string): boolean {
    // If 'toId' is an ancestor of 'fromId', adding fromId->toId creates a cycle
    // Actually: if 'fromId' is an ancestor of 'toId', then toId->fromId creates cycle
    // We're checking: adding fromId depends on toId. Would that cycle?
    // Only cycles if toId is already a descendant of fromId
    return this.getDescendants(fromId).includes(toId);
  }

  /** Get all node IDs */
  get allIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /** Get node count */
  get size(): number {
    return this.nodes.size;
  }

  /** Clear the graph */
  clear(): void {
    this.nodes.clear();
  }
}
