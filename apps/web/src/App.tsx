import React, { useState, useEffect, useRef } from 'react';
import {
  PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS,
  PhotoDimensions,
  SheetLayoutSettings,
  SheetLayoutResult,
  DEFAULT_LAYOUT_SETTINGS,
  calculateSheetLayout,
} from '@passport-photo/shared';
import { Header } from './components/Header';
import { Stepper } from './components/Stepper';
import { UploadDropzone } from './components/UploadDropzone';
import { CropEditor } from './components/CropEditor';
import { BackgroundStep } from './components/BackgroundStep';
import { ColorStep } from './components/ColorStep';
import { DimensionsStep } from './components/DimensionsStep';
import { SheetLayoutStep } from './components/SheetLayoutStep';
import { ExportPrintStep } from './components/ExportPrintStep';
import { WorkflowExplainer } from './components/WorkflowExplainer';
import { Footer } from './components/Footer';
import {
  validateImageFile,
  validateImageDimensions,
  getImageOrientationLabel,
} from './utils/fileValidation';
import { createImageLoadSession, ImageLoadSession } from './utils/imageLoadManager';
import { CropSettings, createDefaultCropSettings } from './utils/cropGeometry';
import { CroppedPhotoResult } from './utils/cropExporter';
import { createPhotoUrlTracker, PhotoUrlTracker } from './utils/photoUrlTracker';
import { DEFAULT_BACKGROUND_COLOR } from './utils/colorCompositor';
import {
  providerRegistry,
  type BackgroundRemovalMode,
} from './services/backgroundRemovalClient.ts';

export interface RawPhotoMetadata {
  readonly name: string;
  readonly size: number;
  readonly width: number;
  readonly height: number;
  readonly objectUrl: string;
  readonly file: Blob;
  readonly orientationLabel: 'Portrait' | 'Landscape' | 'Square';
}

