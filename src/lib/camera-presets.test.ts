import { describe, it, expect } from 'vitest';
import { CAMERA_PRESETS, getPreset, getPresetNames } from './camera-presets';

describe('camera-presets', () => {
  it('should define all 7 standard presets', () => {
    expect(Object.keys(CAMERA_PRESETS)).toEqual(
      expect.arrayContaining(['front', 'back', 'top', 'bottom', 'right', 'left', 'iso']),
    );
    expect(Object.keys(CAMERA_PRESETS)).toHaveLength(7);
  });

  it('should return a preset by name', () => {
    const front = getPreset('front');
    expect(front).toBeDefined();
    expect(front!.name).toBe('front');
    expect(front!.label).toBe('Front');
    expect(front!.position).toEqual([0, 0, 20]);
    expect(front!.target).toEqual([0, 0, 0]);
  });

  it('should return undefined for unknown preset', () => {
    expect(getPreset('nonexistent')).toBeUndefined();
    expect(getPreset('')).toBeUndefined();
  });

  it('should return all preset names', () => {
    const names = getPresetNames();
    expect(names).toHaveLength(7);
    expect(names).toContain('front');
    expect(names).toContain('iso');
  });

  it('should have correct opposite pairs', () => {
    const front = getPreset('front')!;
    const back = getPreset('back')!;
    expect(front.position[2]).toBe(-back.position[2]);

    const top = getPreset('top')!;
    const bottom = getPreset('bottom')!;
    expect(top.position[1]).toBe(-bottom.position[1]);

    const right = getPreset('right')!;
    const left = getPreset('left')!;
    expect(right.position[0]).toBe(-left.position[0]);
  });

  it('should have all presets targeting origin', () => {
    for (const preset of Object.values(CAMERA_PRESETS)) {
      expect(preset.target).toEqual([0, 0, 0]);
    }
  });

  it('should have non-zero position for all presets', () => {
    for (const preset of Object.values(CAMERA_PRESETS)) {
      const distance = Math.sqrt(preset.position[0] ** 2 + preset.position[1] ** 2 + preset.position[2] ** 2);
      expect(distance).toBeGreaterThan(0);
    }
  });

  it('should have isometric at a diagonal', () => {
    const iso = getPreset('iso')!;
    // All three axes should be non-zero
    expect(iso.position[0]).not.toBe(0);
    expect(iso.position[1]).not.toBe(0);
    expect(iso.position[2]).not.toBe(0);
  });
});
