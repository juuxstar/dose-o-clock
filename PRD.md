# Dose-o-clock Product Requirements Document

## 1. Product Summary

Dose-o-clock is a small app for tracking a milliliter-based timed session. The core experience is a minimal clock face made of dots: each dot represents one minute, each ring represents one hour, and the timer displays up to four hours.

The app stores all state locally on the device, has no accounts, no server, no cloud sync, and no external data dependencies.

## 2. Goals

- Let a user start a dosage timer by choosing a milliliter amount and, optionally, a backdated start time.
- Show elapsed time visually with a dot-ring clock face instead of a text-first timer.
- Preserve the current timer and previous timers across app launches.
- Allow the user to inspect and delete prior timer sessions.
- Allow the user to configure dosage defaults, dosage range, dosage increment, and timer dot color style.
- Keep the app fast, single-purpose, and usable with one hand on a phone.

## 3. Non-Goals

- No medical advice, medication guidance, dose recommendations, safety warnings, or clinical decision support.
- No notifications, alarms, reminders, widgets, complications, or background alerts.
- No authentication, accounts, sharing, cloud backup, analytics, or network calls.
- No commerce, subscriptions, onboarding, marketing screens, or server-side administration.
- No editing of completed session details beyond deleting history entries.

## 4. Target Experience

- Personal single-user app.
- Optimized for small touch screens while remaining usable on larger tablet-sized screens.
- Primary orientation is portrait.
- Display name: `Dose-o-clock`.
- Product category: healthcare and fitness.

## 5. Primary User

The primary user is one person using the app on their own device to track elapsed time since a milliliter quantity was used. The app assumes frequent, quick interactions: open the app, start a timer, glance at the dot ring, and occasionally review history.

## 6. Information Architecture

The app has one main screen and four slide-up panels:

- Main timer screen.
- New session panel.
- History panel.
- Reset confirmation panel.
- Settings panel, with nested Dosage and Graphics pages.

Only one slide-up panel can be open at a time.

## 7. Main Timer Screen

### Layout

- The main screen fills the window with a system grouped background color.
- The dot-ring timer is centered in the top half of the screen.
- The dot-ring timer is square and responsive:
  - Width is the smaller of `screen width - 32` and `screen height * 0.5 - 16`.
  - Height equals width.
  - The timer area occupies at least the top half of the screen.
- A bottom action bar is pinned near the bottom with horizontal padding of 20 and bottom padding of 18.

### Bottom Actions

The bottom action bar contains four equally spaced circular icon buttons:

- Settings:
  - Gear icon.
  - Gray circular button.
  - Opens the Settings panel.
- Reset:
  - Counterclockwise arrow icon.
  - Red circular button.
  - Opens the Reset confirmation panel.
  - Disabled when there is no active timer and no history.
- History:
  - List icon.
  - Blue circular button.
  - Opens the History panel.
- New:
  - Plus icon.
  - Green circular button.
  - Opens the New session panel.

Buttons are 64 by 64 points, use white icons, and visually dim while pressed or disabled.

### Panel Behavior

- Panels slide up from the bottom and occupy half the screen height.
- Opening one panel closes all other panels.
- Tapping outside an open panel closes the panel.
- Panels auto-close after 10 seconds of inactivity.
- Drag activity inside a panel resets the 10 second auto-close timer.
- Tapping inside the Settings panel resets the auto-close timer.
- Closing a panel cancels the auto-close task.

## 8. Timer Visualization

### Dot Ring Model

- The timer is drawn on a square canvas.
- The timer uses 4 concentric rings.
- Each ring contains 60 dots.
- Each dot represents one minute.
- Each ring represents one hour.
- The maximum displayed elapsed time is 4 hours.

### Ring Rendering

- The outer ring is hour 1.
- The next inner rings are hours 2, 3, and 4.
- The outer ring is always visible.
- Inner rings become visible once their hour has started.
- Inactive dots use a light system gray color.
- Cardinal dots at 0, 15, 30, and 45 minutes are 1.28 times larger than normal dots.
- Dots on the outer ring are twice the base dot radius.
- Inner ring dots use the base dot radius.
- Dots are arranged clockwise, starting at the top of the circle.

