import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from './dependency-graph';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  it('should add nodes', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    expect(graph.size).toBe(2);
  });

  it('should ignore dependencies on non-existent nodes', () => {
    graph.addNode('a', ['missing']);
    expect(graph.getDependencies('a')).toEqual([]);
  });

  it('should track dependencies and dependents', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.addNode('c', ['a', 'b']);

    expect(graph.getDependencies('c')).toEqual(['a', 'b']);
    expect(graph.getDependents('a')).toEqual(['b', 'c']);
    expect(graph.getDependents('b')).toEqual(['c']);
  });

  it('should topological sort correctly', () => {
    // Add in dependency order so edges resolve properly
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.addNode('c', ['a', 'b']);

    const order = graph.topologicalSort();
    const aIdx = order.indexOf('a');
    const bIdx = order.indexOf('b');
    const cIdx = order.indexOf('c');

    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });

  it('should detect cycles in topological sort', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    // Manually create a cycle by updating a to depend on b
    graph.addNode('a', ['b']);

    expect(() => graph.topologicalSort()).toThrow('Circular dependency');
  });

  it('should remove nodes', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.removeNode('b');

    expect(graph.size).toBe(1);
    expect(graph.getDependents('a')).toEqual([]);
  });

  it('should get ancestors', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.addNode('c', ['b']);

    const ancestors = graph.getAncestors('c');
    expect(ancestors.sort()).toEqual(['a', 'b']);
  });

  it('should get descendants', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.addNode('c', ['b']);
    graph.addNode('d', ['a']);

    const descendants = graph.getDescendants('a');
    expect(descendants.sort()).toEqual(['b', 'c', 'd']);
  });

  it('should get evaluation order for subset', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.addNode('c', ['b']);
    graph.addNode('d', []);

    const order = graph.getEvaluationOrder(['c']);
    // Should include a, b, c but not d
    expect(order).toContain('a');
    expect(order).toContain('b');
    expect(order).toContain('c');
    expect(order).not.toContain('d');
  });

  it('should detect would-be cycles', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.addNode('c', ['b']);

    // c is a descendant of a. Adding dependency a->c would create cycle.
    expect(graph.wouldCreateCycle('a', 'c')).toBe(true);
    // b is a descendant of a. Adding dependency a->b would create cycle.
    expect(graph.wouldCreateCycle('a', 'b')).toBe(true);
    // d is not a descendant of a, so no cycle
    graph.addNode('d', []);
    expect(graph.wouldCreateCycle('a', 'd')).toBe(false);
  });

  it('should update existing node dependencies', () => {
    graph.addNode('a', []);
    graph.addNode('b', []);
    graph.addNode('c', ['a']);

    // Update c to depend on b instead of a
    graph.addNode('c', ['b']);
    expect(graph.getDependencies('c')).toEqual(['b']);
    expect(graph.getDependents('a')).toEqual([]);
    expect(graph.getDependents('b')).toEqual(['c']);
  });

  it('should clear the graph', () => {
    graph.addNode('a', []);
    graph.addNode('b', ['a']);
    graph.clear();
    expect(graph.size).toBe(0);
  });
});
