# Requirements Document: Design System Implementation

## Introduction

This feature systematically applies the Muster design system across all screens in the application. The LeaguesBrowserScreen serves as the canonical reference implementation, and all patterns extracted from it (documented in DESIGN_SYSTEM.md) must be consistently applied to every screen in the app. This ensures visual consistency, improves maintainability, and provides a cohesive user experience across the entire Muster platform.

## Glossary

- **Design_System**: The comprehensive set of visual patterns, component styles, spacing rules, typography scales, and color usage defined in DESIGN_SYSTEM.md
- **Reference_Screen**: The LeaguesBrowserScreen (src/screens/leagues/LeaguesBrowserScreen.tsx) which serves as the source of truth for all design patterns
- **Theme_Tokens**: Constants exported from src/theme/ including colors, typography, spacing, componentStyles, and borderRadius
- **Screen**: A top-level view component in the src/screens/ directory that represents a distinct user interface
- **Component_Pattern**: A reusable UI element style including buttons, badges, chips, modals, empty states, and error states
- **Spacing_System**: The standardized spacing values (xs, sm, md, lg, xl, xxl) from Spacing constants
- **Color_Palette**: The approved color tokens from colors.ts including chalk, ink, soft, grass, sky, track, and court
- **Typography_Scale**: The font size and weight combinations for titles (20px), subtitles (18px), body (16px), labels (14px), and badges (12px)
- **Modal_Pattern**: The full-screen or centered modal structure with solid backgrounds, header/footer layout, and action buttons
- **Empty_State**: The standardized pattern for displaying "no content" scenarios with icon, title, description, and optional action
- **Error_State**: The standardized pattern for displaying error scenarios with icon, title, error message, and retry button
- **Filter_Section**: The UI pattern for displaying filterable options with section titles and option chips
- **List_Screen**: A screen type that displays browsable/searchable content with filters, empty states, and pagination
- **Detail_Screen**: A screen type that displays comprehensive information about a single entity
- **Form_Screen**: A screen type that collects user input with validation and submission

## Requirements

### Requirement 1: Apply Color System

**User Story:** As a user, I want consistent colors throughout the app, so that the interface feels cohesive and professional

#### Acceptance Criteria

1. THE Screen SHALL use colors.chalk as the primary background color
2. THE Screen SHALL use colors.ink for primary text content
3. THE Screen SHALL use colors.soft for secondary text and borders
4. THE Screen SHALL use colors.grass for primary action buttons and active states
5. THE Screen SHALL use colors.sky for informational actions and links
6. THE Screen SHALL use colors.track for destructive actions and error indicators
7. THE Screen SHALL use colors.court for accent badges and highlights
8. THE Screen SHALL use colors.chalk for text on colored backgrounds
9. THE Screen SHALL NOT use deprecated color tokens (colors.background, colors.textPrimary, colors.textSecondary, colors.border)
10. THE Screen SHALL NOT use hardcoded color values

### Requirement 2: Apply Typography Scale

**User Story:** As a user, I want consistent text sizing and hierarchy, so that I can easily scan and understand content

#### Acceptance Criteria

1. THE Screen SHALL use 20px font size with 600 weight for titles
2. THE Screen SHALL use 18px font size with 600 weight for section headers
3. THE Screen SHALL use 16px font size for body text and button labels
4. THE Screen SHALL use 14px font size for small labels and filter buttons
5. THE Screen SHALL use 12px font size with 600 weight for badges
6. THE Screen SHALL use lineHeight of 24 for body text
7. THE Screen SHALL import font styles from Theme_Tokens
8. THE Screen SHALL NOT use hardcoded fontSize or fontWeight values

### Requirement 3: Apply Spacing System

**User Story:** As a user, I want consistent spacing between elements, so that the interface feels organized and balanced

#### Acceptance Criteria

