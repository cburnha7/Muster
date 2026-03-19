import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FacilityMapEditorScreen } from '../../src/screens/facilities/FacilityMapEditorScreen';
import { facilityService } from '../../src/services/api/FacilityService';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      facilityId: 'test-facility-id',
      facilityName: 'Test Facility',
      currentMapUrl: undefined,
    },
  }),
}));

jest.mock('expo-image-picker');
jest.mock('../../src/services/api/FacilityService');

describe('FacilityMapEditorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
  });

  it('renders correctly', () => {
    const { getByText } = render(<FacilityMapEditorScreen />);
    
    expect(getByText('Upload Facility Map')).toBeTruthy();
    expect(getByText('Minimum size: 800x600 pixels')).toBeTruthy();
  });

  it('shows upload placeholder when no image is selected', () => {
    const { getByText } = render(<FacilityMapEditorScreen />);
    
    expect(getByText('Upload Facility Map')).toBeTruthy();
    expect(getByText('Tap to select an image from your device')).toBeTruthy();
  });

  it('requests image permissions on mount', async () => {
    render(<FacilityMapEditorScreen />);
    
    await waitFor(() => {
      expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    });
  });

  it('shows alert when image is too small', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'test-uri',
        width: 500,
        height: 400,
      }],
    });

    const { getByText } = render(<FacilityMapEditorScreen />);
    const uploadButton = getByText('Tap to select an image from your device');
    
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Image Too Small',
        'Please select an image with minimum dimensions of 800x600 pixels.'
      );
    });
  });

  it('shows alert when image is too large', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'test-uri',
        width: 5000,
        height: 5000,
      }],
    });

    const { getByText } = render(<FacilityMapEditorScreen />);
    const uploadButton = getByText('Tap to select an image from your device');
    
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Image Too Large',
        'Please select an image with maximum dimensions of 4000x4000 pixels.'
      );
    });
  });

  it('accepts valid image dimensions', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{
        uri: 'test-uri',
        width: 1920,
        height: 1080,
      }],
    });

    const { getByText, queryByText } = render(<FacilityMapEditorScreen />);
    const uploadButton = getByText('Tap to select an image from your device');
    
    fireEvent.press(uploadButton);

    await waitFor(() => {
      expect(queryByText('Upload Facility Map')).toBeFalsy();
    });
  });
});
