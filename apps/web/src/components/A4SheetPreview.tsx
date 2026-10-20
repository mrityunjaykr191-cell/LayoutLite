import React from 'react';
import type { SheetLayoutResult } from '@passport-photo/shared';

interface A4SheetPreviewProps {
  readonly layoutResult: SheetLayoutResult;
  readonly photoUrl: string;
  readonly showCutGuides?: boolean;
}

export const A4SheetPreview: React.FC<A4SheetPreviewProps> = ({
  layoutResult,
  photoUrl,
  showCutGuides,
}) => {
  const { sheetDimensions, usableArea, photos, fits } = layoutResult;
  const sheetW = sheetDimensions.widthMm;
  const sheetH = sheetDimensions.heightMm;

  const shouldRenderCutGuides = showCutGuides !== undefined
    ? showCutGuides
    : (layoutResult.includeCutGuides ?? false);

  // 50 mm calibration ruler preview positioning in bottom margin
  const rulerWidthMm = 50;
  const rulerHeightMm = 4;
  const rulerXMm = (sheetW - rulerWidthMm) / 2;
  const rulerYMm = sheetH - 9; // 9 mm above sheet bottom edge

  return (
    <div className="flex flex-col items-center">
      {/* Visual Sheet Frame with paper drop shadow */}
      <div
        className="relative w-full max-w-[340px] sm:max-w-[400px] select-none rounded-sm bg-white shadow-md ring-1 ring-slate-900/10 transition-all duration-200"
        style={{ aspectRatio: `${sheetW} / ${sheetH}` }}
      >
        <svg
          viewBox={`0 0 ${sheetW} ${sheetH}`}
          className="h-full w-full rounded-sm"
          role="img"
          aria-label={`A4 sheet layout preview showing ${photos.length} photos`}
        >
          {/* Sheet Background */}
          <rect
            x="0"
            y="0"
            width={sheetW}
            height={sheetH}
            fill="#ffffff"
          />

          {/* Printable Usable Area Boundary (subtle dashed boundary) */}
          <rect
            x={usableArea.originXMm}
            y={usableArea.originYMm}
            width={usableArea.widthMm}
            height={usableArea.heightMm}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="0.4"
            strokeDasharray="2 2"
          />

          {/* Placed Photos and Cut Guides */}
          {photos.map((photo) => {
            const { topLeft, topRight, bottomLeft, bottomRight } = photo.cutGuides;

            return (
              <g key={`placed-photo-${photo.index}`}>
                {/* Photo Portrait Image */}
                <image
                  href={photoUrl}
                  x={photo.xMm}
                  y={photo.yMm}
                  width={photo.widthMm}
                  height={photo.heightMm}
                  preserveAspectRatio="none"
                />

                {/* Subtle photo boundary outline for optical alignment */}
                <rect
                  x={photo.xMm}
                  y={photo.yMm}
                  width={photo.widthMm}
                  height={photo.heightMm}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="0.15"
                />

                {/* Optional Corner Cut-Guide Ticks */}
                {shouldRenderCutGuides && (
                  <g stroke="#334155" strokeWidth="0.3" strokeLinecap="square">
                    {/* Top-Left */}
                    <line
                      x1={topLeft.horizontal.x1Mm}
                      y1={topLeft.horizontal.y1Mm}
                      x2={topLeft.horizontal.x2Mm}
                      y2={topLeft.horizontal.y2Mm}
                    />
                    <line
                      x1={topLeft.vertical.x1Mm}
                      y1={topLeft.vertical.y1Mm}
                      x2={topLeft.vertical.x2Mm}
                      y2={topLeft.vertical.y2Mm}
                    />

                    {/* Top-Right */}
                    <line
                      x1={topRight.horizontal.x1Mm}
                      y1={topRight.horizontal.y1Mm}
                      x2={topRight.horizontal.x2Mm}
                      y2={topRight.horizontal.y2Mm}
                    />
                    <line
                      x1={topRight.vertical.x1Mm}
                      y1={topRight.vertical.y1Mm}
                      x2={topRight.vertical.x2Mm}
                      y2={topRight.vertical.y2Mm}
                    />

                    {/* Bottom-Left */}
                    <line
                      x1={bottomLeft.horizontal.x1Mm}
                      y1={bottomLeft.horizontal.y1Mm}
                      x2={bottomLeft.horizontal.x2Mm}
                      y2={bottomLeft.horizontal.y2Mm}
                    />
                    <line
                      x1={bottomLeft.vertical.x1Mm}
                      y1={bottomLeft.vertical.y1Mm}
                      x2={bottomLeft.vertical.x2Mm}
                      y2={bottomLeft.vertical.y2Mm}
                    />

                    {/* Bottom-Right */}
                    <line
                      x1={bottomRight.horizontal.x1Mm}
                      y1={bottomRight.horizontal.y1Mm}
                      x2={bottomRight.horizontal.x2Mm}
                      y2={bottomRight.horizontal.y2Mm}
                    />
                    <line
                      x1={bottomRight.vertical.x1Mm}
                      y1={bottomRight.vertical.y1Mm}
                      x2={bottomRight.vertical.x2Mm}
                      y2={bottomRight.vertical.y2Mm}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* 50 mm Calibration Verification Ruler Preview (Bottom Margin) */}
          <g transform={`translate(${rulerXMm}, ${rulerYMm})`}>
            {/* Main Baseline */}
            <line x1="0" y1={rulerHeightMm} x2={rulerWidthMm} y2={rulerHeightMm} stroke="#64748b" strokeWidth="0.3" />
            {/* 10mm Major Ticks */}
            {[0, 10, 20, 30, 40, 50].map((t) => (
              <line key={`tick-${t}`} x1={t} y1="0.5" x2={t} y2={rulerHeightMm} stroke="#64748b" strokeWidth="0.3" />
            ))}
            {/* 5mm Minor Ticks */}
            {[5, 15, 25, 35, 45].map((t) => (
              <line key={`subtick-${t}`} x1={t} y1="2" x2={t} y2={rulerHeightMm} stroke="#94a3b8" strokeWidth="0.2" />
            ))}
            {/* Ruler Label */}
            <text
              x={rulerWidthMm / 2}
              y="-1"
              fontSize="2.2"
              fill="#64748b"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              50 mm Calibration Ruler (100% Scale Check)
            </text>
          </g>
        </svg>

        {/* Visual Overlay Banner When Layout Exceeds Page Capacity */}
        {!fits && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-sm bg-slate-900/40 p-4 backdrop-blur-[1px]">
            <div className="max-w-[240px] rounded-lg border border-amber-300 bg-white p-3 text-center shadow-lg">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm mb-1">
                !
              </span>
              <p className="text-xs font-bold text-slate-900">Layout Exceeds Page</p>
              <p className="mt-1 text-[11px] text-slate-600">
                The requested arrangement does not fit inside the printable A4 boundaries.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sheet Metadata Caption */}
      <div className="mt-2.5 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-500">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
          A4
        </span>
        <span>210 × 297 mm</span>
        <span>•</span>
        <span>{photos.length} {photos.length === 1 ? 'copy' : 'copies'}</span>
      </div>
    </div>
  );
};
