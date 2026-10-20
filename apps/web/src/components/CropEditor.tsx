import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PhotoDimensions } from '@passport-photo/shared';
import {
  CropSettings,
  CropBoxRect,
  CropHandleType,
  CropBounds,
  createDefaultCropSettings,
  rotate90DegreesClockwise,
  calculateCropBox,
  calculateBaseFitScale,
  clampPanOffset,
  getRotatedDimensions,
  moveCropBox,
  resizeCropBoxWithHandle,
  clampCropBoxToBounds,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../utils/cropGeometry';
import { exportCroppedPhoto, CroppedPhotoResult } from '../utils/cropExporter';

interface CropEditorProps {
  readonly imageFile: Blob;
  readonly imageObjectUrl: string;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly photoDimensions: PhotoDimensions;
  readonly initialCropSettings?: CropSettings;
  readonly initialCropBox?: CropBoxRect | null;
  readonly onApplyCrop: (result: CroppedPhotoResult) => void;
  readonly onCancel: () => void;
}

type DragAction =
  | { type: 'none' }
  | {
      type: 'resize';
      handle: CropHandleType;
      startPointer: { x: number; y: number };
      startBox: CropBoxRect;
    }
  | {
      type: 'move-crop';
      startPointer: { x: number; y: number };
      startBox: CropBoxRect;
    }
  | {
      type: 'pan-image';
      startPointer: { x: number; y: number };
      startPan: { x: number; y: number };
    };

export const CropEditor: React.FC<CropEditorProps> = ({
  imageFile,
  imageObjectUrl,
  sourceWidth,
  sourceHeight,
  photoDimensions,
  initialCropSettings,
  initialCropBox,
  onApplyCrop,
  onCancel,
}) => {
  const [cropSettings, setCropSettings] = useState<CropSettings>(
    initialCropSettings ?? createDefaultCropSettings()
  );
  const [customCropBox, setCustomCropBox] = useState<CropBoxRect | null>(
    initialCropBox ?? initialCropSettings?.cropBox ?? null
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Viewport container measurement
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageDimensions, setStageDimensions] = useState({ width: 400, height: 350 });

  // Drag interaction state
  const dragActionRef = useRef<DragAction>({ type: 'none' });

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (stageRef.current) {
        const { clientWidth, clientHeight } = stageRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setStageDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Target aspect ratio locked to physical dimensions
  const targetAspect = photoDimensions.widthMm / photoDimensions.heightMm;

  // Default centered crop box when custom box is not explicitly dragged
  const defaultCropBox = useMemo(
    () => calculateCropBox(stageDimensions.width, stageDimensions.height, targetAspect, 24),
    [stageDimensions.width, stageDimensions.height, targetAspect]
  );

  const activeCropBox = customCropBox ?? defaultCropBox;

  // Rotated image dimensions and render scale
  const rotatedDims = useMemo(
    () => getRotatedDimensions(sourceWidth, sourceHeight, cropSettings.rotation),
    [sourceWidth, sourceHeight, cropSettings.rotation]
  );

  const baseScale = useMemo(
    () =>
      calculateBaseFitScale(
        rotatedDims.width,
        rotatedDims.height,
        defaultCropBox.width,
        defaultCropBox.height
      ),
    [rotatedDims.width, rotatedDims.height, defaultCropBox.width, defaultCropBox.height]
  );

  const totalScale = baseScale * cropSettings.zoom;
  const renderedWidth = rotatedDims.width * totalScale;
  const renderedHeight = rotatedDims.height * totalScale;

  const imageCenterX = stageDimensions.width / 2 + cropSettings.panX;
  const imageCenterY = stageDimensions.height / 2 + cropSettings.panY;

  // Rendered image boundaries on the stage
  const imageBounds = useMemo(
    () => ({
      left: imageCenterX - renderedWidth / 2,
      top: imageCenterY - renderedHeight / 2,
      width: renderedWidth,
      height: renderedHeight,
    }),
    [imageCenterX, imageCenterY, renderedWidth, renderedHeight]
  );

  // Valid bounding box for the crop frame
  const cropBounds = useMemo<CropBounds>(
    () => ({
      minX: Math.max(0, imageBounds.left),
      minY: Math.max(0, imageBounds.top),
      maxX: Math.min(stageDimensions.width, imageBounds.left + imageBounds.width),
      maxY: Math.min(stageDimensions.height, imageBounds.top + imageBounds.height),
    }),
    [imageBounds, stageDimensions.width, stageDimensions.height]
  );

  // Clamping helper for pan offset
  const clampCurrentPan = useCallback(
    (panX: number, panY: number, zoom: number, rotation: CropSettings['rotation']) => {
      const rot = getRotatedDimensions(sourceWidth, sourceHeight, rotation);
      return clampPanOffset(
        panX,
        panY,
        zoom,
        rot.width,
        rot.height,
        activeCropBox.width,
        activeCropBox.height
      );
    },
    [sourceWidth, sourceHeight, activeCropBox.width, activeCropBox.height]
  );

  // Keep custom crop box clamped if imageBounds or stage change
  useEffect(() => {
    if (customCropBox) {
      const clamped = clampCropBoxToBounds(customCropBox, cropBounds, targetAspect);
      if (
        Math.abs(clamped.x - customCropBox.x) > 0.5 ||
        Math.abs(clamped.y - customCropBox.y) > 0.5 ||
        Math.abs(clamped.width - customCropBox.width) > 0.5 ||
        Math.abs(clamped.height - customCropBox.height) > 0.5
      ) {
        setCustomCropBox(clamped);
      }
    }
  }, [cropBounds, customCropBox, targetAspect]);

  // Pointer event handlers for resize handles
  const handleResizePointerDown = (
    handle: CropHandleType,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragActionRef.current = {
      type: 'resize',
      handle,
      startPointer: { x: e.clientX, y: e.clientY },
      startBox: activeCropBox,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Pointer event handlers for moving the crop frame
  const handleMovePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragActionRef.current = {
      type: 'move-crop',
      startPointer: { x: e.clientX, y: e.clientY },
      startBox: activeCropBox,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Stage pointer down for panning the image (desktop mouse)
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button === 0) {
      dragActionRef.current = {
        type: 'pan-image',
        startPointer: { x: e.clientX, y: e.clientY },
        startPan: { x: cropSettings.panX, y: cropSettings.panY },
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const action = dragActionRef.current;
    if (action.type === 'none') return;

    const deltaX = e.clientX - action.startPointer.x;
    const deltaY = e.clientY - action.startPointer.y;

    if (action.type === 'resize') {
      const resized = resizeCropBoxWithHandle(
        action.startBox,
        action.handle,
        deltaX,
        deltaY,
        targetAspect,
        cropBounds
      );
      setCustomCropBox(resized);
    } else if (action.type === 'move-crop') {
      const moved = moveCropBox(action.startBox, deltaX, deltaY, cropBounds);
      setCustomCropBox(moved);
    } else if (action.type === 'pan-image') {
      const clamped = clampCurrentPan(
        action.startPan.x + deltaX,
        action.startPan.y + deltaY,
        cropSettings.zoom,
        cropSettings.rotation
      );
      setCropSettings((prev) => ({ ...prev, panX: clamped.panX, panY: clamped.panY }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragActionRef.current.type !== 'none') {
      dragActionRef.current = { type: 'none' };
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Predictable wheel handler: normal scroll by default; Ctrl+wheel for intentional zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.002;
      handleZoomChange(cropSettings.zoom + zoomDelta);
    }
    // If modifier is not pressed, do NOT call preventDefault: allow page to scroll naturally!
  };

  // Explicit zoom control
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    const clampedPan = clampCurrentPan(
      cropSettings.panX,
      cropSettings.panY,
      clampedZoom,
      cropSettings.rotation
    );
    setCropSettings((prev) => ({
      ...prev,
      zoom: clampedZoom,
      panX: clampedPan.panX,
      panY: clampedPan.panY,
    }));
  };

  const handleRotate90 = () => {
    const nextRotation = rotate90DegreesClockwise(cropSettings.rotation);
    const clampedPan = clampCurrentPan(
      cropSettings.panX,
      cropSettings.panY,
      cropSettings.zoom,
      nextRotation
    );
    setCropSettings((prev) => ({
      ...prev,
      rotation: nextRotation,
      panX: clampedPan.panX,
      panY: clampedPan.panY,
    }));
    setCustomCropBox(null); // Recenter crop box on rotated dimensions
  };

  const handleReset = () => {
    setCropSettings(createDefaultCropSettings());
    setCustomCropBox(null);
  };

  // Keyboard navigation for cropping
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 10;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const moved = moveCropBox(activeCropBox, -step, 0, cropBounds);
      setCustomCropBox(moved);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const moved = moveCropBox(activeCropBox, step, 0, cropBounds);
      setCustomCropBox(moved);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const moved = moveCropBox(activeCropBox, 0, -step, cropBounds);
      setCustomCropBox(moved);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const moved = moveCropBox(activeCropBox, 0, step, cropBounds);
      setCustomCropBox(moved);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      handleZoomChange(cropSettings.zoom + 0.1);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      handleZoomChange(cropSettings.zoom - 0.1);
    }
  };

  // Perform high-resolution canvas export
  const handleApplyCrop = async () => {
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const result = await exportCroppedPhoto({
        file: imageFile,
        cropSettings,
        cropBox: activeCropBox,
        imageBounds,
        cropBoxWidth: activeCropBox.width,
        cropBoxHeight: activeCropBox.height,
        photoDimensions,
      });
      onApplyCrop(result);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while cropping the photo.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
              2
            </span>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              Frame and Crop Photo
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Drag frame to position. Drag corner or edge handles to resize.
          </p>
        </div>

        {/* Physical Dimension Aspect Tag */}
        <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-mono font-semibold text-blue-900">
          <span className="font-sans text-blue-500 font-normal">Aspect:</span>
          <span>
            {photoDimensions.widthMm} × {photoDimensions.heightMm} mm
          </span>
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-900"
        >
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="flex-1 font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Interactive Crop Stage */}
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-label="Interactive photo crop editor. Drag inside frame to reposition, drag handles to resize, use zoom slider or Ctrl + scroll to zoom."
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative mt-3.5 h-[320px] sm:h-[420px] w-full overflow-hidden rounded-lg bg-slate-950 select-none touch-pan-y focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {/* Rendered Source Image with 2D transform */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${cropSettings.panX}px, ${cropSettings.panY}px)`,
          }}
        >
          <img
            src={imageObjectUrl}
            alt="Source photo in crop stage"
            className="max-w-none transition-transform duration-75 pointer-events-none"
            style={{
              width: `${sourceWidth}px`,
              height: `${sourceHeight}px`,
              transform: `scale(${totalScale}) rotate(${cropSettings.rotation}deg)`,
              transformOrigin: 'center center',
            }}
          />
        </div>

        {/* Resizable, Draggable Crop Frame with Scrim Overlay */}
        {activeCropBox.width > 0 && activeCropBox.height > 0 && (
          <div
            className="absolute rounded-xs z-10"
            style={{
              left: `${activeCropBox.x}px`,
              top: `${activeCropBox.y}px`,
              width: `${activeCropBox.width}px`,
              height: `${activeCropBox.height}px`,
              // Gigantic box shadow creates seamless dimmed scrim outside crop frame
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
              border: '2px solid rgba(255, 255, 255, 0.95)',
            }}
          >
            {/* Draggable interior to reposition crop window */}
            <div
              className="absolute inset-0 cursor-move touch-none pointer-events-auto"
              onPointerDown={handleMovePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="Drag to reposition crop"
            >
              {/* Rule of Thirds Guide Grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div className="border-r border-b border-white/40" />
                <div />
              </div>
            </div>

            {/* 8 Draggable Resize Handles (Touch targets >= 44px with crisp visual markers) */}

            {/* Corner: Top-Left (NW) */}
            <div
              className="absolute -top-5.5 -left-5.5 flex h-11 w-11 items-center justify-center cursor-nw-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('nw', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from top-left corner"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs border-2 border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>

            {/* Corner: Top-Right (NE) */}
            <div
              className="absolute -top-5.5 -right-5.5 flex h-11 w-11 items-center justify-center cursor-ne-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('ne', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from top-right corner"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs border-2 border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>

            {/* Corner: Bottom-Right (SE) */}
            <div
              className="absolute -bottom-5.5 -right-5.5 flex h-11 w-11 items-center justify-center cursor-se-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('se', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from bottom-right corner"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs border-2 border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>

            {/* Corner: Bottom-Left (SW) */}
            <div
              className="absolute -bottom-5.5 -left-5.5 flex h-11 w-11 items-center justify-center cursor-sw-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('sw', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from bottom-left corner"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-xs border-2 border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>

            {/* Edge: Top (N) */}
            <div
              className="absolute -top-5.5 left-1/2 -translate-x-1/2 flex h-11 w-11 items-center justify-center cursor-n-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('n', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from top edge"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-1.5 w-5 rounded-full border border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>

            {/* Edge: Bottom (S) */}
            <div
              className="absolute -bottom-5.5 left-1/2 -translate-x-1/2 flex h-11 w-11 items-center justify-center cursor-s-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('s', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from bottom edge"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-1.5 w-5 rounded-full border border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>

            {/* Edge: Left (W) */}
            <div
              className="absolute top-1/2 -left-5.5 -translate-y-1/2 flex h-11 w-11 items-center justify-center cursor-w-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('w', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from left edge"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-5 w-1.5 rounded-full border border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>

            {/* Edge: Right (E) */}
            <div
              className="absolute top-1/2 -right-5.5 -translate-y-1/2 flex h-11 w-11 items-center justify-center cursor-e-resize pointer-events-auto touch-none select-none z-30"
              onPointerDown={(e) => handleResizePointerDown('e', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Resize crop from right edge"
              title="Resize crop (preserves aspect ratio)"
            >
              <div className="h-5 w-1.5 rounded-full border border-blue-600 bg-white shadow-md ring-1 ring-black/20 hover:scale-125 transition-transform" />
            </div>
          </div>
        )}

        {/* Drag & Gesture Hint Overlay */}
        <div className="absolute bottom-2.5 left-2.5 rounded-md bg-slate-900/85 px-2.5 py-1 text-[11px] font-medium text-slate-300 pointer-events-none backdrop-blur-xs">
          <span className="hidden sm:inline">
            Drag frame to reposition • Drag handles to resize • Ctrl + scroll or use slider to zoom
          </span>
          <span className="inline sm:hidden">
            Drag frame to move • Drag handles to resize
          </span>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="mt-4 flex flex-col gap-3 rounded-lg bg-slate-50 p-3 sm:p-4 border border-slate-100">
        {/* Zoom Slider Row */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="crop-zoom-slider"
            className="text-xs font-semibold text-slate-700 shrink-0 flex items-center gap-1.5"
          >
            <span>Zoom</span>
            <span className="font-mono text-blue-700">{cropSettings.zoom.toFixed(1)}×</span>
          </label>

          <button
            type="button"
            onClick={() => handleZoomChange(cropSettings.zoom - 0.1)}
            disabled={cropSettings.zoom <= MIN_ZOOM}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-sm focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96]"
            aria-label="Zoom out"
          >
            −
          </button>

          <input
            id="crop-zoom-slider"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={cropSettings.zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Zoom level"
          />

          <button
            type="button"
            onClick={() => handleZoomChange(cropSettings.zoom + 0.1)}
            disabled={cropSettings.zoom >= MAX_ZOOM}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-sm focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96]"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>

        {/* Rotate and Reset Action Buttons */}
        <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRotate90}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96] transition-transform"
            >
              <svg
                className="h-4 w-4 shrink-0 text-slate-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Rotate 90°</span>
              {cropSettings.rotation !== 0 && (
                <span className="rounded-sm bg-blue-100 px-1 font-mono text-[10px] text-blue-800">
                  {cropSettings.rotation}°
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96] transition-transform"
            >
              <span>Reset</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            Keyboard: Arrow keys to move • +/- to zoom
          </div>
        </div>
      </div>

      {/* Action Bar (Cancel / Proceed) */}
      <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isExporting}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96] transition-transform"
        >
          Change Photo
        </button>

        <button
          type="button"
          onClick={handleApplyCrop}
          disabled={isExporting}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.96] transition-transform disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Applying Crop...</span>
            </>
          ) : (
            <span>Apply Crop</span>
          )}
        </button>
      </div>
    </div>
  );
};
