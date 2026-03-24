import { deletePhotoByFilename, uploadPhotoFile, getPhotoPublicUrl } from '../services/photos';

const MAX_SIZE_MB = 5;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

function extractFilename(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const parts = url.pathname.split('/');
    const filename = parts[parts.length - 1];
    return filename || null;
  } catch {
    return null;
  }
}

export async function deleteEmployeePhoto(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl) return;
  const filename = extractFilename(photoUrl);
  if (!filename) return;

  try {
    await deletePhotoByFilename(filename);
  } catch {
    // ignore
  }
}

export async function uploadEmployeePhoto(
  employeeId: string,
  file: File,
  oldPhotoUrl?: string | null
): Promise<string> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) throw new Error(`File size exceeds ${MAX_SIZE_MB} MB limit`);
  if (!ALLOWED_MIMES.includes(file.type)) throw new Error('Only JPEG, PNG, and WebP images are allowed');

  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${employeeId}_${Date.now()}.${ext}`;

  // Delete previous photo before uploading the new one
  await deleteEmployeePhoto(oldPhotoUrl);

  const uploadError = await uploadPhotoFile(filename, file);

  if (uploadError) {
    if (
      uploadError.message.includes('bucket') ||
      uploadError.message.includes('not found')
    ) {
      throw new Error('Storage not configured — please contact your administrator');
    }
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  return getPhotoPublicUrl(filename);
}