1. THE Screen SHALL use Spacing.lg (16px) for standard container padding
2. THE Screen SHALL use Spacing.md (12px) for button vertical padding
3. THE Screen SHALL use Spacing.sm (8px) for small gaps and tight spacing
4. THE Screen SHALL use Spacing.xl (20px) for large container padding
5. THE Screen SHALL use Spacing.xxl (24px) for major section spacing
6. THE Screen SHALL use Spacing.xs (4px) for minimal spacing and icon gaps
7. THE Screen SHALL import spacing values from Spacing constants
8. THE Screen SHALL NOT use hardcoded padding or margin values

### Requirement 4: Apply Button Patterns

**User Story:** As a user, I want consistent button styles, so that I can easily identify actionable elements

#### Acceptance Criteria

1. WHEN a primary action is needed, THE Screen SHALL use grass background with chalk text and 8px borderRadius
2. WHEN a secondary action is needed, THE Screen SHALL use chalk background with soft border and ink text
3. THE Button SHALL use 16px fontSize with 600 fontWeight for text
4. THE Button SHALL use Spacing.md vertical padding and Spacing.lg horizontal padding
5. WHEN a filter button is active, THE Button SHALL use grass background and chalk text
6. WHEN a filter button is inactive, THE Button SHALL use chalk background with soft border
7. THE Option_Chip SHALL use 20px borderRadius for pill-shaped appearance
8. THE Option_Chip SHALL use 14px fontSize for text
9. THE Screen SHALL import button styles from ComponentStyles when available
10. THE Screen SHALL NOT create custom button styles that deviate from patterns

### Requirement 5: Apply Modal Patterns

**User Story:** As a user, I want consistent modal experiences, so that I can easily navigate and complete modal interactions

#### Acceptance Criteria

1. THE Modal SHALL use colors.chalk as solid background color
2. THE Modal SHALL NOT use transparent or semi-transparent backgrounds
3. THE Modal_Header SHALL display cancel action on left, title in center, and reset/action on right
4. THE Modal_Header SHALL use soft border on bottom with 1px width
5. THE Modal_Footer SHALL use soft border on top with 1px width
6. THE Modal_Footer SHALL contain primary action button with grass background
7. THE Modal_Content SHALL use Spacing.lg horizontal padding
8. THE Modal_Header SHALL use 18px fontSize with 600 weight for title
9. THE Modal SHALL use sky color for cancel actions
10. THE Modal SHALL use track color for destructive actions

### Requirement 6: Apply Empty State Patterns

**User Story:** As a user, I want helpful empty states, so that I understand why content is missing and what I can do about it

#### Acceptance Criteria

1. THE Empty_State SHALL display an icon at 64px size in soft color
2. THE Empty_State SHALL display a title at 20px with 600 weight and Spacing.lg top margin
3. THE Empty_State SHALL display descriptive text at 16px in soft color with 24px lineHeight
4. THE Empty_State SHALL center-align all content
5. THE Empty_State SHALL use Spacing.xl horizontal padding and Spacing.xxl vertical padding
6. WHEN an action is available, THE Empty_State SHALL display a primary button
7. THE Empty_State SHALL use colors.ink for title text
8. THE Empty_State SHALL use colors.soft for icon and description
9. THE Empty_State SHALL be vertically and horizontally centered in available space
10. THE Empty_State SHALL provide clear, actionable messaging

### Requirement 7: Apply Error State Patterns

**User Story:** As a user, I want clear error messages, so that I understand what went wrong and how to recover

#### Acceptance Criteria

1. THE Error_State SHALL display alert-circle-outline icon at 64px in track color
2. THE Error_State SHALL display "Oops!" as title at 20px with 600 weight
3. THE Error_State SHALL display error message at 16px in soft color
4. THE Error_State SHALL display "Try Again" button with primary button styling
5. THE Error_State SHALL center-align all content
6. THE Error_State SHALL use Spacing.xl horizontal padding
7. THE Error_State SHALL use colors.chalk background
8. WHEN retry button is pressed, THE Error_State SHALL trigger data refetch
9. THE Error_State SHALL use colors.ink for title text
10. THE Error_State SHALL provide user-friendly error messages

### Requirement 8: Apply Loading State Patterns

