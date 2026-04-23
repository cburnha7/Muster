import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { fonts, useTheme } from '../../theme';

export interface CrewMember {
  id: string;
  firstName: string;
  profileImage?: string | null;
  color: string;
}

interface MyCrewRowProps {
  members: CrewMember[];
  /** null means "All" is selected */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function MyCrewRow({ members, selectedId, onSelect }: MyCrewRowProps) {
  const { colors } = useTheme();
  const allActive = selectedId === null;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          { color: colors.ink },
          { color: colors.textPrimary },
        ]}
      >
        The Family
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { flexGrow: 1, justifyContent: 'center' },
        ]}
      >
        {members.map(m => {
          const active = selectedId === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={styles.item}
              onPress={() => onSelect(m.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.ring, active && { borderColor: m.color }]}>
                {m.profileImage ? (
                  <View
                    style={[
                      styles.circle,
                      {
                        borderWidth: 2.5,
                        borderColor: m.color,
                        backgroundColor: 'transparent',
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: m.profileImage }}
                      style={styles.img}
                    />
                  </View>
                ) : (
                  <View style={[styles.circle, { backgroundColor: m.color }]}>
                    <Text style={[styles.initial, { color: colors.white }]}>
                      {m.firstName?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.name,
                  { color: colors.inkSoft },
                  active && styles.nameActive,
                  active && { color: colors.ink },
                  {
                    color: active ? colors.textPrimary : colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {m.firstName}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* "All" option */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.ring,
              allActive && { borderColor: colors.textPrimary },
            ]}
          >
            <View
              style={[styles.circle, { backgroundColor: colors.textPrimary }]}
            >
              <Ionicons name="people" size={20} color={colors.white} />
            </View>
          </View>
          <Text
            style={[
              styles.name,
              { color: colors.inkSoft },
              { color: colors.textSecondary },
              allActive && {
                fontFamily: fonts.label,
                color: colors.textPrimary,
              },
            ]}
            numberOfLines={1}
          >
            All
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 12, paddingBottom: 8 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  scroll: { gap: 14, paddingHorizontal: 16, justifyContent: 'center' },
  item: { alignItems: 'center', width: 60 },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: 44, height: 44, borderRadius: 22 },
  initial: {
    fontFamily: fonts.ui,
    fontSize: 18,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  nameActive: {
    fontFamily: fonts.label,
  },
});
