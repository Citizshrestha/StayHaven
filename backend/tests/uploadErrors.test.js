import test from 'node:test';
import assert from 'node:assert/strict';
import multer from 'multer';
import { isAllowedImageBuffer } from '../middleware/upload.js';
import { errorHandler } from '../middleware/errorHandler.js';

const run = (err) => {
  let status, body;
  errorHandler(err, { path: '/x', method: 'POST' }, { status(c) { status = c; return this; }, json(b) { body = b; return this; } }, () => {});
  return { status, body };
};

test('image signature sniffing rejects disguised files', () => {
  assert.equal(isAllowedImageBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), true);
  assert.equal(isAllowedImageBuffer(Buffer.from('89504e470d0a1a0a0000000d', 'hex')), true);
  assert.equal(isAllowedImageBuffer(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])), true);
  assert.equal(isAllowedImageBuffer(Buffer.from('<svg onload=alert(1)></svg>')), false);
  assert.equal(isAllowedImageBuffer(Buffer.from('%PDF-1.7 aaaaaaa')), false);
});

test('upload and validation errors are client errors, not 500', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.equal(run(new multer.MulterError('LIMIT_FILE_SIZE')).status, 413);
    assert.equal(run(new multer.MulterError('LIMIT_UNEXPECTED_FILE')).status, 400);
    assert.equal(run(Object.assign(new Error('Only JPEG, PNG, JPG, and WEBP images are allowed'), { status: 400 })).status, 400);
    const crash = run(new Error('db exploded at host x'));
    assert.equal(crash.status, 500);
    assert.equal(crash.body.message, 'An error occurred. Please try again later.');
    assert.equal(crash.body.stack, undefined);
    assert.equal(run(Object.assign(new Error('Cast'), { name: 'CastError', value: 'x' })).status, 404);
  } finally {
    process.env.NODE_ENV = previous;
  }
});
