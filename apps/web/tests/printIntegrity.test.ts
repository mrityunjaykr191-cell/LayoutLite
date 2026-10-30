import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Browser Printing Integrity & CSS Regression Checks', () => {
  const cssPath = path.resolve(import.meta.dirname, '../src/index.css');
  const modalPath = path.resolve(import.meta.dirname, '../src/components/PrePrintWarningModal.tsx');
  const exportStepPath = path.resolve(import.meta.dirname, '../src/components/ExportPrintStep.tsx');

  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  const exportStepContent = fs.readFileSync(exportStepPath, 'utf-8');

  it('declares strict @media print rules in index.css', () => {
    assert.ok(cssContent.includes('@media print'), 'index.css must include @media print');
    assert.ok(cssContent.includes('size: 210mm 297mm') || cssContent.includes('size: A4 portrait'), 'Must define exact A4 print size');
    assert.ok(cssContent.includes('margin: 0'), 'Must set zero print margins');
  });

  it('hides all modals, dialogs, backdrops, and chrome during print in index.css', () => {
    assert.ok(cssContent.includes('.no-print'), 'index.css must hide .no-print elements');
    assert.ok(cssContent.includes('[role="dialog"]'), 'index.css must hide [role="dialog"]');
    assert.ok(cssContent.includes('[role="presentation"]'), 'index.css must hide [role="presentation"] (backdrops)');
    assert.ok(cssContent.includes('dialog'), 'index.css must hide dialog elements');
  });

  it('positions .printable-a4-sheet with exact physical dimensions and top elevation in print mode', () => {
    assert.ok(cssContent.includes('.printable-a4-sheet'), 'Must define .printable-a4-sheet class');
    assert.ok(cssContent.includes('width: 210mm'), 'Must set exact 210mm width');
    assert.ok(cssContent.includes('height: 297mm'), 'Must set exact 297mm height');
    assert.ok(cssContent.includes('z-index: 9999'), 'Must elevate printable sheet to top layer');
  });

  it('resets workspace containers to transparent to avoid gray background bleed', () => {
    assert.ok(cssContent.includes('#root > div'), 'Must reset #root > div');
    assert.ok(cssContent.includes('main > div'), 'Must reset main > div');
    assert.ok(cssContent.includes('background: transparent'), 'Must force transparent background');
  });

  it('attaches no-print class to PrePrintWarningModal root container', () => {
    assert.ok(
      modalContent.includes('no-print'),
      'PrePrintWarningModal root container must include no-print class'
    );
  });

  it('conditionally renders calibration ruler in ExportPrintStep and defaults to off', () => {
    assert.ok(
      exportStepContent.includes('includeCalibrationRuler'),
      'ExportPrintStep must manage includeCalibrationRuler'
    );
    assert.ok(
      exportStepContent.includes('useState<boolean>(false)'),
      'Calibration ruler must default to false (OFF by default)'
    );
    assert.ok(
      exportStepContent.includes('{includeCalibrationRuler &&'),
      'Calibration ruler in print SVG must be conditional'
    );
  });

  it('uses flushSync in ExportPrintStep before window.print to guarantee modal is unmounted', () => {
    assert.ok(
      exportStepContent.includes('flushSync'),
      'ExportPrintStep must import and call flushSync before window.print'
    );
    assert.ok(
      exportStepContent.includes('setModalOpen(false)'),
      'Must dismiss modal before printing'
    );
  });
});
