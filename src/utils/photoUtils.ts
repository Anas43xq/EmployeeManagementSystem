import { supabase } from '../services/supabase';

const BUCKET = 'employee-photos';
const MAX_SIZE_MB = 5;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Extract the storage filename from a public Supabase storage URL.
 * The URL format is: .../storage/v1/object/public/<bucket>/<filename>
 */
function extractFilename(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split('/');
    // filename is the last segment
    const filename = parts[parts.length - 1];
    return filename || null;
  } catch {
    return null;
  }
}

/**
 * Delete an employee photo from Supabase Storage.
 * Silently ignores errors so a failed delete never blocks an upload.
 */
export async function deleteEmployeePhoto(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl) return;
  const filename = extractFilename(photoUrl);
  if (!filename) return;

  try {
    const { error } = await supabase.storage.from(BUCKET).remove([filename]);
    if (error) {
      console.warn('Failed to delete old employee photo:', error.message);
    }
  } catch (err) {
    console.warn('Error deleting employee photo:', (err as Error).message);
  }
}

/**
 * Upload a new employee photo, automatically deleting the previous one.
 * Returns the public URL of the uploaded photo.
 */
export async function uploadEmployeePhoto(
  employeeId: string,
  file: File,
  oldPhotoUrl?: string | null
): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size exceeds ${MAX_SIZE_MB} MB limit`);
  }
  if (!ALLOWED_MIMES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed');
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${employeeId}_${Date.now()}.${ext}`;

  // Delete previous photo before uploading the new one
  await deleteEmployeePhoto(oldPhotoUrl);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filename, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    if (
      uploadError.message.includes('bucket') ||
      uploadError.message.includes('not found')
    ) {
      throw new Error('Storage not configured — please contact your administrator');
    }
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return urlData.publicUrl;
}