**User Story:** As a user, I want consistent loading indicators, so that I know when the app is processing

#### Acceptance Criteria

1. WHEN pull-to-refresh is available, THE Screen SHALL use RefreshControl with grass tintColor
2. WHEN paginating content, THE Screen SHALL display footer ActivityIndicator in grass color
3. THE Footer_Loader SHALL use Spacing.lg vertical padding
4. THE Footer_Loader SHALL center the ActivityIndicator
5. THE ActivityIndicator SHALL use "small" size
6. THE RefreshControl SHALL use colors.grass for both tintColor and colors array
7. THE Screen SHALL NOT use custom loading spinners
8. THE Screen SHALL NOT use multiple loading indicator colors
9. WHEN loading initial content, THE Screen SHALL display centered ActivityIndicator
10. THE Loading_Indicator SHALL use colors.grass consistently

### Requirement 9: Apply Filter Section Patterns

**User Story:** As a user, I want consistent filter interfaces, so that I can easily refine content across different screens

#### Acceptance Criteria

1. THE Filter_Section SHALL use Spacing.lg vertical margin
2. THE Filter_Section SHALL display section title at 16px with 600 weight
3. THE Filter_Section SHALL use Spacing.md bottom margin for section title
4. THE Filter_Section SHALL arrange options in flexDirection row with flexWrap
5. THE Filter_Section SHALL use Spacing.sm gap between option chips
6. THE Option_Chip SHALL use 20px borderRadius
7. THE Option_Chip SHALL use Spacing.lg horizontal padding and Spacing.sm vertical padding
8. WHEN option is selected, THE Option_Chip SHALL use grass background and chalk text
9. WHEN option is unselected, THE Option_Chip SHALL use chalk background with soft border
10. THE Filter_Section SHALL use colors.ink for section title

### Requirement 10: Apply Border and Radius Patterns

**User Story:** As a user, I want consistent visual boundaries, so that the interface feels polished and unified

#### Acceptance Criteria

1. THE Button SHALL use 8px borderRadius
2. THE Chip SHALL use 20px borderRadius for pill shape
3. THE Card SHALL use 12px borderRadius
4. THE Badge SHALL use 10px borderRadius
5. THE Border SHALL use 1px width with soft color
6. WHEN element is active, THE Border SHALL use grass color
7. THE Divider SHALL use 1px borderBottomWidth with soft color
8. THE Screen SHALL NOT use custom borderRadius values outside approved set
9. THE Screen SHALL import borderRadius values from Theme_Tokens when available
10. THE Screen SHALL maintain consistent border styling across similar elements

### Requirement 11: Apply Icon Usage Patterns

**User Story:** As a user, I want consistent icon sizing and coloring, so that visual elements are balanced and meaningful

#### Acceptance Criteria

1. THE Empty_State SHALL use 64px icon size
2. THE Error_State SHALL use 64px icon size
3. THE Header SHALL use 32px icon size for feature icons
4. THE Button SHALL use 20px icon size for inline icons
5. THE Badge SHALL use 16px icon size for small indicators
6. THE Icon SHALL use soft color for neutral states
7. THE Icon SHALL use grass color for active states
8. THE Icon SHALL use track color for error states
9. THE Icon SHALL use sky color for informational states
10. THE Icon SHALL use chalk color when on colored backgrounds

### Requirement 12: Update Home Screen

**User Story:** As a user, I want the home screen to match the design system, so that my first impression is consistent with the rest of the app

#### Acceptance Criteria

1. THE HomeScreen SHALL use colors.chalk background
2. THE HomeScreen SHALL apply Typography_Scale for all text elements
3. THE HomeScreen SHALL use Spacing_System for all padding and margins
4. THE HomeScreen SHALL apply Button_Patterns for all interactive elements
5. THE HomeScreen SHALL apply Empty_State pattern if no content exists
6. THE HomeScreen SHALL apply Error_State pattern if loading fails
7. THE HomeScreen SHALL use Theme_Tokens for all colors
8. THE HomeScreen SHALL NOT use hardcoded style values
9. THE HomeScreen SHALL maintain existing functionality
10. THE HomeScreen SHALL follow List_Screen patterns if displaying browsable content

