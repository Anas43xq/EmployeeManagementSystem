import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteEmployeePhoto, uploadEmployeePhoto } from './photoUtils';

// Mock the supabase module
vi.mock('../services/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from '../services/supabase';

describe('photoUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteEmployeePhoto', () => {
    it('should do nothing for null or undefined URLs', async () => {
      const mockFrom = vi.fn();
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      await deleteEmployeePhoto(null);
      await deleteEmployeePhoto(undefined);

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should extract filename from URL and call remove', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({ remove: mockRemove });
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      await deleteEmployeePhoto('https://example.com/storage/photo.jpg');

      expect(mockFrom).toHaveBeenCalledWith('employee-photos');
      expect(mockRemove).toHaveBeenCalledWith(['photo.jpg']);
    });

    it('should handle malformed URLs gracefully', async () => {
      const mockFrom = vi.fn();
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      await deleteEmployeePhoto('not-a-valid-url');

      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should ignore errors during deletion', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: { message: 'Not found' } });
      const mockFrom = vi.fn().mockReturnValue({ remove: mockRemove });
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      // Should not throw
      await expect(deleteEmployeePhoto('https://example.com/storage/photo.jpg')).resolves.not.toThrow();
    });
  });

  describe('uploadEmployeePhoto', () => {
    const mockFile = new File(['dummy content'], 'photo.jpg', { type: 'image/jpeg' });

    it('should reject files exceeding size limit (5MB)', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      await expect(uploadEmployeePhoto('emp-123', largeFile)).rejects.toThrow(
        'File size exceeds 5 MB limit'
      );
    });

    it('should reject non-image MIME types', async () => {
      const textFile = new File(['text content'], 'file.txt', { type: 'text/plain' });

      await expect(uploadEmployeePhoto('emp-123', textFile)).rejects.toThrow(
        'Only JPEG, PNG, and WebP images are allowed'
      );
    });

    it('should accept JPEG, PNG, and WebP files', async () => {
      const mimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

      for (const mimeType of mimeTypes) {
        const file = new File(['content'], 'photo', { type: mimeType });
        const mockUpload = vi.fn().mockResolvedValue({ error: null });
        const mockGetUrl = vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/photo.jpg' },
        });
        const mockFrom = vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetUrl,
          remove: vi.fn().mockResolvedValue({ error: null }),
        });
        vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

        await uploadEmployeePhoto('emp-123', file);

        expect(mockUpload).toHaveBeenCalled();
      }
    });

    it('should generate filename with employeeId and timestamp', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockGetUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/photo.jpg' },
      });
      const mockFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetUrl,
        remove: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      await uploadEmployeePhoto('emp-456', mockFile);

      const [filename] = mockUpload.mock.calls[0];
      expect(filename).toMatch(/^emp-456_\d+\.jpg$/);
    });

    it('should delete old photo before uploading new one', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      const mockGetUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/new-photo.jpg' },
      });
      const mockFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetUrl,
        remove: mockRemove,
      });
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      await uploadEmployeePhoto('emp-789', mockFile, 'https://example.com/old-photo.jpg');

      // Should have called remove for old photo
      expect(mockRemove).toHaveBeenCalledWith(['old-photo.jpg']);
    });

    it('should return public URL after successful upload', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ error: null });
      const publicUrl = 'https://example.com/uploaded-photo.jpg';
      const mockGetUrl = vi.fn().mockReturnValue({
        data: { publicUrl },
      });
      const mockFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetUrl,
        remove: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      const result = await uploadEmployeePhoto('emp-999', mockFile);

      expect(result).toBe(publicUrl);
    });

    it('should throw descriptive error for storage config issues', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        error: { message: 'bucket not found' },
      });
      const mockFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        remove: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      await expect(uploadEmployeePhoto('emp-123', mockFile)).rejects.toThrow(
        'Storage not configured'
      );
    });

    it('should throw generic upload error for other issues', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        error: { message: 'Permission denied' },
      });
      const mockFrom = vi.fn().mockReturnValue({
        upload: mockUpload,
        remove: vi.fn().mockResolvedValue({ error: null }),
      });
      vi.mocked(supabase.storage.from).mockImplementation(mockFrom);

      await expect(uploadEmployeePhoto('emp-123', mockFile)).rejects.toThrow(
        'Upload failed'
      );
    });
  });
});
