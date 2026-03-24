import { supabase } from '../supabase';

const BUCKET = 'employee-photos';
const CACHE_CONTROL_SECONDS = '3600';

/** Removes a stored photo by filename from the employee-photos bucket. Silently ignores errors. */
export async function deletePhotoByFilename(filename: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([filename]);
    if (error) return;
  } catch {
    // ignore
  }
}

/** Uploads a file to the employee-photos bucket. Returns the upload error if one occurred. */
export async function uploadPhotoFile(
  filename: string,
  file: File,
): Promise<{ message: string } | null> {
  const { error } = await supabase.storage.from(BUCKET).upload(filename, file, {
    cacheControl: CACHE_CONTROL_SECONDS,
    upsert: false,
  });
  return error ?? null;
}

/** Returns the public URL for a stored photo filename. */
export function getPhotoPublicUrl(filename: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
