import React, { useState, useCallback, useEffect } from 'react';
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
import { TimePickerInput } from '../forms/TimePickerInput';
import {
  CreateLeagueData,
  UpdateLeagueData,
  SportType,
  SkillLevel,
  PointsConfig,
  Team,
} from '../../types';
import { teamService } from '../../services/api/TeamService';
import { fonts, typeScale, Spacing, useTheme } from '../../theme';
import { loggingService } from '../../services/LoggingService';

interface AddedRoster {
  id: string;
  name: string;
  sportType?: string;
  memberCount?: number;
  status?: 'active' | 'pending';
}

interface LeagueFormProps {
  initialData?: Partial<CreateLeagueData | UpdateLeagueData>;
  onSubmit: (data: CreateLeagueData | UpdateLeagueData) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
  isEdit?: boolean;
  loading?: boolean;
  initialRosters?: AddedRoster[];
  initialInvitedRosters?: AddedRoster[];
}

export const LeagueForm: React.FC<LeagueFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  isEdit = false,
  loading = false,
  initialRosters = [],
  initialInvitedRosters = [],
}) => {
  const { colors } = useTheme();
  const [leagueFormat, setLeagueFormat] = useState<
    'season' | 'season_with_playoffs' | 'tournament' | ''
  >((initialData as any)?.leagueFormat || '');
  const [playoffTeamCount, setPlayoffTeamCount] = useState(
    (initialData as any)?.playoffTeamCount?.toString() || ''
  );
  const [eliminationFormat, setEliminationFormat] = useState<string>(
    (initialData as any)?.eliminationFormat || ''
  );
  const [gameFrequency, setGameFrequency] = useState<string>(
    (initialData as any)?.gameFrequency || ''
  );
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [sportType, setSportType] = useState(initialData?.sportType || '');
  const [skillLevel, setSkillLevel] = useState(initialData?.skillLevel || '');
  const [minPlayerRating, setMinPlayerRating] = useState(
    initialData?.minPlayerRating != null
      ? String(initialData.minPlayerRating)
      : ''
  );
  const [genderRestriction, setGenderRestriction] = useState<string>(
    (initialData as any)?.genderRestriction || ''
  );
  const [startDate, setStartDate] = useState<Date | null>(() => {
    if (initialData?.startDate) {
      const d = new Date(initialData.startDate as any);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => {
    if ((initialData as any)?.endDate) {
      const d = new Date((initialData as any).endDate);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  });
  const [showEndCalendar, setShowEndCalendar] = useState(false);
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
  const [suggestedRosterSize, setSuggestedRosterSize] = useState(
    (initialData as any)?.suggestedRosterSize?.toString() ||
      (initialData as any)?.minimumRosterSize?.toString() ||
      ''
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
  const [scheduleFrequency, setScheduleFrequency] = useState<
    'weekly' | 'monthly'
  >((initialData as any)?.scheduleFrequency || 'weekly');
  const [seasonLength, setSeasonLength] = useState(
    (initialData as any)?.seasonLength?.toString() || ''
  );
  // Track Standings toggle
  const [trackStandings, setTrackStandings] = useState<boolean>(
    (initialData as any)?.trackStandings ?? true
  );

  // Registration Cutoff calendar state
  const [registrationCutoffDate, setRegistrationCutoffDate] =
    useState<Date | null>(() => {
      if ((initialData as any)?.registrationCloseDate) {
        const d = new Date((initialData as any).registrationCloseDate);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    });
  const [showCutoffCalendar, setShowCutoffCalendar] = useState(false);
  const [cutoffCalendarMonth, setCutoffCalendarMonth] = useState<Date>(() => {
    if (registrationCutoffDate)
      return new Date(
        registrationCutoffDate.getFullYear(),
        registrationCutoffDate.getMonth(),
        1
      );
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  // Calendar picker state
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    if (startDate)
      return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  // End date calendar state
  const [endCalendarMonth, setEndCalendarMonth] = useState<Date>(() => {
    if (endDate) return new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    if (startDate)
      return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  });

  // Add Rosters state
  const [addedRosters, setAddedRosters] =
    useState<AddedRoster[]>(initialRosters);
  const [invitedRosters, setInvitedRosters] = useState<AddedRoster[]>(
    initialInvitedRosters
  );
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterSearchResults, setRosterSearchResults] = useState<AddedRoster[]>(
    []
  );
  const [isSearchingRosters, setIsSearchingRosters] = useState(false);
  const [rosterSearchError, setRosterSearchError] = useState<string | null>(
    null
  );

  // Sync initialRosters when they arrive asynchronously (e.g. after API fetch)
  const rostersInitialized = React.useRef(false);
  useEffect(() => {
    if (initialRosters.length > 0 && !rostersInitialized.current) {
      setAddedRosters(initialRosters);
      rostersInitialized.current = true;
    }
  }, [initialRosters]);

  // Sync initialInvitedRosters when they arrive asynchronously
  const invitedRostersInitialized = React.useRef(false);
  useEffect(() => {
    if (
      initialInvitedRosters.length > 0 &&
      !invitedRostersInitialized.current
    ) {
      setInvitedRosters(initialInvitedRosters);
      invitedRostersInitialized.current = true;
    }
  }, [initialInvitedRosters]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const sportTypeOptions: SelectOption[] = [
    { label: 'Baseball', value: SportType.BASEBALL },
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
    { label: 'Kickball', value: SportType.KICKBALL },
    { label: 'Pickleball', value: SportType.PICKLEBALL },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Softball', value: SportType.SOFTBALL },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Other', value: SportType.OTHER },
  ];

  const skillLevelOptions: SelectOption[] = [
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  ];

  const frequencyOptions: SelectOption[] = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const leagueFormatOptions: SelectOption[] = [
    { label: 'Season', value: 'season' },
    { label: 'Season with Playoffs', value: 'season_with_playoffs' },
    { label: 'Tournament', value: 'tournament' },
  ];

  const gameFrequencyOptions: SelectOption[] = [
    { label: 'All at Once', value: 'all_at_once' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const eliminationFormatOptions: SelectOption[] = [
    { label: 'Single Elimination', value: 'single_elimination' },
    { label: 'Double Elimination', value: 'double_elimination' },
  ];

  // Ã¢â€â‚¬Ã¢â€â‚¬ Calendar helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isToday = (date: Date) => isSameDay(date, new Date());

  const handleSelectDate = (day: number) => {
    const selected = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );
    setStartDate(selected);
    setShowCalendar(false);
  };

  const goToPrevMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCalendarMonth(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
    );
  };

  const calendarMonthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Cutoff calendar helpers
  const handleSelectCutoffDate = (day: number) => {
    const selected = new Date(
      cutoffCalendarMonth.getFullYear(),
      cutoffCalendarMonth.getMonth(),
      day
    );
    setRegistrationCutoffDate(selected);
    setShowCutoffCalendar(false);
  };

  const goToCutoffPrevMonth = () => {
    setCutoffCalendarMonth(
      new Date(
        cutoffCalendarMonth.getFullYear(),
        cutoffCalendarMonth.getMonth() - 1,
        1
      )
    );
  };

  const goToCutoffNextMonth = () => {
    setCutoffCalendarMonth(
      new Date(
        cutoffCalendarMonth.getFullYear(),
        cutoffCalendarMonth.getMonth() + 1,
        1
      )
    );
  };

  const cutoffCalendarMonthLabel = cutoffCalendarMonth.toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' }
  );

  // End date calendar helpers
  const handleSelectEndDate = (day: number) => {
    const selected = new Date(
      endCalendarMonth.getFullYear(),
      endCalendarMonth.getMonth(),
      day
    );
    setEndDate(selected);
    setShowEndCalendar(false);
  };

  const goToEndPrevMonth = () => {
    setEndCalendarMonth(
      new Date(
        endCalendarMonth.getFullYear(),
        endCalendarMonth.getMonth() - 1,
        1
      )
    );
  };

  const goToEndNextMonth = () => {
    setEndCalendarMonth(
      new Date(
        endCalendarMonth.getFullYear(),
        endCalendarMonth.getMonth() + 1,
        1
      )
    );
  };

  const endCalendarMonthLabel = endCalendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Projected end date Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const projectedEndDate = (() => {
    if (!startDate) return '';
    // For "all at once", show the user-selected end date
    if (gameFrequency === 'all_at_once') {
      if (endDate) return formatDateDisplay(endDate);
      return '';
    }
    // For tournament format, use gameFrequency to estimate
    if (leagueFormat === 'tournament') {
      if (!gameFrequency) return '';
      const rounds = 4; // default bracket estimate
      const end = new Date(startDate);
      if (gameFrequency === 'weekly') {
        end.setDate(end.getDate() + rounds * 7);
      } else if (gameFrequency === 'monthly') {
        end.setMonth(end.getMonth() + rounds);
      }
      return end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (!seasonLength) return '';
    const len = parseInt(seasonLength);
    if (isNaN(len) || len < 1) return '';
    const end = new Date(startDate);
    if (scheduleFrequency === 'weekly') {
      end.setDate(end.getDate() + len * 7);
    } else {
      end.setMonth(end.getMonth() + len);
    }
    return end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  // Ã¢â€â‚¬Ã¢â€â‚¬ Day chips Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleGameDay = (day: number) => {
    setPreferredGameDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Format change handler Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handleFormatChange = (format: string) => {
    setLeagueFormat(format as any);
    // Clear format-specific fields but retain shared fields
    setPlayoffTeamCount('');
    setEliminationFormat('');
    if (format === 'tournament') {
      setSeasonLength('');
      setSeasonGameCount('');
      setTrackStandings(false);
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Roster search (debounced, like player search) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  useEffect(() => {
    const query = rosterSearchQuery.trim();
    if (query.length < 2) {
      setRosterSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
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
        // Filter out already-added and already-invited rosters
        const existingIds = new Set([
          ...addedRosters.map(r => r.id),
          ...invitedRosters.map(r => r.id),
        ]);
        setRosterSearchResults(
          results.filter((r: AddedRoster) => !existingIds.has(r.id))
        );
      } catch (err) {
        setRosterSearchError(
          err instanceof Error ? err.message : 'Failed to search rosters'
        );
        setRosterSearchResults([]);
      } finally {
        setIsSearchingRosters(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [rosterSearchQuery, addedRosters, invitedRosters]);

  const handleAddRoster = (roster: AddedRoster) => {
    // New rosters go to the invited list (pending state)
    setInvitedRosters(prev => [...prev, { ...roster, status: 'pending' }]);
    setRosterSearchResults(prev => prev.filter(r => r.id !== roster.id));
    if (rosterSearchResults.length === 1) {
      setRosterSearchQuery('');
    }
  };

  const handleRemoveRoster = (rosterId: string) => {
    setAddedRosters(prev => prev.filter(r => r.id !== rosterId));
  };

  const handleRemoveInvitedRoster = (rosterId: string) => {
    setInvitedRosters(prev => prev.filter(r => r.id !== rosterId));
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Validation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!leagueFormat) {
      newErrors.leagueFormat = 'League format is required';
    }

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

    if (minPlayerRating) {
      const rating = parseInt(minPlayerRating);
      if (isNaN(rating) || rating < 0 || rating > 100) {
        newErrors.minPlayerRating = 'Rating must be between 0 and 100';
      }
    }

    const win = parseInt(winPoints);
    const draw = parseInt(drawPoints);
    const loss = parseInt(lossPoints);

    if (trackStandings) {
      if (isNaN(win) || win < 0) {
        newErrors.winPoints = 'Win points must be a non-negative number';
      }
      if (isNaN(draw) || draw < 0) {
        newErrors.drawPoints = 'Draw points must be a non-negative number';
      }
      if (isNaN(loss) || loss < 0) {
        newErrors.lossPoints = 'Loss points must be a non-negative number';
      }
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
    if (suggestedRosterSize) {
      const minSize = parseInt(suggestedRosterSize);
      if (isNaN(minSize) || minSize < 1) {
        newErrors.suggestedRosterSize = 'Must be a positive number';
      }
    }
    if (seasonGameCount) {
      const count = parseInt(seasonGameCount);
      if (isNaN(count) || count < 1) {
        newErrors.seasonGameCount = 'Must be a positive number';
      }
    }

    setErrors(newErrors);

    // Log each validation failure
    Object.entries(newErrors).forEach(([field, msg]) => {
      loggingService.logValidation('LeagueForm', field, 'invalid', msg);
    });

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert(
        'Validation Error',
        'Please fix the errors before submitting'
      );
      return;
    }

    loggingService.logButton(
      isEdit ? 'Update League' : 'Create League',
      'LeagueForm'
    );

    const pointsConfig: PointsConfig = trackStandings
      ? {
          win: parseInt(winPoints),
          draw: parseInt(drawPoints),
          loss: parseInt(lossPoints),
        }
      : { win: 0, draw: 0, loss: 0 };

    const formData: CreateLeagueData | UpdateLeagueData = {
      name: name.trim(),
      description: description.trim() || undefined,
      sportType: sportType as SportType,
      skillLevel: skillLevel as SkillLevel,
      minPlayerRating: minPlayerRating ? parseInt(minPlayerRating) : undefined,
      genderRestriction: genderRestriction || undefined,
      startDate: startDate || undefined,
      endDate: gameFrequency === 'all_at_once' && endDate ? endDate : undefined,
      pointsConfig,
      imageUrl: imageUrl.trim() || undefined,
      suggestedRosterSize: suggestedRosterSize
        ? parseInt(suggestedRosterSize)
        : null,
      registrationCloseDate: registrationCutoffDate || null,
      preferredGameDays:
        preferredGameDays.length > 0 ? preferredGameDays : undefined,
      preferredTimeWindowStart: timeWindowStart || null,
      preferredTimeWindowEnd: timeWindowEnd || null,
      seasonGameCount: seasonGameCount ? parseInt(seasonGameCount) : null,
      scheduleFrequency,
      seasonLength: seasonLength ? parseInt(seasonLength) : null,
      trackStandings,
      leagueFormat: leagueFormat || undefined,
      playoffTeamCount: playoffTeamCount ? parseInt(playoffTeamCount) : null,
      eliminationFormat: eliminationFormat || null,
      gameFrequency: gameFrequency || null,
      // Include added rosters for the parent to handle
      rosterIds: addedRosters.map(r => r.id),
      invitedRosterIds: invitedRosters.map(r => r.id),
      ...(isEdit
        ? {}
        : {
            leagueType: 'team',
          }),
    } as any;

    try {
      await onSubmit(formData);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save league'
      );
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Calendar renderer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
      <View style={[styles.calendar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            style={styles.calendarNav}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthLabel, { color: colors.ink }]}>{calendarMonthLabel}</Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={styles.calendarNav}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarDayHeaders}>
          {dayLabels.map(d => (
            <Text key={d} style={[styles.calendarDayHeader, { color: colors.inkFaint }]}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calendarWeek}>
            {week.map((day, di) => {
              if (day === null)
                return <View key={di} style={styles.calendarDayCell} />;
              const cellDate = new Date(year, month, day);
              const isSelected = startDate
                ? isSameDay(cellDate, startDate)
                : false;
              const isTodayDate = isToday(cellDate);
              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calendarDayCell,
                    isSelected && styles.calendarDaySelected, isSelected && { backgroundColor: colors.cobalt },
                    isTodayDate && !isSelected && styles.calendarDayToday, isTodayDate && !isSelected && { backgroundColor: colors.successLight }]}
                  onPress={() => handleSelectDate(day)}
                  accessibilityLabel={`Select ${cellDate.toLocaleDateString()}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.calendarDayText, { color: colors.ink },
                      isSelected && styles.calendarDayTextSelected, isSelected && { color: colors.white },
                      isTodayDate && !isSelected && styles.calendarDayTextToday, isTodayDate && !isSelected && { color: colors.cobalt }]}
                  >
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Cutoff Calendar renderer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const renderCutoffCalendar = () => {
    const year = cutoffCalendarMonth.getFullYear();
    const month = cutoffCalendarMonth.getMonth();
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
      <View style={[styles.calendar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={goToCutoffPrevMonth}
            style={styles.calendarNav}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthLabel, { color: colors.ink }]}>
            {cutoffCalendarMonthLabel}
          </Text>
          <TouchableOpacity
            onPress={goToCutoffNextMonth}
            style={styles.calendarNav}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarDayHeaders}>
          {dayLabels.map(d => (
            <Text key={d} style={[styles.calendarDayHeader, { color: colors.inkFaint }]}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calendarWeek}>
            {week.map((day, di) => {
              if (day === null)
                return <View key={di} style={styles.calendarDayCell} />;
              const cellDate = new Date(year, month, day);
              const isSelected = registrationCutoffDate
                ? isSameDay(cellDate, registrationCutoffDate)
                : false;
              const isTodayDate = isToday(cellDate);
              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calendarDayCell,
                    isSelected && styles.calendarDaySelected, isSelected && { backgroundColor: colors.cobalt },
                    isTodayDate && !isSelected && styles.calendarDayToday, isTodayDate && !isSelected && { backgroundColor: colors.successLight }]}
                  onPress={() => handleSelectCutoffDate(day)}
                  accessibilityLabel={`Select ${cellDate.toLocaleDateString()}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.calendarDayText, { color: colors.ink },
                      isSelected && styles.calendarDayTextSelected, isSelected && { color: colors.white },
                      isTodayDate && !isSelected && styles.calendarDayTextToday, isTodayDate && !isSelected && { color: colors.cobalt }]}
                  >
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ End Date Calendar renderer Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const renderEndCalendar = () => {
    const year = endCalendarMonth.getFullYear();
    const month = endCalendarMonth.getMonth();
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
      <View style={[styles.calendar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={goToEndPrevMonth}
            style={styles.calendarNav}
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.calendarMonthLabel, { color: colors.ink }]}>{endCalendarMonthLabel}</Text>
          <TouchableOpacity
            onPress={goToEndNextMonth}
            style={styles.calendarNav}
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.calendarDayHeaders}>
          {dayLabels.map(d => (
            <Text key={d} style={[styles.calendarDayHeader, { color: colors.inkFaint }]}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.calendarWeek}>
            {week.map((day, di) => {
              if (day === null)
                return <View key={di} style={styles.calendarDayCell} />;
              const cellDate = new Date(year, month, day);
              const isSelected = endDate ? isSameDay(cellDate, endDate) : false;
              const isTodayDate = isToday(cellDate);
              const isBeforeStart = startDate ? cellDate <= startDate : false;
              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calendarDayCell,
                    isSelected && styles.calendarDaySelected, isSelected && { backgroundColor: colors.cobalt },
                    isTodayDate && !isSelected && styles.calendarDayToday, isTodayDate && !isSelected && { backgroundColor: colors.successLight },
                    isBeforeStart && { opacity: 0.3 }]}
                  onPress={() => !isBeforeStart && handleSelectEndDate(day)}
                  disabled={isBeforeStart}
                  accessibilityLabel={`Select ${cellDate.toLocaleDateString()}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.calendarDayText, { color: colors.ink },
                      isSelected && styles.calendarDayTextSelected, isSelected && { color: colors.white },
                      isTodayDate && !isSelected && styles.calendarDayTextToday, isTodayDate && !isSelected && { color: colors.cobalt }]}
                  >
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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* League Format Selector Ã¢â‚¬â€ required before other fields */}
          <FormSelect
            label="League Format *"
            placeholder="Select league format"
            value={leagueFormat}
            options={leagueFormatOptions}
            onSelect={option => handleFormatChange(option.value as string)}
            error={errors.leagueFormat}
          />

          {!leagueFormat && (
            <View style={[styles.formatHint, { backgroundColor: colors.surface }]}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.inkFaint}
              />
              <Text style={[styles.formatHintText, { color: colors.inkFaint }]}>
                Select a league format to configure the rest of the league
                settings.
              </Text>
            </View>
          )}

          {!!leagueFormat && (
            <>
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
                label="Sport *"
                placeholder="Select sport"
                value={sportType}
                options={sportTypeOptions}
                onSelect={option => setSportType(option.value as string)}
                error={errors.sportType}
              />

              <FormSelect
                label="Skill Level *"
                placeholder="Select skill level"
                value={skillLevel}
                options={skillLevelOptions}
                onSelect={option => setSkillLevel(option.value as string)}
                error={errors.skillLevel}
              />

              <FormInput
                label="Min Player Rating (0-100)"
                placeholder="e.g., 80 for 80th percentile"
                value={minPlayerRating}
                onChangeText={setMinPlayerRating}
                keyboardType="numeric"
                error={errors.minPlayerRating}
              />

              {/* Gender Restriction */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.ink }]}>Gender Restriction</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {[
                    { label: 'Open to All', value: '' },
                    { label: 'Male', value: 'male' },
                    { label: 'Female', value: 'female' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor:
                          genderRestriction === opt.value
                            ? colors.cobalt
                            : colors.background,
                        borderWidth: 1,
                        borderColor:
                          genderRestriction === opt.value
                            ? colors.cobalt
                            : colors.border,
                      }}
                      onPress={() => setGenderRestriction(opt.value)}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color:
                            genderRestriction === opt.value
                              ? colors.white
                              : colors.inkFaint,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Calendar date picker for Season Start Date */}
              <Text style={[styles.fieldLabel, { color: colors.ink }]}>Season Start Date</Text>
              <TouchableOpacity
                style={[styles.datePickerTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowCalendar(!showCalendar)}
                accessibilityRole="button"
                accessibilityLabel="Select season start date"
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.cobalt}
                />
                <Text
                  style={[
                    styles.datePickerText, { color: colors.ink },
                    !startDate && styles.datePickerPlaceholder, !startDate && { color: colors.inkFaint }]}
                >
                  {startDate ? formatDateDisplay(startDate) : 'Select a date'}
                </Text>
                <Ionicons
                  name={showCalendar ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.inkFaint}
                />
              </TouchableOpacity>
              {showCalendar && renderCalendar()}

              {/* Ã¢â€â‚¬Ã¢â€â‚¬ Format-specific fields Ã¢â€â‚¬Ã¢â€â‚¬ */}

              {/* Game Frequency Ã¢â‚¬â€ all formats */}
              <FormSelect
                label="Game Frequency"
                placeholder="Select frequency"
                value={
                  gameFrequency ||
                  (leagueFormat === 'tournament' ? '' : scheduleFrequency)
                }
                options={gameFrequencyOptions}
                onSelect={option => {
                  setGameFrequency(option.value as string);
                  if (option.value === 'weekly' || option.value === 'monthly') {
                    setScheduleFrequency(option.value as 'weekly' | 'monthly');
                  }
                }}
              />

              {/* End Date picker Ã¢â‚¬â€ visible for "All at Once" frequency */}
              {gameFrequency === 'all_at_once' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.ink }]}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.datePickerTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => setShowEndCalendar(!showEndCalendar)}
                    accessibilityRole="button"
                    accessibilityLabel="Select end date"
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.gold}
                    />
                    <Text
                      style={[
                        styles.datePickerText, { color: colors.ink },
                        !endDate && styles.datePickerPlaceholder, !endDate && { color: colors.inkFaint }]}
                    >
                      {endDate
                        ? formatDateDisplay(endDate)
                        : 'Select an end date'}
                    </Text>
                    <Ionicons
                      name={showEndCalendar ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.inkFaint}
                    />
                  </TouchableOpacity>
                  {showEndCalendar && renderEndCalendar()}
                  {endDate && (
                    <TouchableOpacity
                      onPress={() => setEndDate(null)}
                      style={styles.clearDateBtn}
                    >
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={colors.heart}
                      />
                      <Text style={[styles.clearDateText, { color: colors.heart }]}>Clear end date</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Season Length Ã¢â‚¬â€ Season and Season with Playoffs only, hidden for All at Once */}
              {(leagueFormat === 'season' ||
                leagueFormat === 'season_with_playoffs') &&
                gameFrequency !== 'all_at_once' && (
                  <FormInput
                    label={`Season Length (${scheduleFrequency === 'monthly' ? 'months' : 'weeks'})`}
                    placeholder={
                      scheduleFrequency === 'monthly' ? 'e.g. 3' : 'e.g. 12'
                    }
                    value={seasonLength}
                    onChangeText={setSeasonLength}
                    keyboardType="numeric"
                  />
                )}

              {/* Number of Games per Roster Ã¢â‚¬â€ Season and Season with Playoffs only */}
              {(leagueFormat === 'season' ||
                leagueFormat === 'season_with_playoffs') && (
                <FormInput
                  label="Number of Regular Season Games per Roster"
                  placeholder="Total regular season games per roster"
                  value={seasonGameCount}
                  onChangeText={setSeasonGameCount}
                  keyboardType="numeric"
                  error={errors.seasonGameCount}
                />
              )}

              {/* Playoff fields Ã¢â‚¬â€ Season with Playoffs only */}
              {leagueFormat === 'season_with_playoffs' && (
                <>
                  <FormInput
                    label="Number of Playoff Rosters"
                    placeholder="e.g. 4"
                    value={playoffTeamCount}
                    onChangeText={setPlayoffTeamCount}
                    keyboardType="numeric"
                  />
                  <FormSelect
                    label="Playoff Format"
                    placeholder="Select elimination format"
                    value={eliminationFormat}
                    options={eliminationFormatOptions}
                    onSelect={option =>
                      setEliminationFormat(option.value as string)
                    }
                  />
                </>
              )}

              {/* Tournament fields */}
              {leagueFormat === 'tournament' && (
                <FormSelect
                  label="Elimination Format"
                  placeholder="Select elimination format"
                  value={eliminationFormat}
                  options={eliminationFormatOptions}
                  onSelect={option =>
                    setEliminationFormat(option.value as string)
                  }
                />
              )}

              {/* Projected End Date Ã¢â‚¬â€ read-only */}
              <View style={styles.projectedEndRow}>
                <Text style={[styles.fieldLabel, { color: colors.ink }]}>Projected End Date</Text>
                <Text style={[styles.projectedEndValue, { color: colors.cobalt }]}>
                  {projectedEndDate ||
                    (gameFrequency === 'all_at_once'
                      ? 'Select an end date above'
                      : leagueFormat === 'tournament'
                        ? 'Set start date and game frequency'
                        : 'Set start date and season length')}
                </Text>
              </View>

              {/* Suggested Roster Size */}
              <FormInput
                label="Suggested Roster Size"
                placeholder="e.g. 5"
                value={suggestedRosterSize}
                onChangeText={setSuggestedRosterSize}
                keyboardType="numeric"
                error={errors.suggestedRosterSize}
              />

              {/* Game Day Ã¢â‚¬â€ hidden for "All at Once" frequency */}
              {gameFrequency !== 'all_at_once' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.ink }]}>Game Day</Text>
                  <View style={styles.dayChipsRow}>
                    {dayLabels.map((label, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.dayChip, { backgroundColor: colors.border, borderColor: colors.border },
                          preferredGameDays.includes(idx) &&
                            styles.dayChipSelected, preferredGameDays.includes(idx) && { backgroundColor: colors.cobalt, borderColor: colors.cobalt }]}
                        onPress={() => toggleGameDay(idx)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayChipText, { color: colors.inkFaint },
                            preferredGameDays.includes(idx) &&
                              styles.dayChipTextSelected, preferredGameDays.includes(idx) && { color: colors.white }]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Time Range */}
              <TimePickerInput
                label="Time Range Start"
                value={timeWindowStart}
                onChange={setTimeWindowStart}
                error={errors.timeWindowStart}
              />

              <TimePickerInput
                label="Time Range End"
                value={timeWindowEnd}
                onChange={setTimeWindowEnd}
                error={errors.timeWindowEnd}
              />

              {/* Confirmed Rosters Ã¢â‚¬â€ displayed outside the invite card */}
              {addedRosters.length > 0 && (
                <View style={styles.confirmedRostersSection}>
                  <Text style={[styles.confirmedRostersTitle, { color: colors.ink }]}>
                    Rosters ({addedRosters.length})
                  </Text>
                  {addedRosters.map(item => (
                    <View key={item.id} style={[styles.addedRosterItem, { backgroundColor: colors.surface, borderColor: colors.cobalt + '40' }]}>
                      <View style={styles.addedRosterInfo}>
                        <View style={[styles.addedRosterIcon, { backgroundColor: colors.cobalt }]}>
                          <Ionicons
                            name="shield-outline"
                            size={18}
                            color={colors.white}
                          />
                        </View>
                        <View style={styles.addedRosterDetails}>
                          <Text style={[styles.addedRosterName, { color: colors.ink }]}>
                            {item.name}
                          </Text>
                          {item.sportType && (
                            <Text style={[styles.addedRosterMeta, { color: colors.inkFaint }]}>
                              {item.sportType} Ã¢â‚¬Â¢ {item.memberCount ?? 0} players
                            </Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveRoster(item.id)}
                        style={styles.removeRosterBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.name}`}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color={colors.heart}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Invite Rosters Ã¢â‚¬â€ card with invited list and search */}
              <View style={[styles.addRostersSection, { backgroundColor: colors.white, borderColor: colors.border }]}>
                <View style={styles.addRostersHeader}>
                  <Text style={[styles.addRostersTitle, { color: colors.ink }]}>Invite Rosters</Text>
                  {invitedRosters.length > 0 && (
                    <View style={[styles.rosterCountBadge, { backgroundColor: colors.cobalt }]}>
                      <Text style={[styles.rosterCountBadgeText, { color: colors.white }]}>
                        {invitedRosters.length}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Invited Rosters (pending confirmation) */}
                {invitedRosters.length > 0 && (
                  <View style={styles.addedRostersContainer}>
                    <Text style={[styles.invitedRostersTitle, { color: colors.gold }]}>
                      Pending ({invitedRosters.length})
                    </Text>
                    {invitedRosters.map(item => (
                      <View key={item.id} style={[styles.invitedRosterItem, { backgroundColor: colors.warningLight, borderColor: colors.goldLight }]}>
                        <View style={styles.addedRosterInfo}>
                          <View style={[styles.invitedRosterIcon, { backgroundColor: colors.gold }]}>
                            <Ionicons
                              name="time-outline"
                              size={18}
                              color={colors.white}
                            />
                          </View>
                          <View style={styles.addedRosterDetails}>
                            <Text style={[styles.addedRosterName, { color: colors.ink }]}>
                              {item.name}
                            </Text>
                            <Text style={[styles.invitedRosterStatus, { color: colors.gold }]}>
                              Pending confirmation
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveInvitedRoster(item.id)}
                          style={styles.removeRosterBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove invitation for ${item.name}`}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color={colors.heart}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {invitedRosters.length === 0 && (
                  <Text style={[styles.addRostersDescription, { color: colors.inkFaint }]}>
                    Search below to invite rosters to this league.
                  </Text>
                )}

                {/* Search Input */}
                <View style={[styles.rosterSearchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons
                    name="search"
                    size={20}
                    color={colors.inkFaint}
                    style={styles.rosterSearchIcon}
                  />
                  <TextInput
                    style={[styles.rosterSearchInput, { color: colors.ink }]}
                    value={rosterSearchQuery}
                    onChangeText={text => {
                      setRosterSearchQuery(text);
                      setRosterSearchError(null);
                    }}
                    placeholder="Search rosters by name..."
                    placeholderTextColor={colors.inkFaint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Search rosters by name"
                  />
                  {isSearchingRosters && (
                    <ActivityIndicator
                      size="small"
                      color={colors.cobalt}
                      style={styles.rosterSearchSpinner}
                    />
                  )}
                </View>

                {rosterSearchQuery.trim().length > 0 &&
                  rosterSearchQuery.trim().length < 2 && (
                    <Text style={[styles.searchHint, { color: colors.inkFaint }]}>
                      Type at least 2 characters to search
                    </Text>
                  )}

                {rosterSearchError && (
                  <View style={[styles.searchErrorRow, { backgroundColor: colors.errorLight }]}>
                    <Ionicons
                      name="alert-circle"
                      size={16}
                      color={colors.heart}
                    />
                    <Text style={[styles.searchErrorText, { color: colors.heart }]}>
                      {rosterSearchError}
                    </Text>
                  </View>
                )}

                {rosterSearchResults.length > 0 && (
                  <View style={styles.rosterResultsContainer}>
                    <Text style={[styles.rosterResultsHeader, { color: colors.inkFaint }]}>
                      {rosterSearchResults.length} roster
                      {rosterSearchResults.length !== 1 ? 's' : ''} found
                    </Text>
                    {rosterSearchResults.map(r => (
                      <TouchableOpacity
                        key={r.id}
                        style={[styles.rosterResultItem, { backgroundColor: colors.white, borderColor: colors.border }]}
                        onPress={() => handleAddRoster(r)}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${r.name}`}
                      >
                        <View style={styles.rosterResultInfo}>
                          <View style={[styles.rosterResultIcon, { backgroundColor: colors.inkFaint }]}>
                            <Ionicons
                              name="shield-outline"
                              size={16}
                              color={colors.white}
                            />
                          </View>
                          <View style={styles.rosterResultDetails}>
                            <Text style={[styles.rosterResultName, { color: colors.ink }]}>
                              {r.name}
                            </Text>
                            {r.sportType && (
                              <Text style={[styles.rosterResultMeta, { color: colors.inkFaint }]}>
                                {r.sportType} Ã¢â‚¬Â¢ {r.memberCount ?? 0} players
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons
                          name="add-circle"
                          size={24}
                          color={colors.cobalt}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!isSearchingRosters &&
                  rosterSearchQuery.trim().length >= 2 &&
                  rosterSearchResults.length === 0 &&
                  !rosterSearchError && (
                    <View style={styles.rosterNoResults}>
                      <Ionicons
                        name="search-outline"
                        size={40}
                        color={colors.inkFaint}
                      />
                      <Text style={[styles.rosterNoResultsText, { color: colors.inkFaint }]}>
                        No rosters found
                      </Text>
                      <Text style={[styles.rosterNoResultsHint, { color: colors.inkFaint }]}>
                        Try a different roster name
                      </Text>
                    </View>
                  )}
              </View>

              {/* Registration Cutoff Date */}
              <Text style={[styles.fieldLabel, { color: colors.ink }]}>Registration Cutoff</Text>
              <Text style={[styles.cutoffDescription, { color: colors.inkFaint }]}>
                After this date, no more rosters can join. Game scheduling and
                any registration fee transactions will be triggered.
              </Text>
              <TouchableOpacity
                style={[styles.datePickerTrigger, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowCutoffCalendar(!showCutoffCalendar)}
                accessibilityRole="button"
                accessibilityLabel="Select registration cutoff date"
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.gold}
                />
                <Text
                  style={[
                    styles.datePickerText, { color: colors.ink },
                    !registrationCutoffDate && styles.datePickerPlaceholder, !registrationCutoffDate && { color: colors.inkFaint }]}
                >
                  {registrationCutoffDate
                    ? formatDateDisplay(registrationCutoffDate)
                    : 'Select a cutoff date'}
                </Text>
                <Ionicons
                  name={showCutoffCalendar ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.inkFaint}
                />
              </TouchableOpacity>
              {showCutoffCalendar && renderCutoffCalendar()}
              {registrationCutoffDate && (
                <TouchableOpacity
                  onPress={() => setRegistrationCutoffDate(null)}
                  style={styles.clearDateBtn}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.heart}
                  />
                  <Text style={[styles.clearDateText, { color: colors.heart }]}>Clear cutoff date</Text>
                </TouchableOpacity>
              )}

              {/* Track Standings Toggle Ã¢â‚¬â€ hidden for tournament format */}
              {leagueFormat !== 'tournament' && (
                <View style={[styles.toggleCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={[styles.toggleLabel, { color: colors.ink }]}>Track Standings</Text>
                      <Text style={[styles.toggleDescription, { color: colors.inkFaint }]}>
                        Record wins, draws, and losses to maintain a league
                        standings table
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.toggle, { backgroundColor: colors.border },
                        trackStandings && styles.toggleActive, trackStandings && { backgroundColor: colors.cobalt }]}
                      onPress={() => setTrackStandings(!trackStandings)}
                      activeOpacity={0.7}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: trackStandings }}
                    >
                      <View
                        style={[
                          styles.toggleThumb, { backgroundColor: colors.white },
                          trackStandings && styles.toggleThumbActive]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Points Configuration Ã¢â‚¬â€ only when tracking standings */}
              {trackStandings && (
                <View style={styles.pointsSection}>
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
                </View>
              )}
            </>
          )}

          {/* Buttons Ã¢â‚¬â€ vertically stacked, matching Roster edit screen */}
          <View style={styles.buttonStack}>
            <FormButton
              title={isEdit ? 'Update League' : 'Create League'}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
            />
            {isEdit && onDelete && (
              <FormButton
                title="Delete League"
                variant="danger"
                onPress={onDelete}
                disabled={loading}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  formatHint: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  formatHintText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    flex: 1,
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
    fontSize: 16,
    lineHeight: 22,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  // Calendar date picker
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: Spacing.md,
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  datePickerPlaceholder: {},
  calendar: {
    borderRadius: 10,
    borderWidth: 1,
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
  calendarDaySelected: {},
  calendarDayToday: {},
  calendarDayText: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  calendarDayTextSelected: {
    fontFamily: fonts.semibold,
  },
  calendarDayTextToday: {
    fontFamily: fonts.semibold,
  },
  // Projected end date
  projectedEndRow: {
    marginBottom: Spacing.lg,
  },
  projectedEndValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    marginTop: 4,
  },
  // Toggle card
  toggleCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  toggleDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {},
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  // Points section (under Track Standings toggle)
  pointsSection: {
    marginBottom: Spacing.sm,
  },
  // Registration cutoff
  cutoffDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  clearDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -8,
    marginBottom: Spacing.md,
  },
  clearDateText: {
    fontFamily: fonts.body,
    fontSize: 13,
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
    borderWidth: 1,
  },
  dayChipSelected: {},
  dayChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '600',
  },
  dayChipTextSelected: {},
  // Confirmed Rosters section Ã¢â‚¬â€ displayed above the invite card
  confirmedRostersSection: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  confirmedRostersTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    marginBottom: 4,
  },
  // Add Rosters section Ã¢â‚¬â€ matches Create Roster's Add Players pattern
  addRostersSection: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
  },
  addRostersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addRostersTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  rosterCountBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  rosterCountBadgeText: {
    fontFamily: fonts.label,
    fontSize: 12,
  },
  addRostersDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  addedRostersContainer: {
    gap: 8,
  },
  addedRostersTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  addedRosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  addedRosterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addedRosterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addedRosterDetails: {
    flex: 1,
  },
  addedRosterName: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    marginBottom: 2,
  },
  addedRosterMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  removeRosterBtn: {
    padding: 4,
  },
  // Invited roster styles
  invitedRostersTitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  invitedRosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  invitedRosterIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invitedRosterStatus: {
    fontFamily: fonts.label,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  searchHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontStyle: 'italic',
  },
  rosterSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rosterSearchIcon: {
    marginRight: 8,
  },
  rosterSearchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.body,
    paddingVertical: 4,
  },
  rosterSearchSpinner: {
    marginLeft: 8,
  },
  searchErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  searchErrorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    flex: 1,
  },
  rosterResultsContainer: {
    gap: 8,
  },
  rosterResultsHeader: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  rosterResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  rosterResultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rosterResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rosterResultDetails: {
    flex: 1,
  },
  rosterResultName: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    marginBottom: 2,
  },
  rosterResultMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  rosterNoResults: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  rosterNoResultsText: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  rosterNoResultsHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  // Vertically stacked buttons Ã¢â‚¬â€ matching Roster edit screen
  buttonStack: {
    marginTop: Spacing.lg,
    gap: 12,
  },
});