### Requirement 13: Update Events Screens

**User Story:** As a user, I want event screens to match the design system, so that managing events feels consistent

#### Acceptance Criteria

1. THE EventsListScreen SHALL apply List_Screen patterns including filters and empty states
2. THE EventDetailsScreen SHALL apply Detail_Screen patterns with consistent sections
3. THE CreateEventScreen SHALL apply Form_Screen patterns with validation
4. THE EditEventScreen SHALL apply Form_Screen patterns matching CreateEventScreen
5. THE VotePlayersScreen SHALL apply Modal_Pattern or Detail_Screen pattern
6. THE Events_Screen SHALL use colors.chalk background
7. THE Events_Screen SHALL apply Typography_Scale and Spacing_System
8. THE Events_Screen SHALL apply Button_Patterns for all actions
9. THE Events_Screen SHALL use Theme_Tokens exclusively
10. THE Events_Screen SHALL maintain existing functionality

### Requirement 14: Update Facilities Screens

**User Story:** As a user, I want facility screens to match the design system, so that browsing and managing facilities is consistent

#### Acceptance Criteria

1. THE FacilitiesListScreen SHALL apply List_Screen patterns
2. THE FacilityDetailsScreen SHALL apply Detail_Screen patterns
3. THE CreateFacilityScreen SHALL apply Form_Screen patterns
4. THE EditFacilityScreen SHALL apply Form_Screen patterns matching CreateFacilityScreen
5. THE ManageGroundScreen SHALL apply Detail_Screen or Form_Screen patterns
6. THE CourtAvailabilityScreen SHALL apply Detail_Screen patterns
7. THE GroundAvailabilityScreen SHALL apply Detail_Screen patterns
8. THE Facilities_Screen SHALL use colors.chalk background
9. THE Facilities_Screen SHALL apply Typography_Scale, Spacing_System, and Button_Patterns
10. THE Facilities_Screen SHALL use Theme_Tokens exclusively

### Requirement 15: Update Bookings Screens

**User Story:** As a user, I want booking screens to match the design system, so that managing reservations is consistent

#### Acceptance Criteria

1. THE BookingsListScreen SHALL apply List_Screen patterns
2. THE BookingDetailsScreen SHALL apply Detail_Screen patterns
3. THE BookingHistoryScreen SHALL apply List_Screen patterns with date filtering
4. THE Bookings_Screen SHALL use colors.chalk background
5. THE Bookings_Screen SHALL apply Typography_Scale and Spacing_System
6. THE Bookings_Screen SHALL apply Button_Patterns for all actions
7. THE Bookings_Screen SHALL apply Empty_State when no bookings exist
8. THE Bookings_Screen SHALL apply Error_State when loading fails
9. THE Bookings_Screen SHALL use Theme_Tokens exclusively
10. THE Bookings_Screen SHALL maintain existing functionality

### Requirement 16: Update Profile Screens

**User Story:** As a user, I want profile screens to match the design system, so that managing my account is consistent

#### Acceptance Criteria

1. THE ProfileScreen SHALL apply Detail_Screen patterns
2. THE EditProfileScreen SHALL apply Form_Screen patterns
3. THE SettingsScreen SHALL apply List_Screen or Detail_Screen patterns
4. THE NotificationPreferencesScreen SHALL apply Form_Screen patterns
5. THE UserStatsScreen SHALL apply Detail_Screen patterns
6. THE Profile_Screen SHALL use colors.chalk background
7. THE Profile_Screen SHALL apply Typography_Scale, Spacing_System, and Button_Patterns
8. THE Profile_Screen SHALL use Theme_Tokens exclusively
9. THE Profile_Screen SHALL maintain existing functionality
10. THE Profile_Screen SHALL apply consistent section grouping

### Requirement 17: Update Auth Screens

**User Story:** As a user, I want authentication screens to match the design system, so that signing in feels part of the same app

