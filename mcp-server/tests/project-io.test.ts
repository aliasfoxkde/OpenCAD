import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  createProject,
  writeProject,
  readProject,
  listProjects,
  deleteProject,
} from '../src/core/project-io.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencad-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('project-io', () => {
  describe('createProject', () => {
    it('should create an empty project with correct defaults', () => {
      const project = createProject('TestProject');
      expect(project.version).toBe(1);
      expect(project.name).toBe('TestProject');
      expect(project.units).toBe('mm');
      expect(project.features).toEqual([]);
      expect(project.sketches).toEqual([]);
      expect(project.created).toBeGreaterThan(0);
    });

    it('should create with custom units', () => {
      const project = createProject('Test', 'in');
      expect(project.units).toBe('in');
    });
  });

  describe('writeProject / readProject roundtrip', () => {
    it('should write and read back a project', () => {
      const project = createProject('RoundTrip');
      const filePath = path.join(tmpDir, 'test.ocad');
      writeProject(filePath, project);
      const loaded = readProject(filePath);
      expect(loaded.name).toBe('RoundTrip');
      expect(loaded.version).toBe(1);
      expect(loaded.units).toBe('mm');
    });

    it('should preserve features through roundtrip', () => {
      const project = createProject('WithFeatures');
      project.features.push({
        id: 'f1',
        type: 'box',
        name: 'Box1',
        parameters: { width: 10, height: 20, depth: 30 },
        dependencies: [],
        children: [],
        suppressed: false,
      });
      const filePath = path.join(tmpDir, 'features.ocad');
      writeProject(filePath, project);
      const loaded = readProject(filePath);
      expect(loaded.features).toHaveLength(1);
      expect(loaded.features[0].type).toBe('box');
      expect(loaded.features[0].parameters.width).toBe(10);
    });

    it('should auto-append .ocad extension', () => {
      const project = createProject('AutoExt');
      const filePath = path.join(tmpDir, 'autoext');
      writeProject(filePath, project);
      expect(fs.existsSync(path.join(tmpDir, 'autoext.ocad'))).toBe(true);
    });

    it('should update modified timestamp on write', () => {
      const project = createProject('Timestamp');
      const filePath = path.join(tmpDir, 'ts.ocad');
      const originalModified = project.modified;
      writeProject(filePath, project);
      // Small delay to ensure timestamp differs
      const loaded = readProject(filePath);
      expect(loaded.modified).toBeGreaterThanOrEqual(originalModified);
    });

    it('should create intermediate directories', () => {
      const project = createProject('Nested');
      const filePath = path.join(tmpDir, 'a', 'b', 'nested.ocad');
      writeProject(filePath, project);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should throw for non-existent file', () => {
      expect(() => readProject('/nonexistent/path/file.ocad')).toThrow('File not found');
    });

    it('should throw for unsupported version', () => {
      const filePath = path.join(tmpDir, 'bad.ocad');
      fs.writeFileSync(filePath, JSON.stringify({ version: 99, name: 'Bad' }));
      expect(() => readProject(filePath)).toThrow('Unsupported project version');
    });
  });

  describe('listProjects', () => {
    it('should list .ocad files in directory', () => {
      createAndWrite('Project1');
      createAndWrite('Project2');
      fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'not an ocad');
      const projects = listProjects(tmpDir);
      expect(projects).toHaveLength(2);
    });

    it('should return empty array for non-existent directory', () => {
      const projects = listProjects('/nonexistent/path');
      expect(projects).toEqual([]);
    });

    function createAndWrite(name: string) {
      const project = createProject(name);
      writeProject(path.join(tmpDir, `${name}.ocad`), project);
    }
  });

  describe('deleteProject', () => {
    it('should delete an existing file', () => {
      const project = createProject('ToDelete');
      const filePath = path.join(tmpDir, 'delete.ocad');
      writeProject(filePath, project);
      expect(fs.existsSync(filePath)).toBe(true);
      const result = deleteProject(filePath);
      expect(result).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should return false for non-existent file', () => {
      const result = deleteProject('/nonexistent/file.ocad');
      expect(result).toBe(false);
    });
  });
});