### Dot Fill and Fade

- During a minute, the corresponding dot fades in from inactive to active.
- Fade progress for a dot is `(elapsedInRing - dotStartSecond) / 60`, clamped from 0 to 1.
- A dot is fully active once its represented minute has fully elapsed.

### Color Styles

The app supports two active dot color styles:

- Gradient:
  - On the first hour ring, active dot color changes across the hour from red to yellow to green.
  - First half hour blends red to yellow.
  - Second half hour blends yellow to green.
  - Inner rings use green for active dots.
- Solid:
  - All active dots share the same color at any moment.
  - The color is based on completed progress within the first hour.
  - It uses the same red to yellow to green interpolation as the gradient style.

Color constants:

- Red: RGB `1.0, 0.18, 0.12`.
- Yellow: RGB `1.0, 0.84, 0.0`.
- Green: RGB `0.16, 0.72, 0.28`.

## 9. Timer Session Logic

### Session Fields

A timer session contains:

- `id`: stable UUID.
- `unitHundredths`: dosage amount in hundredths of a milliliter.
- `startedAt`: wall-clock start date.
- `earlierOffsetSeconds`: number of seconds to add to elapsed time to represent a backdated start.
- `endedAt`: optional date when the session stopped.

### Elapsed Time

Elapsed time at a given date is:

```text
elapsed = (endedAt ?? currentDate) - startedAt + earlierOffsetSeconds
```

The result is clamped from 0 seconds to 4 hours.

### Maximum Duration

- A session has a maximum elapsed duration of 4 hours.
- A session is stopped when it has an `endedAt` value or when elapsed time reaches 4 hours.
- The automatic stop date is:

```text
startedAt + max(0, 4 hours - earlierOffsetSeconds)
```

Examples:

- If started now with no earlier offset, the session stops after 4 real hours.
- If started with a 90 minute earlier offset, it stops after 2.5 real hours because elapsed time reaches 4 hours.

### Active Session Refresh

- The app updates its current time every second while the main view is visible.
- On each tick, the app refreshes automatic stop behavior.
- If the active session has reached 4 elapsed hours and does not already have `endedAt`, the app sets `endedAt` to the automatic stop date and persists the session.
- A stopped active session remains the active session until the user starts a new one or resets data.

### Starting a New Session

When the user starts a new session:

- If there is an existing active session, it is ended and inserted at the top of history.
- A new active session is created with the chosen dosage and earlier offset.
- The new session's `startedAt` is the current date.
- The chosen earlier minutes are stored as `earlierOffsetSeconds`.
- The new active session and updated history are persisted.
- The New session panel closes.

### Automatic 24 Hour Reset

- If the active session's `startedAt` is at least 24 hours in the past, the app clears the active session and all history.
- This check happens when state loads and during timer refresh.
- The reset is based on real time since `startedAt`, not elapsed time including the earlier offset.

## 10. Dosage Model

Dosage values are stored as integer hundredths of a milliliter.

### Constants

- Minimum dosage value: `0.01 ml` (`1` hundredth).
- Minimum maximum-dosage setting: `1.0 ml` (`100` hundredths).
- Absolute maximum dosage: `5.0 ml` (`500` hundredths).
- Default dosage: `1.0 ml` (`100` hundredths).
- Default max dosage: `5.0 ml` (`500` hundredths).
- Default increment: `0.1 ml` (`10` hundredths).
- Supported increments:
  - `0.1 ml` (`10` hundredths).
  - `0.2 ml` (`20` hundredths).
  - `0.25 ml` (`25` hundredths).
  - `0.5 ml` (`50` hundredths).

### Generated Dosage Values

The valid dosage list is generated by:

```text
increment, increment * 2, increment * 3, ... maxDosage
```

Where:

