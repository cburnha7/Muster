# DocumentViewerScreen Implementation

## Overview

Implemented the DocumentViewerScreen component for viewing league documents (rules, bylaws, etc.) across all platforms (iOS, Android, Web).

## Implementation Details

### Component Location
- **File**: `src/screens/leagues/DocumentViewerScreen.tsx`
- **Test**: `tests/screens/leagues/DocumentViewerScreen.test.tsx`

### Features Implemented

#### 1. Cross-Platform PDF Viewing
- **Web**: Uses native browser `<iframe>` for PDF display
- **iOS/Android**: Uses `react-native-webview` with Google Docs Viewer as fallback
- Supports zoom, scroll, and page navigation on all platforms

#### 2. Document Loading
- Fetches document URL from LeagueService API
- Displays loading indicator during fetch
- Handles errors gracefully with retry functionality
- Sets header title to document name dynamically

#### 3. Download Functionality
- Header download button for quick access
- Floating download button on mobile for easy access while viewing
- Download fallback when viewer fails
- Platform-specific download handling:
  - Web: Opens in new tab
  - Mobile: Uses system handler via Linking API

#### 4. Analytics Tracking
- Tracks document load time using PerformanceMonitoringService
- Tracks download attempts with platform metadata
- Includes document metadata (leagueId, documentId, fileName)

#### 5. Error Handling
- Network errors with retry button
- Missing document URL handling
- WebView loading errors
- User-friendly error messages

### Navigation Integration

#### Updated Files
1. **src/navigation/types.ts**
   - Added `DocumentViewer` to `LeaguesStackParamList`
   - Parameters: `{ leagueId: string; documentId: string; documentName?: string }`

2. **src/navigation/stacks/LeaguesStackNavigator.tsx**
   - Added DocumentViewer screen to stack
   - Configured with `headerShown: true` for native header

### Dependencies Added
- `react-native-webview` (v13.12.5) - For cross-platform PDF viewing

### Usage Example

```typescript
// Navigate to document viewer
navigation.navigate('DocumentViewer', {
  leagueId: 'league-123',
  documentId: 'doc-456',
  documentName: 'League Rules.pdf', // Optional
});
```

### API Integration

Uses `LeagueService.downloadDocument()` method:
```typescript
const response = await leagueService.downloadDocument(leagueId, documentId);
// Returns: { url: string; fileName: string; mimeType: string }
```

### Styling

- Follows brand theme (colors.grass for primary actions)
- Responsive layout for all screen sizes
- Floating action button for mobile download
- Loading states with ActivityIndicator
- Error states with icons and helpful messages

### Platform-Specific Considerations

#### Web
- Uses `<iframe>` for native browser PDF viewer
- Full browser PDF controls available
- Download opens in new tab

#### iOS/Android
- Uses WebView with Google Docs Viewer
- Provides zoom and scroll capabilities
- Floating download button for easy access
- Handles WebView errors gracefully

### Testing

Comprehensive test suite covering:
- Document loading states (loading, success, error)
- Header title updates
- Platform-specific rendering (WebView on mobile)
- Download functionality
- Retry functionality
- Analytics tracking
- Error handling (missing URL, WebView errors)

### Requirements Validated

**Requirement 6.5**: View league rules document
- ✅ PDF viewer with zoom, scroll, page navigation
- ✅ Platform-appropriate viewer (WebView/iframe)

**Requirement 16.1**: Retrieve PDF from storage
- ✅ Fetches document URL from API
- ✅ Displays document in viewer

**Requirement 16.2**: Platform-appropriate viewer
- ✅ iOS: WebView with Google Docs Viewer
- ✅ Android: WebView with Google Docs Viewer
- ✅ Web: Native browser iframe

**Requirement 16.3**: Support zoom, scroll, page navigation
- ✅ WebView scalesPageToFit enabled
- ✅ Google Docs Viewer provides navigation
- ✅ Browser native controls on web

**Requirement 16.4**: Download fallback
- ✅ Download button in header
- ✅ Floating download button on mobile
- ✅ Download fallback on error

**Requirement 16.5**: Track document access
- ✅ Analytics tracking for load time
- ✅ Analytics tracking for downloads
- ✅ Metadata includes leagueId, documentId, fileName

## Next Steps

1. Test on physical devices (iOS/Android)
2. Verify PDF rendering quality
3. Test with various PDF sizes and formats
4. Consider adding page number indicator
5. Consider adding share functionality

## Notes

- Google Docs Viewer used as fallback for mobile platforms (no react-native-pdf dependency)
- WebView provides good cross-platform compatibility
- Analytics integration ready for production monitoring
- Error handling provides good user experience
