import React from 'react';
import { render, fireEvent, waitFor } from '../../utils/test-utils';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { MapImageUploader } from '../../../src/components/facilities/MapImageUploader';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('MapImageUploader', () => {
  const mockOnImageSelected = jest.fn();
  const mockOnImageRemoved = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
  });

  describe('Rendering', () => {
    it('should render upload placeholder when no image is provided', () => {
      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      expect(getByText('Upload Facility Map')).toBeTruthy();
      expect(getByText('Tap to select an image from your device')).toBeTruthy();
    });

    it('should render image preview when imageUri is provided', () => {
      const { getByText, queryByText } = render(
        <MapImageUploader
          imageUri="https://example.com/map.jpg"
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      expect(getByText('Change')).toBeTruthy();
      expect(getByText('Remove')).toBeTruthy();
      expect(queryByText('Tap to select an image from your device')).toBeNull();
    });

    it('should render instructions when showInstructions is true', () => {
      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          showInstructions={true}
        />
      );

      expect(getByText('Upload Facility Map')).toBeTruthy();
      expect(getByText(/Upload a clear image showing the layout/)).toBeTruthy();
    });

    it('should not render instructions when showInstructions is false', () => {
      const { queryByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          showInstructions={false}
        />
      );

      expect(queryByText(/Upload a clear image showing the layout/)).toBeNull();
    });

    it('should render custom placeholder text', () => {
      const customText = 'Custom placeholder text';
      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          placeholderText={customText}
        />
      );

      expect(getByText(customText)).toBeTruthy();
    });
  });

  describe('Permissions', () => {
    it('should request permissions on mount for non-web platforms', async () => {
      Platform.OS = 'ios';

      render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      await waitFor(() => {
        expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should show alert when permissions are denied', async () => {
      Platform.OS = 'ios';
      (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          'We need camera roll permissions to upload facility maps.'
        );
      });
    });
  });

  describe('Image Selection', () => {
    it('should call onImageSelected when valid image is picked', async () => {
      const mockImageUri = 'file:///path/to/image.jpg';
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: mockImageUri,
            width: 1000,
            height: 800,
          },
        ],
      });

      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device');
      fireEvent.press(uploadButton.parent!);

      await waitFor(() => {
        expect(mockOnImageSelected).toHaveBeenCalledWith(mockImageUri);
      });
    });

    it('should not call onImageSelected when image picker is cancelled', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: true,
      });

      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device');
      fireEvent.press(uploadButton.parent!);

      await waitFor(() => {
        expect(mockOnImageSelected).not.toHaveBeenCalled();
      });
    });

    it('should show alert when image is too small', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/image.jpg',
            width: 500,
            height: 400,
          },
        ],
      });

      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          minDimensions={{ width: 800, height: 600 }}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device');
      fireEvent.press(uploadButton.parent!);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Image Too Small',
          'Please select an image with minimum dimensions of 800x600 pixels.'
        );
        expect(mockOnImageSelected).not.toHaveBeenCalled();
      });
    });

    it('should show alert when image is too large', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/image.jpg',
            width: 5000,
            height: 5000,
          },
        ],
      });

      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          maxDimensions={{ width: 4000, height: 4000 }}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device');
      fireEvent.press(uploadButton.parent!);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Image Too Large',
          'Please select an image with maximum dimensions of 4000x4000 pixels.'
        );
        expect(mockOnImageSelected).not.toHaveBeenCalled();
      });
    });

    it('should handle image picker errors gracefully', async () => {
      const errorMessage = 'Image picker error';
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device');
      fireEvent.press(uploadButton.parent!);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          `Failed to pick image: ${errorMessage}`
        );
      });
    });
  });

  describe('Image Removal', () => {
    it('should show confirmation alert when remove button is pressed', () => {
      const { getByText } = render(
        <MapImageUploader
          imageUri="https://example.com/map.jpg"
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      const removeButton = getByText('Remove');
      fireEvent.press(removeButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Remove Image',
        'Are you sure you want to remove this image?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Remove' }),
        ])
      );
    });

    it('should call onImageRemoved when removal is confirmed', () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        // Simulate pressing the "Remove" button
        const removeButton = buttons?.find((btn: any) => btn.text === 'Remove');
        if (removeButton?.onPress) {
          removeButton.onPress();
        }
      });

      const { getByText } = render(
        <MapImageUploader
          imageUri="https://example.com/map.jpg"
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
        />
      );

      const removeButton = getByText('Remove');
      fireEvent.press(removeButton);

      expect(mockOnImageRemoved).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable upload button when disabled prop is true', () => {
      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          disabled={true}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device').parent!;
      expect(uploadButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should disable change and remove buttons when disabled prop is true', () => {
      const { getByText } = render(
        <MapImageUploader
          imageUri="https://example.com/map.jpg"
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          disabled={true}
        />
      );

      const changeButton = getByText('Change').parent!;
      const removeButton = getByText('Remove').parent!;

      expect(changeButton.props.accessibilityState?.disabled).toBe(true);
      expect(removeButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Custom Dimensions', () => {
    it('should use custom minimum dimensions for validation', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/image.jpg',
            width: 600,
            height: 400,
          },
        ],
      });

      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          minDimensions={{ width: 1000, height: 800 }}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device');
      fireEvent.press(uploadButton.parent!);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Image Too Small',
          'Please select an image with minimum dimensions of 1000x800 pixels.'
        );
      });
    });

    it('should use custom maximum dimensions for validation', async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///path/to/image.jpg',
            width: 3000,
            height: 3000,
          },
        ],
      });

      const { getByText } = render(
        <MapImageUploader
          onImageSelected={mockOnImageSelected}
          onImageRemoved={mockOnImageRemoved}
          maxDimensions={{ width: 2000, height: 2000 }}
        />
      );

      const uploadButton = getByText('Tap to select an image from your device');
      fireEvent.press(uploadButton.parent!);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Image Too Large',
          'Please select an image with maximum dimensions of 2000x2000 pixels.'
        );
      });
    });
  });
});