#### Acceptance Criteria

1. THE LoginScreen SHALL apply Form_Screen patterns
2. THE RegisterScreen SHALL apply Form_Screen patterns
3. THE ForgotPasswordScreen SHALL apply Form_Screen patterns
4. THE ResetPasswordScreen SHALL apply Form_Screen patterns
5. THE Auth_Screen SHALL use colors.chalk background
6. THE Auth_Screen SHALL apply Typography_Scale and Spacing_System
7. THE Auth_Screen SHALL apply Button_Patterns with grass primary buttons
8. THE Auth_Screen SHALL use sky color for secondary links
9. THE Auth_Screen SHALL use Theme_Tokens exclusively
10. THE Auth_Screen SHALL maintain existing authentication functionality

### Requirement 18: Update Additional Screens

**User Story:** As a user, I want all remaining screens to match the design system, so that the entire app feels cohesive

#### Acceptance Criteria

1. THE SearchResultsScreen SHALL apply List_Screen patterns
2. THE DiscoveryScreen SHALL apply List_Screen or Detail_Screen patterns
3. THE TeamsListScreen SHALL apply List_Screen patterns
4. THE TeamDetailsScreen SHALL apply Detail_Screen patterns
5. THE CreateTeamScreen SHALL apply Form_Screen patterns
6. THE OnboardingScreen SHALL apply consistent Typography_Scale and Button_Patterns
7. THE Additional_Screen SHALL use colors.chalk background
8. THE Additional_Screen SHALL use Theme_Tokens exclusively
9. THE Additional_Screen SHALL maintain existing functionality
10. THE Additional_Screen SHALL apply appropriate Empty_State and Error_State patterns

### Requirement 19: Maintain Reference Screen Integrity

**User Story:** As a developer, I want the reference screen to remain unchanged, so that it continues to serve as the source of truth

#### Acceptance Criteria

1. THE Implementation SHALL NOT modify LeaguesBrowserScreen.tsx
2. THE Implementation SHALL NOT modify DESIGN_SYSTEM.md
3. THE Implementation SHALL reference LeaguesBrowserScreen for pattern clarification
4. THE Implementation SHALL reference DESIGN_SYSTEM.md for pattern documentation
5. WHEN pattern ambiguity exists, THE Implementation SHALL defer to LeaguesBrowserScreen implementation
6. THE Implementation SHALL NOT create new design patterns
7. THE Implementation SHALL NOT deviate from documented patterns
8. THE Implementation SHALL maintain consistency with Reference_Screen
9. THE Implementation SHALL document any discovered pattern gaps
10. THE Implementation SHALL preserve all existing Reference_Screen functionality

### Requirement 20: Preserve Existing Functionality

**User Story:** As a user, I want all existing features to continue working, so that the visual update doesn't break my workflows

#### Acceptance Criteria

1. THE Updated_Screen SHALL maintain all existing user interactions
2. THE Updated_Screen SHALL maintain all existing navigation flows
3. THE Updated_Screen SHALL maintain all existing data fetching logic
4. THE Updated_Screen SHALL maintain all existing form validation
5. THE Updated_Screen SHALL maintain all existing error handling
6. THE Updated_Screen SHALL maintain all existing state management
7. THE Updated_Screen SHALL maintain all existing API integrations
8. THE Updated_Screen SHALL maintain all existing business logic
9. WHEN visual updates are applied, THE Updated_Screen SHALL NOT introduce functional regressions
10. THE Updated_Screen SHALL pass all existing tests without modification to test logic

### Requirement 21: Import Theme Tokens Correctly

**User Story:** As a developer, I want proper theme imports, so that the design system is maintainable and consistent

#### Acceptance Criteria