export const App: React.FC = () => {
  // Step 1: Uploaded master photo
  const [rawPhoto, setRawPhoto] = useState<RawPhotoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Workflow step: 1 (Upload), 2 (Crop), 3 (Background), 4 (Color), 5 (Dimensions)
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);

  // Step 2: Interactive crop state & exported crop result
  const [isEditingCrop, setIsEditingCrop] = useState<boolean>(true);
  const [cropSettings, setCropSettings] = useState<CropSettings>(createDefaultCropSettings());
  const [croppedPhoto, setCroppedPhoto] = useState<CroppedPhotoResult | null>(null);

  // Step 3: Background removal state
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [isBackgroundSkipped, setIsBackgroundSkipped] = useState<boolean>(false);

  // Step 4: Solid background color & compositing state
  const [selectedColorHex, setSelectedColorHex] = useState<string>(DEFAULT_BACKGROUND_COLOR);
  const [compositedBlob, setCompositedBlob] = useState<Blob | null>(null);
  const [compositedUrl, setCompositedUrl] = useState<string | null>(null);

  // Provisional physical photo dimensions from shared core
  const [photoDimensions, setPhotoDimensions] = useState<PhotoDimensions>(PROVISIONAL_DEFAULT_PHOTO_DIMENSIONS);

  // Background removal mode state (kept synchronized with providerRegistry)
  const [bgRemovalMode, setBgRemovalMode] = useState<BackgroundRemovalMode>(() =>
    providerRegistry.getActiveMode()
  );

  useEffect(() => {
    return providerRegistry.subscribe(({ mode }) => {
      setBgRemovalMode(mode);
    });
  }, []);

  // Step 6: A4 Sheet Layout settings & calculated result
  const [layoutSettings, setLayoutSettings] = useState<SheetLayoutSettings>(DEFAULT_LAYOUT_SETTINGS);
  const [layoutResult, setLayoutResult] = useState<SheetLayoutResult | null>(null);

  // Active image decoding session to cancel stale asynchronous loads
  const sessionRef = useRef<ImageLoadSession>(createImageLoadSession());

  // Object URL lifecycle tracker to manage raw, cropped, cutout, and composited URLs safely
  const urlTrackerRef = useRef<PhotoUrlTracker>(createPhotoUrlTracker());

  // Clean up object URLs and cancel pending loads strictly on component unmount
  useEffect(() => {
    const session = sessionRef.current;
    const tracker = urlTrackerRef.current;
    return () => {
      session.cancel();
      tracker.cleanup();
    };
  }, []);

  const processSelectedFile = (file: File) => {
    // 1. Validate file format and size before decoding
    const fileValidation = validateImageFile(file);
    if (!fileValidation.valid) {
      setErrorMessage(fileValidation.errors.join(' '));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // 2. Start a new decode session (invalidates any previous in-flight loads)
    const sessionId = sessionRef.current.nextSessionId();

    // 3. Create local object URL
    const objectUrl = URL.createObjectURL(file);

    // 4. Asynchronously decode image and read dimensions
    const img = new Image();

    img.onload = () => {
      if (!sessionRef.current.isActive(sessionId)) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const dimValidation = validateImageDimensions(width, height);
      if (!dimValidation.valid) {
        URL.revokeObjectURL(objectUrl);
        setIsLoading(false);
        setErrorMessage(dimValidation.message ?? 'Image dimensions could not be read.');
        return;
      }

      // Track active master photo URL (safely revokes downstream URLs)
      urlTrackerRef.current.setRawPhotoUrl(objectUrl);

      const orientation = getImageOrientationLabel(width, height);

      setRawPhoto({
        name: file.name,
        size: file.size,
        width,
        height,
        objectUrl,
        file,
        orientationLabel: orientation,
      });

      // Reset downstream steps and advance to Step 2 (Crop)
      setCropSettings(createDefaultCropSettings());
      setCroppedPhoto(null);
      setCutoutBlob(null);
      setCutoutUrl(null);
      setIsBackgroundSkipped(false);
      setCompositedBlob(null);
      setCompositedUrl(null);
      setLayoutSettings(DEFAULT_LAYOUT_SETTINGS);
      setLayoutResult(null);
      setIsEditingCrop(true);
      setActiveWorkflowStep(2);
      setIsLoading(false);
    };

    img.onerror = () => {
      if (!sessionRef.current.isActive(sessionId)) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      URL.revokeObjectURL(objectUrl);
      setIsLoading(false);
      setErrorMessage(
        'The selected image appears to be corrupted or cannot be decoded. Please try a different photo.'
      );
    };

    img.src = objectUrl;
  };

  const handleResetToUpload = () => {
    sessionRef.current.cancel();
    urlTrackerRef.current.reset();
    setRawPhoto(null);
    setCroppedPhoto(null);
    setCutoutBlob(null);
    setCutoutUrl(null);
    setIsBackgroundSkipped(false);
    setCompositedBlob(null);
    setCompositedUrl(null);
    setLayoutSettings(DEFAULT_LAYOUT_SETTINGS);
    setLayoutResult(null);
    setIsEditingCrop(true);
    setActiveWorkflowStep(1);
    setErrorMessage(null);
  };

  const handleApplyCropSuccess = (result: CroppedPhotoResult) => {
    // Record new crop URL (safely revokes any previous crop, cutout, or composite URLs)
    urlTrackerRef.current.setCroppedPhotoUrl(result.objectUrl);
    setCroppedPhoto(result);
    setCropSettings(result.cropSettings);

    // Clear stale cutout & composited states since framing changed
    setCutoutBlob(null);
    setCutoutUrl(null);
    setIsBackgroundSkipped(false);
    setCompositedBlob(null);
    setCompositedUrl(null);
    setLayoutResult(null);

    setIsEditingCrop(false);
    setActiveWorkflowStep(3); // Advance to Step 3: Background Removal
  };

  const handleCutoutGenerated = (blob: Blob, objectUrl: string) => {
    urlTrackerRef.current.setCutoutUrl(objectUrl);
    setCutoutBlob(blob);
    setCutoutUrl(objectUrl);
    setIsBackgroundSkipped(false);
    // Clear any outdated composite
    setCompositedBlob(null);
    setCompositedUrl(null);
  };

  const handleSkipBackground = () => {
    setIsBackgroundSkipped(true);
    // Move directly to Step 4 (Color Step explains background was kept)
    setActiveWorkflowStep(4);
  };

  const handleRevertToOriginalBackground = () => {
    urlTrackerRef.current.setCutoutUrl(null);
    setCutoutBlob(null);
    setCutoutUrl(null);
    setIsBackgroundSkipped(false);
    setCompositedBlob(null);
    setCompositedUrl(null);
  };

  const handleColorComposited = (hex: string, blob: Blob, objectUrl: string) => {
    urlTrackerRef.current.setCompositedUrl(objectUrl);
    setSelectedColorHex(hex);
    setCompositedBlob(blob);
    setCompositedUrl(objectUrl);
  };

  // Compute active step ID for Stepper
  const currentStep = !rawPhoto
    ? 1
    : isEditingCrop
    ? 2
    : activeWorkflowStep;

  return (
    <div className="flex min-h-dvh flex-col bg-[#F5F4F1] text-[#393834] antialiased">
      {/* Top Application Header */}
      <Header />

      {/* Workflow Stepper Navigation */}
      <Stepper currentStep={currentStep} />

      {/* Main Workspace Area with mobile-first padding */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-3 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* STEP 1: Upload Photo Dropzone */}
          {!rawPhoto && (
            <div className="flex flex-col gap-5 sm:gap-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#393834]">
                  Upload Portrait Photo
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#777570]">
                  Select a front-facing headshot to crop, frame, and tile for physical printing.
                </p>
              </div>

              <UploadDropzone
                onFileSelected={processSelectedFile}
                isLoading={isLoading}
                errorMessage={errorMessage}
                onClearError={() => setErrorMessage(null)}
                mode={bgRemovalMode}
              />

              <WorkflowExplainer />
            </div>
          )}

          {/* STEP 2: Interactive Crop Editor */}
          {rawPhoto && isEditingCrop && (
            <CropEditor
              imageFile={rawPhoto.file}
              imageObjectUrl={rawPhoto.objectUrl}
              sourceWidth={rawPhoto.width}
              sourceHeight={rawPhoto.height}
              photoDimensions={photoDimensions}
              initialCropSettings={cropSettings}
              initialCropBox={croppedPhoto?.cropBox ?? cropSettings.cropBox ?? null}
              onApplyCrop={handleApplyCropSuccess}
              onCancel={handleResetToUpload}
            />
          )}

          {/* STEP 3: Optional AI Background Removal */}
          {rawPhoto && !isEditingCrop && croppedPhoto && activeWorkflowStep === 3 && (
            <BackgroundStep
              croppedPhotoUrl={croppedPhoto.objectUrl}
              croppedBlob={croppedPhoto.blob}
              cutoutUrl={cutoutUrl}
              isBackgroundSkipped={isBackgroundSkipped}
              onCutoutGenerated={handleCutoutGenerated}
              onSkipBackground={handleSkipBackground}
              onRevertToOriginal={handleRevertToOriginalBackground}
              onBackToCrop={() => {
                setIsEditingCrop(true);
                setActiveWorkflowStep(2);
              }}
              onProceedToColor={() => setActiveWorkflowStep(4)}
              onReplacePhoto={handleResetToUpload}
              activeMode={bgRemovalMode}
              onModeChange={(newMode) => providerRegistry.setActiveMode(newMode)}
            />
          )}

          {/* STEP 4: Solid Background Color Selection */}
          {rawPhoto && !isEditingCrop && croppedPhoto && activeWorkflowStep === 4 && (
            <ColorStep
              cutoutBlob={cutoutBlob}
              cutoutUrl={cutoutUrl}
              croppedPhotoUrl={croppedPhoto.objectUrl}
              isBackgroundSkipped={isBackgroundSkipped}
              selectedColorHex={selectedColorHex}
              compositedUrl={compositedUrl}
              onColorComposited={handleColorComposited}
              onBackToBackground={() => setActiveWorkflowStep(3)}
              onProceedToDimensions={() => setActiveWorkflowStep(5)}
            />
          )}

          {/* STEP 5: Physical Photo Dimension Controls */}
          {rawPhoto && !isEditingCrop && croppedPhoto && activeWorkflowStep === 5 && (
            <DimensionsStep
              currentDimensions={photoDimensions}
              previewPhotoUrl={
                isBackgroundSkipped || !cutoutBlob
                  ? croppedPhoto.objectUrl
                  : compositedUrl ?? croppedPhoto.objectUrl
              }
              selectedColorHex={selectedColorHex}
              isBackgroundSkipped={isBackgroundSkipped}
              onDimensionsChange={(newDimensions) => setPhotoDimensions(newDimensions)}
              onBackToPreviousStep={() => setActiveWorkflowStep(isBackgroundSkipped ? 3 : 4)}
              onProceedToSheetLayout={() => setActiveWorkflowStep(6)}
              onReCropPhoto={() => {
                setIsEditingCrop(true);
                setActiveWorkflowStep(2);
              }}
              onReplacePhoto={handleResetToUpload}
            />
          )}

          {/* STEP 6: A4 Sheet Layout & Tiling Controls */}
          {rawPhoto && !isEditingCrop && croppedPhoto && activeWorkflowStep === 6 && (
            <SheetLayoutStep
              photoDimensions={photoDimensions}
              previewPhotoUrl={
                isBackgroundSkipped || !cutoutBlob
                  ? croppedPhoto.objectUrl
                  : compositedUrl ?? croppedPhoto.objectUrl
              }
              initialSettings={layoutSettings}
              onBackToDimensions={() => setActiveWorkflowStep(5)}
              onProceedToExport={(finalSettings, finalResult) => {
                setLayoutSettings(finalSettings);
                setLayoutResult(finalResult);
                setActiveWorkflowStep(7);
              }}
              onReCropPhoto={() => {
                setIsEditingCrop(true);
                setActiveWorkflowStep(2);
              }}
              onReplacePhoto={handleResetToUpload}
            />
          )}

          {/* STEP 7: Print-Ready 300 DPI PDF & Direct Browser Printing */}
          {rawPhoto && !isEditingCrop && croppedPhoto && activeWorkflowStep >= 7 && (
            <ExportPrintStep
              photoDimensions={photoDimensions}
              layoutResult={layoutResult ?? calculateSheetLayout(layoutSettings, photoDimensions)}
              previewPhotoUrl={
                isBackgroundSkipped || !cutoutBlob
                  ? croppedPhoto.objectUrl
                  : compositedUrl ?? croppedPhoto.objectUrl
              }
              photoBlob={
                isBackgroundSkipped || !cutoutBlob
                  ? croppedPhoto.blob
                  : compositedBlob ?? cutoutBlob
              }
              onBackToLayout={() => setActiveWorkflowStep(6)}
              onAdjustDimensions={() => setActiveWorkflowStep(5)}
              onStartOver={handleResetToUpload}
            />
          )}
        </div>
      </main>

      {/* Application Footer */}
      <Footer />
    </div>
  );
};

export default App;
