import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

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
  const allActive = selectedId === null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>The Family</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
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
                <View style={[styles.circle, { backgroundColor: m.color }]}>
                  {m.profileImage ? (
                    <Image
                      source={{ uri: m.profileImage }}
                      style={styles.img}
                    />
                  ) : (
                    <Text style={styles.initial}>
                      {m.firstName?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  )}
                </View>
              </View>
              <Text
                style={[styles.name, active && styles.nameActive]}
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
          <View style={[styles.ring, allActive && { borderColor: colors.ink }]}>
            <View style={[styles.circle, { backgroundColor: colors.ink }]}>
              <Ionicons name="people" size={20} color="#FFFFFF" />
            </View>
          </View>
          <Text
            style={[styles.name, allActive && styles.nameActive]}
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
  container: { marginTop: 16 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 10,
  },
  scroll: { gap: 14, paddingRight: 8 },
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
    color: '#FFFFFF',
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 4,
    textAlign: 'center',
  },
  nameActive: {
    fontFamily: fonts.label,
    color: colors.ink,
  },
});
