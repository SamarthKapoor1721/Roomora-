import { describe, expect, it } from 'vitest';
import { isHostedImage, publicImage } from './images';

describe('listing image URLs', () => {
  it('returns Cloudinary URLs unchanged', () => {
    const url = 'https://res.cloudinary.com/rbtw8euz/image/upload/v1791890543/photo.png';
    expect(isHostedImage(url)).toBe(true);
    expect(publicImage({ id: 'one', path: url, originalName: 'photo.png', sortOrder: 0 }).url).toBe(url);
  });

  it('keeps local images on the uploads route', () => {
    expect(publicImage({ id: 'two', path: 'property-images/photo.png', originalName: 'photo.png', sortOrder: 0 }).url).toBe('/uploads/property-images/photo.png');
    expect(isHostedImage('https://res.cloudinary.com.evil.example/photo.png')).toBe(false);
  });
});
