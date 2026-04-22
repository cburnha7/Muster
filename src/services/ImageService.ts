import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api/config';
import TokenStorage from './auth/TokenStorage';
import { acquireRefresh, performTokenRefresh } from './auth/tokenRefreshLock';

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

    return ImageService.uploadAsset(context, uri, fileName, contentType);
  }

  /**
   * Upload a single asset (already picked) directly to R2.
   * Used internally and by pickMultipleAndUpload.
   */
  static async uploadAsset(
    context: ImageContext,
    uri: string,
    fileName: string,
    contentType: string
  ): Promise<UploadResult> {
    let token = await TokenStorage.getAccessToken();

    const doPresign = async (authToken: string | null) => {
      return fetch(`${API_BASE_URL}/uploads/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ context, fileName, contentType }),
      });
    };

    let presignRes = await doPresign(token);

    // If 401, refresh the token and retry once
    if (presignRes.status === 401) {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshed = await acquireRefresh(() =>
            performTokenRefresh(refreshToken)
          );
          token = refreshed.accessToken;
          presignRes = await doPresign(token);
        } catch {
          // Refresh failed — throw the original 401
        }
      }
    }

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({}));
      throw new Error((err as any).error ?? 'Failed to get upload URL');
    }

    const { uploadUrl, publicUrl, key } = await presignRes.json();

    // Upload directly to R2
    const isWeb = Platform.OS === 'web';
    if (isWeb) {
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
      // Native only — expo-file-system not available on web
      const FileSystem = require('expo-file-system');
      if (FileSystem.uploadAsync && FileSystem.FileSystemUploadType) {
        const uploadRes = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'PUT',
          headers: { 'Content-Type': contentType },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });
        if (uploadRes.status !== 200) {
          throw new Error(`Upload failed with status ${uploadRes.status}`);
        }
      } else {
        // Fallback for environments where FileSystem upload isn't available
        const blob = await fetch(uri).then(r => r.blob());
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: blob,
        });
        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`);
        }
      }
    }

    return { publicUrl, key };
  }

  /**
   * Open the native image picker for multiple images, upload all to R2.
   * Returns array of results, or empty array if cancelled.
   */
  static async pickMultipleAndUpload(
    context: ImageContext,
    options?: { quality?: number; maxSelections?: number }
  ): Promise<UploadResult[]> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Photo library permission is required to upload images.');
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: options?.quality ?? 0.85,
      selectionLimit: options?.maxSelections ?? 20,
    });

    if (picked.canceled || !picked.assets?.length) return [];

    const results: UploadResult[] = [];
    for (const asset of picked.assets) {
      const fileName = asset.uri.split('/').pop() ?? 'photo.jpg';
      const contentType = asset.mimeType ?? 'image/jpeg';
      const result = await ImageService.uploadAsset(
        context,
        asset.uri,
        fileName,
        contentType
      );
      results.push(result);
    }

    return results;
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