- `maxDosage` is clamped to the absolute maximum of `5.0 ml`.
- Increment must be one of the supported increments.
- If the increment is invalid, use the default increment of `0.1 ml`.

### Maximum Dosage Settings

The Max Dosage setting uses valid dosage values filtered to `>= 1.0 ml`.

### Closest Value Rule

When a setting changes and another setting is no longer valid, the app chooses the valid value with the smallest absolute distance from the previous value.

This applies when:

- Max Dosage changes and Default Dosage must remain valid.
- Dosage Increment changes and both Max Dosage and Default Dosage may need to snap to valid values.

### Display Formatting

- Values divisible by 100 are shown with 1 decimal place, for example `1.0`.
- Values divisible by 10 are shown with 1 decimal place, for example `0.5`.
- Other values are shown with 2 decimal places, for example `0.25`.
- UI labels append `ml` where appropriate.

## 11. New Session Panel

### Layout

The New session panel contains:

- A centered drag handle.
- A milliliter section titled `ml`.
- A milliliter dial selector.
- A time-offset section titled `When`.
- An earlier-time dial selector.
- Optional earlier-time subtext.
- A full-width green `Start` button with a play icon.

### Opening Behavior

When the New session panel opens:

- The selected dosage is reset to the current Default Dosage setting.
- The selected earlier offset is reset to `0` minutes.

### Milliliter Dial

- Shows the current valid dosage values based on Max Dosage and Dosage Increment settings.
- Uses the shared dial selector behavior described in section 15.

### Milliliter Dial Colors

The dosage dial colors values relative to Default Dosage:

- The default value is neutral:
  - Black in light mode.
  - White in dark mode.
- Values below default blend from neutral toward green as they move lower.
- Values above default blend from neutral toward red as they move higher.
- Blend progress is clamped from 0 to 1.

### Earlier Dial

- Values are `0` through `90` minutes in `5` minute increments.
- Value `0` is displayed as `Now`.
- Non-zero values are displayed as the number of minutes only.

### Earlier Subtext

The subtext is hidden when selected earlier minutes is 0.

When visible:

- For 5 through 55 minutes: `minutes earlier`.
- For 60 through 85 minutes: `minutes earlier, really?`.
- For 90 minutes: `minutes earlier, really Girl???`.

### Start Button

Tapping Start:

- Starts a session with the selected dosage and earlier offset.
- Moves any existing active session to the top of history after ending it.
- Closes the New session panel.

## 12. History Panel

### Layout

The History panel contains:

- A centered drag handle.
- Centered title `History`.
- An empty state when no active session and no history exist.
- Otherwise, a plain list of rows.

### Empty State

When there are no sessions:

- Show a clock/question icon.
- Show text `No previous timers`.

### Row Order

- If an active session exists, it appears first.
- Historical sessions appear after the active session.
- Historical sessions are newest first because new history entries are inserted at index 0.

### Row Content

Each row has three columns:

- Left: session start time, date omitted, shortened time format.
- Center: session elapsed duration.
- Right: session dosage label followed by `ml`.

The duration format is:

- `MM:SS` when duration is under 1 hour.
- `H:MM:SS` when duration is 1 hour or greater.

Active-session elapsed duration updates once per second while visible.

### Delete Behavior

- The active session row is not deletable.
- Historical rows can be deleted.
- Dragging a historical row left reveals a red delete action with an `xmark` icon.
- Delete action width is 96 points.
- If the drag exceeds 45 percent of the delete width, the delete action remains revealed.
- Otherwise, the row snaps closed.
- Only one history row can have its delete action revealed at a time.
- A revealed delete action closes automatically after 3 seconds.
- Tapping the delete action removes that session from history and persists the updated history.

## 13. Reset Panel

### Layout

The Reset panel contains:

- A centered drag handle.
- Headline: `Reset all Dose-o-clock data?`
- Body text: `This clears the active timer and the history list.`
- Body text: `All data is also reset automatically when the current active timer has been running for 24 hours.`
- A full-width red `Reset All Data` button with a trash icon.

