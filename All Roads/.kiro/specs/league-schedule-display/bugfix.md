# Bugfix Requirements Document

## Introduction

When a commissioner opens a league and taps the Schedule button, the SchedulingScreen navigates correctly but displays "No games scheduled yet" even when confirmed/scheduled games already exist for that league. The screen clears its Redux state on mount (`clearSchedule()`) and never fetches existing matches from the backend, so previously confirmed games are invisible until the user generates a new schedule.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user navigates to the SchedulingScreen for a league that has existing scheduled or confirmed games THEN the system displays "No games scheduled yet" with an empty event list because `clearSchedule()` is dispatched on mount and no fetch of existing matches is performed.

1.2 WHEN a user navigates to the SchedulingScreen and the league has previously confirmed games stored in the backend THEN the system does not call any API to retrieve those games, so the `events` array in Redux remains empty.

1.3 WHEN a user navigates away from the SchedulingScreen and returns THEN the system clears all schedule state on mount, losing any context about existing games.

### Expected Behavior (Correct)

2.1 WHEN a user navigates to the SchedulingScreen for a league that has existing scheduled games THEN the system SHALL fetch the league's existing matches from the backend and display them in the event list.

2.2 WHEN a user navigates to the SchedulingScreen and the league has previously confirmed games stored in the backend THEN the system SHALL call the matches API (e.g., `MatchService.getLeagueMatches` or `getUpcomingMatches`) to retrieve and populate the schedule event list.

2.3 WHEN a user navigates away from the SchedulingScreen and returns THEN the system SHALL reload the existing scheduled games from the backend so the display is always current.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user taps "Auto Generate Schedule" THEN the system SHALL CONTINUE TO generate a new schedule preview via the `generateSchedule` mutation and display the generated events for review.

3.2 WHEN a user taps "Confirm Schedule" after reviewing generated or manually added events THEN the system SHALL CONTINUE TO confirm the schedule via the `confirmSchedule` mutation and navigate back on success.

3.3 WHEN a user manually adds or edits a game via the "Add Game" button or event editor THEN the system SHALL CONTINUE TO allow manual event creation and editing within the schedule.

3.4 WHEN a league has no scheduled games and no games have been confirmed THEN the system SHALL CONTINUE TO display the "No games scheduled yet" empty state.

3.5 WHEN the SchedulingScreen is loading league data THEN the system SHALL CONTINUE TO display a loading spinner until data is ready.
