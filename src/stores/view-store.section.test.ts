import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from './view-store';

describe('view-store section plane', () => {
  beforeEach(() => {
    useViewStore.setState({
      sectionPlane: {
        enabled: false,
        position: [0, 0, 0],
        normal: 'y',
        offset: 0,
      },
    });
  });

  it('should start with section plane disabled', () => {
    expect(useViewStore.getState().sectionPlane.enabled).toBe(false);
    expect(useViewStore.getState().sectionPlane.normal).toBe('y');
    expect(useViewStore.getState().sectionPlane.offset).toBe(0);
  });

  it('should toggle section plane on', () => {
    useViewStore.getState().toggleSectionPlane();
    expect(useViewStore.getState().sectionPlane.enabled).toBe(true);
  });

  it('should toggle section plane off', () => {
    useViewStore.getState().toggleSectionPlane();
    useViewStore.getState().toggleSectionPlane();
    expect(useViewStore.getState().sectionPlane.enabled).toBe(false);
  });

  it('should set section plane normal to x', () => {
    useViewStore.getState().setSectionPlaneNormal('x');
    expect(useViewStore.getState().sectionPlane.normal).toBe('x');
  });

  it('should set section plane normal to z', () => {
    useViewStore.getState().setSectionPlaneNormal('z');
    expect(useViewStore.getState().sectionPlane.normal).toBe('z');
  });

  it('should set section plane offset', () => {
    useViewStore.getState().setSectionPlaneOffset(5.5);
    expect(useViewStore.getState().sectionPlane.offset).toBe(5.5);
  });

  it('should set section plane offset negative', () => {
    useViewStore.getState().setSectionPlaneOffset(-3);
    expect(useViewStore.getState().sectionPlane.offset).toBe(-3);
  });

  it('should preserve other section plane fields when changing normal', () => {
    useViewStore.getState().toggleSectionPlane();
    useViewStore.getState().setSectionPlaneOffset(7);
    useViewStore.getState().setSectionPlaneNormal('x');
    const sp = useViewStore.getState().sectionPlane;
    expect(sp.enabled).toBe(true);
    expect(sp.normal).toBe('x');
    expect(sp.offset).toBe(7);
    expect(sp.position).toEqual([0, 0, 0]);
  });
});