### Behavior

Tapping Reset All Data:

- Clears the active session.
- Clears history.
- Removes persisted active-session and history values.
- Closes the Reset panel.

The Reset button in the bottom action bar is disabled when there is no active session and no history.

## 14. Settings Panel

### Structure

The Settings panel contains:

- A centered drag handle.
- Header with title.
- Main Settings page.
- Dosage subpage.
- Graphics subpage.

The Settings panel has nested navigation:

- Main page title: `Settings`.
- Dosage page title: `Dosage`.
- Graphics page title: `Graphics`.
- Subpages show a back chevron button.
- Navigating forward transitions from the trailing edge.
- Navigating back transitions from the leading edge.

### Main Settings Page

The main page has two navigation rows:

- `Dosage`
  - Value is current Default Dosage, formatted as `{value} ml`.
  - Opens Dosage page.
- `Graphics`
  - Value is current dot color style label.
  - Opens Graphics page.

### Dosage Page

The Dosage page has three dial selectors:

- `Default Dosage (ml)`
  - Values are valid dosage values up to current Max Dosage.
- `Max Dosage (ml)`
  - Values are valid max dosage values from `1.0 ml` through `5.0 ml`.
- `Dosage Increment`
  - Values are supported dosage increments.

Changing any setting persists immediately.

When Max Dosage changes:

- Snap Max Dosage to the closest valid max dosage value.
- Snap Default Dosage to the closest valid dosage value within the new range.

When Dosage Increment changes:

- If the new increment is not supported, use the default increment.
- Snap Max Dosage to the closest valid max dosage value for the new increment.
- Snap Default Dosage to the closest valid dosage value for the new increment and max.

### Graphics Page

The Graphics page contains:

- Label: `Dot Colour Style`.
- Segmented picker titled `Dot Colour Style`.
- Options:
  - `Solid`.
  - `Gradient`.

Changing the style updates the timer visualization and persists immediately.

## 15. Dial Selector Component

The dial selector is a reusable horizontal control used for dosage and earlier-time values.

### Visual Behavior

- The selector is 72 points high.
- It uses a rounded rectangle background with a subtle vertical grouped-background gradient.
- A central capsule outline marks the selected value.
- Values appear on a curved horizontal cylinder:
  - Selected value is centered.
  - Nearby values appear left and right.
  - Values farther from center shrink and fade.
  - Edges are masked with a horizontal fade.
- Text uses a rounded, semibold, monospaced digit style at 24 points.

### Drag Behavior

- Drag left to increase the selected index.
- Drag right to decrease the selected index.
- Dragging is clamped so it cannot move past the first or last value.
- Selection updates live as the drag crosses values.
- On drag end, the control snaps to the nearest value with a spring animation.
- Haptic or tactile selection feedback plays when crossing into a new value on platforms that support it.

## 16. Persistence

All app state is persisted locally with device key-value storage.

### Persisted Values

- Active session:
  - Key: `dose-o-clock.active-session`.
  - Value: JSON-encoded `TimerSession`.
- History:
  - Key: `dose-o-clock.history`.
  - Value: JSON-encoded array of `TimerSession`.
- Default dosage:
  - Key: `dose-o-clock.default-unit-hundredths`.
  - Value: integer hundredths.
- Max dosage:
  - Key: `dose-o-clock.max-unit-hundredths`.
  - Value: integer hundredths.
- Dosage increment:
  - Key: `dose-o-clock.dosage-increment-hundredths`.
  - Value: integer hundredths.
- Dot color style:
  - Key: `dose-o-clock.dot-color-style`.
  - Value: raw string, either `solid` or `gradient`.

### Load Behavior

On app launch:

- Load dosage increment first, if valid.
- Load max dosage and snap it to a valid value for the current increment.
- Load default dosage and snap it to a valid value for the current increment and max.
- Load dot color style if recognized.
- Decode active session if present.
- Decode history if present.
- If active session is at least 24 real hours old, clear active session and history.

