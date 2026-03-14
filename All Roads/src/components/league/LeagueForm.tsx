import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '../forms/FormInput';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { FormButton } from '../forms/FormButton';
import { CreateLeagueData, UpdateLeagueData, SportType, SkillLevel, PointsConfig, Team } from '../../types';
import { teamService } from '../../services/api/TeamService';
import { colors, fonts, typeScale, Spacing } from '../../theme';

interface AddedRoster {
  id: string;
  name: string;
  sportType?: string;
  memberCount?: number;
}

interface LeagueFormProps {
  initialData?: Partial<CreateLeagueData | UpdateLeagueData>;
  onSubmit: (data: CreateLeagueData | UpdateLeagueData) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
  isEdit?: boolean;
  loading?: boolean;
  initialRosters?: AddedRoster[];
}

export const LeagueForm: React.FC<LeagueFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  isEdit = false,
  loading = false,
  initialRosters = [],
}) => {
  const [leagueType, setLeagueType] = useState<'team' | 'pickup'>(
    (initialData as Partial<CreateLeagueData>)?.leagueType || 'team'
  );
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    (initialData as Partial<CreateLeagueData>)?.visibility || 'public'
  );
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [sportType, setSportType] = useState(initialData?.sportType || '');
  const [skillLevel, setSkillLevel] = useState(initialData?.skillLevel || '');
  const [seasonName, setSeasonName] = useState(initialData?.seasonName || '');
  const [startDate, setStartDate] = useState<Date | null>(() => {
    if (initialData?.startDate) {
      const d = new Date(initialData.startDate as any);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  });
  const [winPoints, setWinPoints] = useState(
    initialData?.pointsConfig?.win?.toString() || '3'
  );
  const [drawPoints, setDrawPoints] = useState(
    initialData?.pointsConfig?.draw?.toString() || '1'
  );
  const [lossPoints, setLossPoints] = useState(
    initialData?.pointsConfig?.loss?.toString() || '0'
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');

  // Schedule management fields
  const [minimumRosterSize, setMinimumRosterSize] = useState(
    (initialData as any)?.minimumRosterSize?.toString() || ''
  );
  const [registrationCloseDate, setRegistrationCloseDate] = useState(
    (initialData as any)?.registrationCloseDate?.toString() || ''
  );
  const [preferredGameDays, setPreferredGameDays] = useState<number[]>(
    (initialData as any)?.preferredGameDays || []
  );
  const [timeWindowStart, setTimeWindowStart] = useState(
    (initialData as any)?.preferredTimeWindowStart || ''
  );
  const [timeWindowEnd, setTimeWindowEnd] = useState(
    (initialData as any)?.preferredTimeWindowEnd || ''
  );
  const [seasonGameCount, setSeasonGameCount] = useState(
    (initialData as any)?.seasonGameCount?.toString() || ''
  );

  // Season configuration fields
  const [scheduleFrequency, setScheduleFrequency] = useState<'weekly' | 'monthly'>(
    (initialData as any)?.scheduleFrequency || 'weekly'
  );
  const [seasonLength, setSeasonLength] = useState(
    (initialData as any)?.seasonLength?.toString() || ''
  );
  const [autoGenerateMatchups, setAutoGenerateMatchups] = useState<boolean>(
    (initialData as any)?.autoGenerateMatchups ?? true
  );

  // Calendar picker state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    if (startDate) return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  // Add Rosters state
  const [addedRosters, setAddedRosters] = useState<AddedRoster[]>(initialRosters);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterSearchResults, setRosterSearchResults] = useState<AddedRoster[]>([]);
  const [isSearchingRosters, setIsSearchingRosters] = useState(false);
  const [rosterSearchError, setRosterSearchError] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const sportTypeOptions: SelectOption[] = [
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Pickleball', value: SportType.PICKLEBALL },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Softball', value: SportType.SOFTBALL },
    { label: 'Baseball', value: SportType.BASEBALL },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
    { label: 'Kickball', value: SportType.KICKBALL },
    { label: 'Other', value: SportType.OTHER },
  ];

  const skillLevelOptions: SelectOption[] = [
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  ];

  const leagueTypeOptions: SelectOption[] = [
    { label: 'Team League', value: 'team' },
    { label: 'Pickup League', value: 'pickup' },
  ];

  const visibilityOptions: SelectOption[] = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
  ];

  const frequencyOptions: SelectOption[] = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const handleLeagueTypeChange = (option: SelectOption) => {
    const newType = option.value as 'team' | 'pickup';
    setLeagueType(newType);
    if (newType === 'pickup') {
      setVisibility('public');
    }
  };

  // ── Calendar helpers ────────────────────────────────────────────
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isToday = (date: Date) => isSameDay(date, new Date());

  const handleSelectDate = (day: number) => {
    const selected = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    setStartDate(selected);
    setShowCalendar(false);
  };

  const goToPrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const calendarMonthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── Projected end date ──────────────────────────────────────────
  const projectedEndDate = (() => {
    if (!startDate || !seasonLength) return '';
    const len = parseInt(seasonLength);
    if (isNaN(len) || len < 1) return '';
    const end = new Date(startDate);
    if (scheduleFrequency === 'weekly') {
      end.setDate(end.getDate() + len * 7);
    } else {
      end.setMonth(end.getMonth() + len);
    }
    return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  // ── Day chips ───────────────────────────────────────────────────
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleGameDay = (day: number) => {
    setPreferredGameDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // ── Roster search ───────────────────────────────────────────────
  const handleSearchRosters = useCallback(async () => {
    const query = rosterSearchQuery.trim();
    if (!query) return;
    setIsSearchingRosters(true);
    setRosterSearchError(null);
    try {
      const result = await teamService.searchTeams(query);
      const results = (result.results || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        sportType: r.sportType,
        memberCount: r.members?.length ?? 0,
      }));
      // Filter out already-added rosters
      const addedIds = new Set(addedRosters.map(r => r.id));
      setRosterSearchResults(results.filter((r: AddedRoster) => !addedIds.has(r.id)));
    } catch (err) {
      setRosterSearchError(err instanceof Error ? err.message : 'Failed to search rosters');
      setRosterSearchResults([]);
    } finally {
      setIsSearchingRosters(false);
    }
  }, [rosterSearchQuery, addedRosters]);

  const handleAddRoster = (roster: AddedRoster) => {
    setAddedRosters(prev => [...prev, roster]);
    setRosterSearchResults(prev => prev.filter(r => r.id !== roster.id));
  };

  const handleRemoveRoster = (rosterId: string) => {
    setAddedRosters(prev => prev.filter(r => r.id !== rosterId));
  };

  // ── Validation ──────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'League name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'League name must be at least 3 characters';
    }

    if (!sportType) {
      newErrors.sportType = 'Sport type is required';
    }

    if (!skillLevel) {
      newErrors.skillLevel = 'Skill level is required';
    }

    const win = parseInt(winPoints);
    const draw = parseInt(drawPoints);
    const loss = parseInt(lossPoints);

    if (isNaN(win) || win < 0) {
      newErrors.winPoints = 'Win points must be a non-negative number';
    }
    if (isNaN(draw) || draw < 0) {
      newErrors.drawPoints = 'Draw points must be a non-negative number';
    }
    if (isNaN(loss) || loss < 0) {
      newErrors.lossPoints = 'Loss points must be a non-negative number';
    }

    const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (timeWindowStart && !hhmmRegex.test(timeWindowStart)) {
      newErrors.timeWindowStart = 'Must be in HH:MM format (e.g. 18:00)';
    }
    if (timeWindowEnd && !hhmmRegex.test(timeWindowEnd)) {
      newErrors.timeWindowEnd = 'Must be in HH:MM format (e.g. 21:00)';
    }
    if (timeWindowStart && timeWindowEnd && timeWindowStart >= timeWindowEnd) {
      newErrors.timeWindowEnd = 'End time must be after start time';
    }
    if (minimumRosterSize) {
      const minSize = parseInt(minimumRosterSize);
      if (isNaN(minSize) || minSize < 1) {
        newErrors.minimumRosterSize = 'Must be a positive number';
      }
    }
    if (seasonGameCount) {
      const count = parseInt(seasonGameCount);
      if (isNaN(count) || count < 1) {
        newErrors.seasonGameCount = 'Must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    const pointsConfig: PointsConfig = {
      win: parseInt(winPoints),
      draw: parseInt(drawPoints),
      loss: parseInt(lossPoints),
    };

    const formData: CreateLeagueData | UpdateLeagueData = {
      name: name.trim(),
      description: description.trim() || undefined,
      sportType: sportType as SportType,
      skillLevel: skillLevel as SkillLevel,
      seasonName: seasonName.trim() || undefined,
      startDate: startDate || undefined,
      endDate: undefined,
      pointsConfig,
      imageUrl: imageUrl.trim() || undefined,
      minimumRosterSize: minimumRosterSize ? parseInt(minimumRosterSize) : null,
      registrationCloseDate: registrationCloseDate ? new Date(registrationCloseDate) : null,
      preferredGameDays: preferredGameDays.length > 0 ? preferredGameDays : undefined,
      preferredTimeWindowStart: timeWindowStart || null,
      preferredTimeWindowEnd: timeWindowEnd || null,
      seasonGameCount: seasonGameCount ? parseInt(seasonGameCount) : null,
      scheduleFrequency,
      seasonLength: seasonLength ? parseInt(seasonLength) : null,
      autoGenerateMatchups,
      // Include added rosters for the parent to handle
      rosterIds: addedRosters.map(r => r.id),
      ...(isEdit ? {} : {
        leagueType,
        visibility: leagueType === 'pickup' ? 'public' : visibility,
      }),
    } as any;

    try {
      await onSubmit(formData);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save league');
    }
  };

  // ── Calendar renderer ───────────────────────────────────────────
  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.calendarNav} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.calendarMonthLabel}>{calendarMonthLabel}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNav} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarDayHeaders}>
          {dayLabels.map(d => (
            <Text key={d} style={styles.calendarDayHeader}>{d}</Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calendarWeek}>
            {week.map((day, di) => {
              if (day === null) return <View key={di} style={styles.calendarDayCell} />;
              const cellDate = new Date(year, month, day);
              const isSelected = startDate ? isSameDay(cellDate, startDate) : false;
              const isTodayDate = isToday(cellDate);
              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calendarDayCell,
                    isSelected && styles.calendarDaySelected,
                    isTodayDate && !isSelected && styles.calendarDayToday,
                  ]}
                  onPress={() => handleSelectDate(day)}
                  accessibilityLabel={`Select ${cellDate.toLocaleDateString()}`}
                  accessibilityRole="button"
                >
                  <Text style={[
                    styles.calendarDayText,
                    isSelected && styles.calendarDayTextSelected,
                    isTodayDate && !isSelected && styles.calendarDayTextToday,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {!isEdit && (
            <>
              <FormSelect
                label="League Type *"
                placeholder="Select league type"
                value={leagueType}
                options={leagueTypeOptions}
                onSelect={handleLeagueTypeChange}
              />

              {leagueType === 'team' && (
                <FormSelect
                  label="Visibility"
                  placeholder="Select visibility"
                  value={visibility}
                  options={visibilityOptions}
                  onSelect={(option) => setVisibility(option.value as 'public' | 'private')}
                />
              )}
            </>
          )}

          <FormInput
            label="League Name *"
            placeholder="Enter league name"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />

          <FormInput
            label="Description"
            placeholder="Enter league description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <FormSelect
            label="Sport Type *"
            placeholder="Select sport type"
            value={sportType}
            options={sportTypeOptions}
            onSelect={(option) => setSportType(option.value as string)}
            error={errors.sportType}
          />

          <FormSelect
            label="Skill Level *"
            placeholder="Select skill level"
            value={skillLevel}
            options={skillLevelOptions}
            onSelect={(option) => setSkillLevel(option.value as string)}
            error={errors.skillLevel}
          />

          <FormInput
            label="League Logo URL"
            placeholder="https://example.com/logo.png"
            value={imageUrl}
            onChangeText={setImageUrl}
            keyboardType="url"
          />

          <FormInput
            label="Season Name"
            placeholder="e.g., Spring 2026"
            value={seasonName}
            onChangeText={setSeasonName}
          />

          {/* Calendar date picker for Season Start Date */}
          <Text style={styles.fieldLabel}>Season Start Date</Text>
          <TouchableOpacity
            style={styles.datePickerTrigger}
            onPress={() => setShowCalendar(!showCalendar)}
            accessibilityRole="button"
            accessibilityLabel="Select season start date"
          >
            <Ionicons name="calendar-outline" size={20} color={colors.grass} />
            <Text style={[styles.datePickerText, !startDate && styles.datePickerPlaceholder]}>
              {startDate ? formatDateDisplay(startDate) : 'Select a date'}
            </Text>
            <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkFaint} />
          </TouchableOpacity>
          {showCalendar && renderCalendar()}

          <FormSelect
            label="Schedule Frequency"
            placeholder="Select frequency"
            value={scheduleFrequency}
            options={frequencyOptions}
            onSelect={(option) => setScheduleFrequency(option.value as 'weekly' | 'monthly')}
          />

          <FormInput
            label={`Season Length (${scheduleFrequency === 'weekly' ? 'weeks' : 'months'})`}
            placeholder={scheduleFrequency === 'weekly' ? 'e.g. 12' : 'e.g. 3'}
            value={seasonLength}
            onChangeText={setSeasonLength}
            keyboardType="numeric"
          />

          {/* Projected End Date — read-only */}
          <View style={styles.projectedEndRow}>
            <Text style={styles.fieldLabel}>Projected End Date</Text>
            <Text style={styles.projectedEndValue}>
              {projectedEndDate || 'Set start date and season length'}
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Auto-Generate Matchups</Text>
              <Text style={styles.toggleDescription}>
                Automatically create shell matchup events after registration closes
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, autoGenerateMatchups && styles.toggleActive]}
              onPress={() => setAutoGenerateMatchups(!autoGenerateMatchups)}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityState={{ checked: autoGenerateMatchups }}
            >
              <View style={[styles.toggleThumb, autoGenerateMatchups && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          <FormInput
            label="Points for Win"
            placeholder="3"
            value={winPoints}
            onChangeText={setWinPoints}
            keyboardType="numeric"
            error={errors.winPoints}
          />

          <FormInput
            label="Points for Draw"
            placeholder="1"
            value={drawPoints}
            onChangeText={setDrawPoints}
            keyboardType="numeric"
            error={errors.drawPoints}
          />

          <FormInput
            label="Points for Loss"
            placeholder="0"
            value={lossPoints}
            onChangeText={setLossPoints}
            keyboardType="numeric"
            error={errors.lossPoints}
          />

          {/* Schedule Configuration — team leagues only */}
          {leagueType === 'team' && (
            <>
              <FormInput
                label="Minimum Roster Size"
                placeholder="e.g. 5"
                value={minimumRosterSize}
                onChangeText={setMinimumRosterSize}
                keyboardType="numeric"
                error={errors.minimumRosterSize}
              />

              <FormInput
                label="Registration Close Date"
                placeholder="YYYY-MM-DD"
                value={registrationCloseDate}
                onChangeText={setRegistrationCloseDate}
              />

              <Text style={styles.fieldLabel}>Preferred Game Days</Text>
              <View style={styles.dayChipsRow}>
                {dayLabels.map((label, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dayChip,
                      preferredGameDays.includes(idx) && styles.dayChipSelected,
                    ]}
                    onPress={() => toggleGameDay(idx)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        preferredGameDays.includes(idx) && styles.dayChipTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormInput
                label="Time Window Start"
                placeholder="HH:MM (e.g. 18:00)"
                value={timeWindowStart}
                onChangeText={setTimeWindowStart}
                error={errors.timeWindowStart}
              />

              <FormInput
                label="Time Window End"
                placeholder="HH:MM (e.g. 21:00)"
                value={timeWindowEnd}
                onChangeText={setTimeWindowEnd}
                error={errors.timeWindowEnd}
              />

              <FormInput
                label="Season Game Count"
                placeholder="Total games per roster"
                value={seasonGameCount}
                onChangeText={setSeasonGameCount}
                keyboardType="numeric"
                error={errors.seasonGameCount}
              />
            </>
          )}

          {/* Add Rosters — inline in the flat form */}
          <Text style={styles.fieldLabel}>Add Rosters</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={rosterSearchQuery}
              onChangeText={(text) => {
                setRosterSearchQuery(text);
                setRosterSearchError(null);
              }}
              placeholder="Search rosters by name"
              placeholderTextColor={colors.inkFaint}
              returnKeyType="search"
              onSubmitEditing={handleSearchRosters}
              accessibilityLabel="Search rosters by name"
            />
            <TouchableOpacity
              style={[styles.searchButton, (!rosterSearchQuery.trim() || isSearchingRosters) && styles.searchButtonDisabled]}
              onPress={handleSearchRosters}
              disabled={!rosterSearchQuery.trim() || isSearchingRosters}
              accessibilityRole="button"
              accessibilityLabel="Search"
            >
              {isSearchingRosters ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="search" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {rosterSearchError && (
            <View style={styles.searchErrorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.track} />
              <Text style={styles.searchErrorText}>{rosterSearchError}</Text>
            </View>
          )}

          {rosterSearchResults.length > 0 && (
            <View style={styles.searchResults}>
              {rosterSearchResults.map(r => (
                <View key={r.id} style={styles.searchResultItem}>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{r.name}</Text>
                    {r.sportType && (
                      <Text style={styles.searchResultMeta}>
                        {r.sportType} • {r.memberCount ?? 0} players
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={() => handleAddRoster(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${r.name}`}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {rosterSearchResults.length === 0 && rosterSearchQuery.trim() && !isSearchingRosters && !rosterSearchError && (
            <Text style={styles.noResults}>No results for "{rosterSearchQuery.trim()}"</Text>
          )}

          {addedRosters.length > 0 && (
            <View style={styles.addedList}>
              <Text style={styles.addedListLabel}>Added Rosters ({addedRosters.length})</Text>
              {addedRosters.map(item => (
                <View key={item.id} style={styles.addedItem}>
                  <Text style={styles.addedItemName}>{item.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveRoster(item.id)}
                    style={styles.removeItemBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.track} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed bottom action bar — horizontal row matching EditEventScreen */}
      <View style={styles.actions}>
        {isEdit && onDelete && (
          <FormButton
            title="Delete"
            variant="danger"
            onPress={onDelete}
            style={styles.deleteButton}
            disabled={loading}
          />
        )}
        {onCancel && (
          <FormButton
            title="Cancel"
            variant="outline"
            onPress={onCancel}
            style={styles.actionButton}
            disabled={loading}
          />
        )}
        <FormButton
          title={isEdit ? 'Save Changes' : 'Create League'}
          onPress={handleSubmit}
          style={styles.actionButton}
          loading={loading}
          disabled={loading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  form: {
    padding: 16,
  },
  fieldLabel: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.ink,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  // Calendar date picker
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: Spacing.md,
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  datePickerPlaceholder: {
    color: colors.inkFaint,
  },
  calendar: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: Spacing.lg,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNav: {
    padding: 6,
  },
  calendarMonthLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  calendarDayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.inkFaint,
    textTransform: 'uppercase',
  },
  calendarWeek: {
    flexDirection: 'row',
  },
  calendarDayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: colors.grass,
  },
  calendarDayToday: {
    backgroundColor: '#EDF7F0',
  },
  calendarDayText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontFamily: fonts.semibold,
  },
  calendarDayTextToday: {
    color: colors.grass,
    fontFamily: fonts.semibold,
  },
  // Projected end date
  projectedEndRow: {
    marginBottom: Spacing.lg,
  },
  projectedEndValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.grass,
    marginTop: 4,
  },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.grass,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Day chips
  dayChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayChipSelected: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  dayChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  // Search section styles
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    backgroundColor: '#FAFAFA',
  },
  searchButton: {
    backgroundColor: colors.grass,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: 6,
  },
  searchErrorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.track,
    flex: 1,
  },
  searchResults: {
    marginTop: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 6,
  },
  searchResultInfo: {
    flex: 1,
    marginRight: 12,
  },
  searchResultName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
  },
  searchResultMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  addItemBtn: {
    backgroundColor: colors.grass,
    borderRadius: 8,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkFaint,
    marginTop: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
  addedList: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  addedListLabel: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EDF7F0',
    borderRadius: 8,
    marginBottom: 6,
  },
  addedItemName: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  removeItemBtn: {
    padding: 4,
  },
  // Bottom action bar — horizontal row matching EditEventScreen
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  deleteButton: {
    marginRight: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});
