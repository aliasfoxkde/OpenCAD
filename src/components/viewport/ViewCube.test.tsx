/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewCube } from './ViewCube';
import { useViewStore } from '../../stores/view-store';

// Mock R3F hooks — ViewCube doesn't use them but they may be imported transitively
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { x: 0, y: 0, z: 0 } },
  })),
}));

describe('ViewCube', () => {
  beforeEach(() => {
    useViewStore.setState({
      cameraAzimuth: 0,
      cameraElevation: 0,
      cameraPreset: null,
      fitViewRequested: 0,
      zoomToSelectionRequested: 0,
    });
  });

  it('should render all 6 face labels', () => {
    render(<ViewCube />);
    expect(screen.getByText('F')).toBeDefined();
    expect(screen.getByText('B')).toBeDefined();
    expect(screen.getByText('T')).toBeDefined();
    expect(screen.getByText('Bo')).toBeDefined();
    expect(screen.getByText('R')).toBeDefined();
    expect(screen.getByText('L')).toBeDefined();
  });

  it('should render ISO button', () => {
    render(<ViewCube />);
    expect(screen.getByText('ISO')).toBeDefined();
  });

  it('should call setCameraPreset when a face is clicked', () => {
    const setPreset = vi.spyOn(useViewStore.getState(), 'setCameraPreset');
    render(<ViewCube />);
    fireEvent.click(screen.getByText('F'));
    expect(setPreset).toHaveBeenCalledWith('front');
  });

  it('should call setCameraPreset with iso when ISO is clicked', () => {
    const setPreset = vi.spyOn(useViewStore.getState(), 'setCameraPreset');
    render(<ViewCube />);
    fireEvent.click(screen.getByText('ISO'));
    expect(setPreset).toHaveBeenCalledWith('iso');
  });

  it('should call setCameraPreset with back when B is clicked', () => {
    const setPreset = vi.spyOn(useViewStore.getState(), 'setCameraPreset');
    render(<ViewCube />);
    fireEvent.click(screen.getByText('B'));
    expect(setPreset).toHaveBeenCalledWith('back');
  });

  it('should show face title on parent element', () => {
    render(<ViewCube />);
    const frontFace = screen.getByText('F').parentElement!;
    expect(frontFace).toHaveAttribute('title', 'F — front view');
  });
});