1. THE Screen SHALL import colors from 'src/theme/colors'
2. THE Screen SHALL import Spacing from 'src/theme/spacing'
3. THE Screen SHALL import fonts or typography from 'src/theme/typography'
4. THE Screen SHALL import ComponentStyles from 'src/theme/componentStyles' when available
5. THE Screen SHALL import from 'src/theme' barrel export when appropriate
6. THE Screen SHALL NOT import deprecated theme tokens
7. THE Screen SHALL NOT create local color or spacing constants
8. THE Screen SHALL NOT duplicate theme values
9. THE Screen SHALL use TypeScript types from theme files
10. THE Screen SHALL maintain consistent import organization

### Requirement 22: Apply Platform-Specific Patterns

**User Story:** As a user, I want the app to feel native on each platform, so that interactions match platform expectations

#### Acceptance Criteria

1. WHEN platform is web, THE Screen SHALL use web-appropriate components
2. WHEN platform is iOS or Android, THE Screen SHALL use native components
3. THE Screen SHALL use Platform.select for platform-specific styling when needed
4. THE Screen SHALL maintain responsive design for web platform
5. THE Screen SHALL use appropriate keyboard handling for each platform
6. THE Screen SHALL use appropriate navigation patterns for each platform
7. THE Screen SHALL apply consistent Design_System across all platforms
8. THE Screen SHALL NOT compromise design consistency for platform differences
9. THE Screen SHALL use platform-specific icons when appropriate
10. THE Screen SHALL test visual consistency across iOS, Android, and web

### Requirement 23: Validate Design System Compliance

**User Story:** As a developer, I want to verify design system compliance, so that I can ensure consistency is maintained

#### Acceptance Criteria

1. THE Updated_Screen SHALL use colors.chalk for background (not colors.background)
2. THE Updated_Screen SHALL use colors.ink for primary text (not colors.textPrimary)
3. THE Updated_Screen SHALL use colors.soft for secondary text and borders (not colors.textSecondary or colors.border)
4. THE Updated_Screen SHALL use Spacing constants (not hardcoded numbers)
5. THE Updated_Screen SHALL use approved borderRadius values (8, 10, 12, or 20)
6. THE Updated_Screen SHALL use Typography_Scale font sizes (20, 18, 16, 14, or 12)
7. THE Updated_Screen SHALL use Button_Patterns (not custom button styles)
8. THE Updated_Screen SHALL use Modal_Pattern for modals (solid backgrounds)
9. THE Updated_Screen SHALL use Empty_State pattern (icon, title, text, button)
10. THE Updated_Screen SHALL use Error_State pattern (icon, title, message, retry)

### Requirement 24: Document Pattern Deviations

**User Story:** As a developer, I want to know when patterns can't be applied, so that I can make informed decisions

#### Acceptance Criteria

1. WHEN a screen requires pattern deviation, THE Implementation SHALL document the reason
2. WHEN a pattern doesn't fit a use case, THE Implementation SHALL propose an alternative
3. WHEN new patterns are needed, THE Implementation SHALL document them for review
4. THE Implementation SHALL create a deviations log if patterns cannot be applied
5. THE Implementation SHALL explain technical constraints that prevent pattern application
6. THE Implementation SHALL propose solutions for pattern gaps
7. THE Implementation SHALL NOT silently deviate from patterns
8. THE Implementation SHALL seek clarification before creating new patterns
9. THE Implementation SHALL prioritize consistency over convenience
10. THE Implementation SHALL document all pattern application decisions

### Requirement 25: Test Visual Consistency

**User Story:** As a developer, I want to verify visual consistency, so that the design system is properly applied

#### Acceptance Criteria

1. THE Updated_Screen SHALL render correctly on iOS simulator
2. THE Updated_Screen SHALL render correctly on Android emulator
3. THE Updated_Screen SHALL render correctly in web browser
4. THE Updated_Screen SHALL maintain consistent spacing across platforms
5. THE Updated_Screen SHALL maintain consistent colors across platforms
6. THE Updated_Screen SHALL maintain consistent typography across platforms
7. THE Updated_Screen SHALL display properly in light mode
8. THE Updated_Screen SHALL handle empty states correctly
9. THE Updated_Screen SHALL handle error states correctly
10. THE Updated_Screen SHALL handle loading states correctly
