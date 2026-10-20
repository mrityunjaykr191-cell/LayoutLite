import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOR_PRESETS,
  DEFAULT_BACKGROUND_COLOR,
  isValidHexColor,
  normalizeHexColor,
} from '../src/utils/colorCompositor.ts';

describe('Color Compositor & Preset Validation', () => {
  it('validates standard 6-digit hex color strings', () => {
    assert.equal(isValidHexColor('#FFFFFF'), true);
    assert.equal(isValidHexColor('#ffffff'), true);
    assert.equal(isValidHexColor('#E6F0FA'), true);
    assert.equal(isValidHexColor('#EDEDED'), true);
    assert.equal(isValidHexColor('#000000'), true);
    assert.equal(isValidHexColor('#336699'), true);
  });

  it('validates standard 3-digit shorthand hex color strings', () => {
    assert.equal(isValidHexColor('#FFF'), true);
    assert.equal(isValidHexColor('#fff'), true);
    assert.equal(isValidHexColor('#000'), true);
    assert.equal(isValidHexColor('#abc'), true);
  });

  it('rejects invalid or malformed color strings', () => {
    assert.equal(isValidHexColor('FFFFFF'), false); // Missing '#'
    assert.equal(isValidHexColor('#FFFF'), false); // 4 digits
    assert.equal(isValidHexColor('#FFFFF'), false); // 5 digits
    assert.equal(isValidHexColor('#FFFFFFF'), false); // 7 digits
    assert.equal(isValidHexColor('#GGGGGG'), false); // Non-hex characters
    assert.equal(isValidHexColor('blue'), false); // Named color
    assert.equal(isValidHexColor('rgb(255,255,255)'), false); // CSS rgb
    assert.equal(isValidHexColor(''), false); // Empty
    assert.equal(isValidHexColor(null as unknown as string), false);
  });

  it('normalizes 3-digit shorthand hex to 6-digit uppercase hex', () => {
    assert.equal(normalizeHexColor('#fff'), '#FFFFFF');
    assert.equal(normalizeHexColor('#000'), '#000000');
    assert.equal(normalizeHexColor('#f0a'), '#FF00AA');
  });

  it('normalizes 6-digit lowercase hex to uppercase hex', () => {
    assert.equal(normalizeHexColor('#ffffff'), '#FFFFFF');
    assert.equal(normalizeHexColor('#e6f0fa'), '#E6F0FA');
    assert.equal(normalizeHexColor('#ededed'), '#EDEDED');
  });

  it('throws an error when normalizing invalid hex color', () => {
    assert.throws(() => normalizeHexColor('not-a-color'), /Invalid hex color/);
  });

  it('provides all four required preset colors', () => {
    assert.equal(COLOR_PRESETS.length, 4);

    const presetHexes = COLOR_PRESETS.map((p) => p.hex);
    assert.ok(presetHexes.includes('#FFFFFF'), 'Must include Pure White #FFFFFF');
    assert.ok(presetHexes.includes('#F8F9FA'), 'Must include Off-White #F8F9FA');
    assert.ok(presetHexes.includes('#E6F0FA'), 'Must include Light Blue #E6F0FA');
    assert.ok(presetHexes.includes('#EDEDED'), 'Must include Light Gray #EDEDED');
  });

  it('defaults background color to pure white', () => {
    assert.equal(DEFAULT_BACKGROUND_COLOR, '#FFFFFF');
  });
});
