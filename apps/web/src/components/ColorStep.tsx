import React, { useState, useEffect, useRef } from 'react';
import {
  COLOR_PRESETS,
  DEFAULT_BACKGROUND_COLOR,
  isValidHexColor,
  normalizeHexColor,
  compositeImageOverColor,
} from '../utils/colorCompositor';

interface ColorStepProps {
  readonly cutoutBlob: Blob | null;
  readonly cutoutUrl: string | null;
  readonly croppedPhotoUrl: string;
  readonly isBackgroundSkipped: boolean;
  readonly selectedColorHex: string;
  readonly compositedUrl: string | null;
  readonly onColorComposited: (hex: string, compositedBlob: Blob, compositedUrl: string) => void;
  readonly onBackToBackground: () => void;
  readonly onProceedToDimensions: () => void;
}

export const ColorStep: React.FC<ColorStepProps> = ({
  cutoutBlob,
  croppedPhotoUrl,
  isBackgroundSkipped,
  selectedColorHex,
  compositedUrl,
  onColorComposited,
  onBackToBackground,
  onProceedToDimensions,
}) => {
  const [activeColor, setActiveColor] = useState<string>(selectedColorHex || DEFAULT_BACKGROUND_COLOR);
  const [customHexInput, setCustomHexInput] = useState<string>(
    COLOR_PRESETS.some((p) => p.hex.toUpperCase() === selectedColorHex.toUpperCase())
      ? '#4A90E2'
      : selectedColorHex
  );
  const [customHexError, setCustomHexError] = useState<string | null>(null);
  const [isCompositing, setIsCompositing] = useState<boolean>(false);

  // Active composite generation token to prevent race conditions during rapid color switching
  const compositeTokenRef = useRef<number>(0);

  // Perform client-side composite when activeColor or cutoutBlob changes
  const applyColor = async (hexColor: string) => {
    if (!cutoutBlob || isBackgroundSkipped) return;

    if (!isValidHexColor(hexColor)) {
      setCustomHexError('Please enter a valid hex color code (e.g. #FFFFFF).');
      return;
    }

    setCustomHexError(null);
    const normalized = normalizeHexColor(hexColor);
    setActiveColor(normalized);

    const currentToken = ++compositeTokenRef.current;
    setIsCompositing(true);

    try {
      const result = await compositeImageOverColor(cutoutBlob, normalized, 'image/jpeg', 0.95);

      // Check if another composite was requested while this one was rendering
      if (currentToken !== compositeTokenRef.current) {
        return;
      }

      const newUrl = URL.createObjectURL(result.blob);
      onColorComposited(normalized, result.blob, newUrl);
    } catch (err: unknown) {
      if (currentToken === compositeTokenRef.current) {
        console.error('Failed to composite background color:', err);
      }
    } finally {
      if (currentToken === compositeTokenRef.current) {
        setIsCompositing(false);
      }
    }
  };

  // Initial composite on mount if cutout exists but compositedUrl is not ready
  useEffect(() => {
    if (cutoutBlob && !isBackgroundSkipped && !compositedUrl) {
      applyColor(activeColor);
    }
  }, [cutoutBlob, isBackgroundSkipped]);

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setCustomHexInput(rawValue);

    if (isValidHexColor(rawValue)) {
      setCustomHexError(null);
      applyColor(rawValue);
    } else {
      setCustomHexError('Enter a valid 3- or 6-digit hex code (e.g. #336699)');
    }
  };

  const handleCustomColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value.toUpperCase();
    setCustomHexInput(hex);
    setCustomHexError(null);
    applyColor(hex);
  };

  const activePreset = COLOR_PRESETS.find(
    (p) => p.hex.toUpperCase() === activeColor.toUpperCase()
  );

  return (
    <div className="w-full rounded-xl border border-[#E3E1DC] bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Step Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#E3E1DC] pb-3 sm:pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#393834]">
            Background Color
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#777570]">
            {isBackgroundSkipped || !cutoutBlob
              ? 'Original photo background retained. Advance to physical dimensions or re-enable background removal.'
              : 'Choose a standard solid background color or specify a custom shade.'}
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Preview Stage (md:col-span-6) */}
        <div className="md:col-span-6 flex flex-col items-center justify-center rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-4 min-h-[260px] sm:min-h-[320px]">
          <div className="relative max-h-[300px] max-w-full overflow-hidden rounded-lg shadow-sm bg-white border border-[#E3E1DC]">
            <img
              src={
                isBackgroundSkipped || !cutoutBlob
                  ? croppedPhotoUrl
                  : compositedUrl ?? croppedPhotoUrl
              }
              alt="Document photo color preview"
              className="max-h-[280px] max-w-full object-contain rounded-lg"
            />

            {isCompositing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-xs">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#55534F] border-t-transparent" />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-[#55534F]">
            {isBackgroundSkipped || !cutoutBlob ? (
              <span className="font-medium text-[#777570]">
                Original Photo Background Active
              </span>
            ) : (
              <>
                <span
                  className="h-3.5 w-3.5 rounded-full border border-[#E3E1DC] shadow-xs shrink-0"
                  style={{ backgroundColor: activeColor }}
                  aria-hidden="true"
                />
                <span className="font-semibold text-[#393834]">
                  {activePreset ? activePreset.name : 'Custom Color'}
                </span>
                <span className="font-mono text-[#777570] tabular-nums">({activeColor})</span>
              </>
            )}
          </div>
        </div>

        {/* Right Controls Panel (md:col-span-6) */}
        <div className="md:col-span-6 flex flex-col justify-between gap-4">
          {isBackgroundSkipped || !cutoutBlob ? (
            // Concise explainer when background removal was skipped
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-4 text-xs text-[#55534F]">
                <p className="font-semibold text-[#393834]">Original Background Retained</p>
                <p className="mt-1 leading-relaxed text-[#777570]">
                  Solid background colors require isolating the subject. Since you chose to keep your original background, you can proceed directly to setting photo dimensions.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onBackToBackground}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-3 py-1.5 text-xs font-medium text-[#393834] hover:bg-[#FAF9F6] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
                  >
                    <span>Enable Background Removal in Step 3</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Color Selector when cutout is available
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-[#393834]">
                  Solid Background Colors
                </label>
                <p className="mt-0.5 text-xs text-[#777570]">
                  Select a common standard background color:
                </p>

                {/* Preset Color Swatches */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-2">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = activeColor.toUpperCase() === preset.hex.toUpperCase();

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyColor(preset.hex)}
                        aria-pressed={isSelected}
                        className={`flex min-h-[48px] items-center gap-3 rounded-lg border p-2.5 text-left transition-all touch-press focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none ${
                          isSelected
                            ? 'border-[#55534F] bg-[#FAF9F6] ring-2 ring-[#55534F]/20'
                            : 'border-[#E3E1DC] bg-white hover:border-[#D0CECA] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        {/* Swatch color bubble with concentric ring if selected */}
                        <span
                          className={`h-6 w-6 shrink-0 rounded-full border border-black/10 shadow-xs ${
                            isSelected ? 'ring-2 ring-[#55534F] ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#393834] truncate">
                            {preset.name}
                          </p>
                          <p className="text-[11px] font-mono text-[#777570] tabular-nums">
                            {preset.hex}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Selector */}
              <div className="rounded-lg border border-[#E3E1DC] bg-[#FAF9F6] p-3.5">
                <label htmlFor="custom-color-hex" className="text-xs font-semibold text-[#393834]">
                  Custom Solid Color
                </label>
                <p className="mt-0.5 text-[11px] text-[#777570]">
                  Pick any custom color for badges, forms, or specific agency requirements.
                </p>

                <div className="mt-2.5 flex items-center gap-2.5">
                  {/* Native Color Picker Bubble */}
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#E3E1DC] shadow-xs">
                    <input
                      type="color"
                      id="custom-color-picker"
                      aria-label="Custom color picker"
                      value={isValidHexColor(customHexInput) ? normalizeHexColor(customHexInput) : '#FFFFFF'}
                      onChange={handleCustomColorPickerChange}
                      className="absolute -inset-2 h-14 w-14 cursor-pointer border-0"
                    />
                  </div>

                  {/* Hex Text Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      id="custom-color-hex"
                      value={customHexInput}
                      onChange={handleCustomHexChange}
                      placeholder="#FFFFFF"
                      maxLength={7}
                      className="w-full min-h-[42px] rounded-lg border border-[#E3E1DC] bg-white px-3 py-1.5 font-mono text-xs text-[#393834] uppercase tabular-nums focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none"
                    />
                  </div>
                </div>

                {customHexError && (
                  <p className="mt-1 text-[11px] font-medium text-red-600" role="alert">
                    {customHexError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Navigation Footer */}
          <div className="flex flex-col gap-2.5 pt-3 border-t border-[#E3E1DC]">
            <button
              type="button"
              onClick={onProceedToDimensions}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#55534F] hover:bg-[#45433F] active:bg-[#383633] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:ring-offset-2 focus-visible:outline-none touch-press"
            >
              <span>Continue to Dimensions</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onBackToBackground}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-[#E3E1DC] bg-white px-3 py-2 text-xs font-medium text-[#777570] hover:text-[#393834] hover:bg-[#FAF9F6] active:bg-[#F0EEEA] focus-visible:ring-2 focus-visible:ring-[#55534F] focus-visible:outline-none touch-press"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Background</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
