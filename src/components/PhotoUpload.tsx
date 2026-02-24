import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, User } from 'lucide-react';
import { uploadEmployeePhoto, deleteEmployeePhoto } from '../utils/photoUtils';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  employeeId?: string;
  onPhotoChange: (url: string | null) => void;
  firstName?: string;
  lastName?: string;
}

export default function PhotoUpload({
  currentPhotoUrl,
  employeeId,
  onPhotoChange,
  firstName = '',
  lastName = '',
}: PhotoUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track the URL of the last photo uploaded THIS session so we delete it
  // when the user uploads another photo before saving the form.
  const lastUploadedUrlRef = useRef<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(t('employees.photoInvalidType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(t('employees.photoTooLarge'));
      return;
    }

    // Show a local preview immediately while upload happens
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      // The photo to delete is either: a previously uploaded photo this session
      // (lastUploadedUrlRef) OR the original DB photo passed via props.
      const urlToDelete = lastUploadedUrlRef.current ?? currentPhotoUrl ?? null;

      const publicUrl = await uploadEmployeePhoto(
        employeeId || 'new',
        file,
        urlToDelete
      );

      // Remember this upload so the NEXT upload will delete it
      lastUploadedUrlRef.current = publicUrl;
      setPreviewUrl(publicUrl);
      onPhotoChange(publicUrl);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Storage not configured')) {
        alert(t('employees.photoBucketNotConfigured', 'Storage not configured'));
      } else {
        alert(t('employees.photoUploadFailed'));
      }
      // Restore previous preview on failure
      setPreviewUrl(lastUploadedUrlRef.current ?? currentPhotoUrl ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    // Delete whichever photo is currently showing
    const urlToDelete = lastUploadedUrlRef.current ?? currentPhotoUrl ?? null;
    await deleteEmployeePhoto(urlToDelete);
    lastUploadedUrlRef.current = null;
    setPreviewUrl(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t('employees.photo')}
              className="w-full h-full object-cover"
            />
          ) : initials ? (
            <span className="text-2xl font-bold text-primary-900">{initials}</span>
          ) : (
            <User className="w-12 h-12 text-primary-900" />
          )}
        </div>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {t('employees.photo')}
        </label>
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2" />
                {t('employees.uploadingPhoto')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {previewUrl ? t('employees.changePhoto') : t('employees.uploadPhoto')}
              </>
            )}
          </label>
        </div>
        <p className="text-xs text-gray-500">{t('employees.photoHint')}</p>
      </div>
    </div>
  );
}