### Save Behavior

- Save active session and history after starting a session, ending a session automatically, or deleting history.
- Remove the active-session key if there is no active session.
- Settings changes are persisted immediately.
- Reset removes active-session and history keys.

## 17. Privacy and Data Handling

- All data remains on device.
- No network access is required.
- No personal data leaves the app.
- No analytics or telemetry are collected.
- No permissions are required.

## 18. Visual Design Requirements

- Use system grouped backgrounds for the main screen and panels.
- Use half-height slide-up panels with a small capsule drag handle.
- Use 8 point corner radii for panel rows, buttons, and dial backgrounds.
- Use a consistent icon set for icons.
- Use simple, high-contrast circular action buttons on the main screen.
- Use light and dark mode aware colors:
  - System grouped backgrounds.
  - System secondary grouped backgrounds.
  - Neutral dosage dial value is black in light mode and white in dark mode.

## 19. Acceptance Criteria

### Timer

- With no active session, the dot timer renders inactive dots and no active elapsed time.
- Starting a session immediately shows elapsed progress from zero plus any earlier offset.
- A session started with a 30 minute earlier offset displays 30 minutes of elapsed progress immediately.
- Elapsed time never displays below 0 or above 4 hours.
- A session automatically stops when elapsed time reaches 4 hours.
- A stopped active session remains visible until a new session starts or all data is reset.
- An active session and history survive app relaunch.
- Active session and history are cleared automatically once active session `startedAt` is at least 24 hours old.

### New Session

- Opening the New panel preselects Default Dosage and `Now`.
- The dosage dial reflects Max Dosage and Dosage Increment settings.
- The Earlier dial contains `Now` and 5 minute steps through 90 minutes.
- Starting a new session while one is active moves the previous active session to the top of history.

### History

- History shows active session first when present.
- Historical sessions are shown newest first.
- Durations under 1 hour display as `MM:SS`.
- Durations of 1 hour or more display as `H:MM:SS`.
- Historical rows can be deleted by revealing and tapping the red delete action.
- Active session row cannot be deleted from history.
- Empty history shows the empty state.

### Settings

- Default Dosage persists after relaunch.
- Max Dosage persists after relaunch.
- Dosage Increment persists after relaunch.
- Dot Colour Style persists after relaunch.
- Changing Max Dosage clamps Default Dosage to a valid value if necessary.
- Changing Dosage Increment clamps Max Dosage and Default Dosage to valid values if necessary.
- Gradient and Solid color styles visibly change the dot-ring timer.

### Reset

- Reset action is disabled when there is no active session and no history.
- Reset confirmation panel clearly states that active timer and history will be cleared.
- Confirming reset clears active session, clears history, removes their persisted values, and closes the panel.

### Panels

- Opening any panel closes the others.
- Tapping outside an open panel closes it.
- Open panels auto-close after 10 seconds of inactivity.
- Interaction inside a panel resets the auto-close timer.

## 20. Suggested Rebuild Architecture

A rebuild should keep these conceptual modules even if implementation details change:

- `App`: creates shared timer store and injects it into the main view.
- `TimerStore`: owns active session, history, settings, persistence, and automatic reset/stop logic.
- `TimerSession`: immutable session value with elapsed-time and stopping helpers.
- `Dosage`: dosage constants, formatting, valid value generation, and closest-value snapping.
- `MainView`: main layout, panel orchestration, timer tick, and bottom actions.
- `DotRingTimer`: pure visual component that draws elapsed time from `elapsed` and `colorStyle`.
- `DialSelector`: reusable drag selector.
- `HistoryPanel`: active and historical session list, deletion reveal behavior.
- `SettingsPanel`: nested settings UI and immediate setting persistence.

The business logic should be testable independently from presentation views, especially:

- Dosage value generation and formatting.
- Closest-value snapping.
- Timer elapsed clamping.
- Automatic stop date calculation.
- Starting a new session with existing active history.
- 24 hour automatic reset behavior.
