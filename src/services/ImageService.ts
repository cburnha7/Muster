import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api/config';
import TokenStorage from './auth/TokenStorage';

export type ImageContext =
  | 'profiles'
  | 'grounds'
  | 'rosters'
  | 'events'
  | 'dependents'
  | 'leagues';

export interface UploadResult {
  publicUrl: string;
  key: string;
}

export class ImageService {
  /**
   * Open the native image picker, then upload directly to R2 via presigned URL.
   * Returns the public URL and key on success, null if user cancelled.
   */
  static async pickAndUpload(
    context: ImageContext,
    options?: { aspect?: [number, number]; quality?: number }
  ): Promise<UploadResult | null> {
    // 1. Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Photo library permission is required to upload images.');
    }

    // 2. Open picker
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: options?.aspect ?? [1, 1],
      quality: options?.quality ?? 0.85,
    });

    if (picked.canceled || !picked.assets?.[0]) return null;

    const asset = picked.assets[0];
    const uri = asset.uri;
    const fileName = uri.split('/').pop() ?? 'photo.jpg';
    const contentType = asset.mimeType ?? 'image/jpeg';

    // 3. Get presigned URL from backend
    const token = await TokenStorage.getAccessToken();
    const presignRes = await fetch(`${API_BASE_URL}/uploads/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ context, fileName, contentType }),
    });

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({}));
      throw new Error((err as any).error ?? 'Failed to get upload URL');
    }

    const { uploadUrl, publicUrl, key } = await presignRes.json();

    // 4. Upload directly to R2
    if (Platform.OS === 'web') {
      // On web, fetch the blob and PUT it
      const blob = await fetch(uri).then(r => r.blob());
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }
    } else {
      // On native, use FileSystem for efficient binary upload
      const FileSystem = require('expo-file-system');
      const uploadRes = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': contentType },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });
      if (uploadRes.status !== 200) {
        throw new Error(`Upload failed with status ${uploadRes.status}`);
      }
    }

    return { publicUrl, key };
  }

  /**
   * Delete an image from R2 by its public URL.
   * Best-effort — never throws.
   */
  static async deleteImage(publicUrl: string): Promise<void> {
    try {
      const token = await TokenStorage.getAccessToken();
      await fetch(`${API_BASE_URL}/uploads/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: publicUrl }),
      });
    } catch {
      // Best-effort
    }
  }
}
