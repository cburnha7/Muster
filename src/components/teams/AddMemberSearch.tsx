import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { User } from '../../types';

interface AddMemberSearchProps {
  onAddMember: (user: User) => Promise<void>;
  existingMemberIds: string[];
}

export const AddMemberSearch: React.FC<AddMemberSearchProps> = ({
  onAddMember,
  existingMemberIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      // Import userService dynamically to avoid circular dependencies
      const { userService } = await import('../../services/api/UserService');
      const results = await userService.searchUsers(query);

      // Filter out users who are already members
      const filteredResults = results.filter(
        (user: User) => !existingMemberIds.includes(user.id)
      );

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (user: User) => {
    setAddingUserId(user.id);
    try {
      await onAddMember(user);
      // Remove user from search results after adding
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
      // Clear search if no more results
      if (searchResults.length === 1) {
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setAddingUserId(null);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isAdding = addingUserId === item.id;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleAddMember(item)}
        disabled={isAdding}
        activeOpacity={0.75}
      >
        <View style={styles.userInfo}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
              <Text style={styles.userAvatarText}>
                {(item.firstName && item.firstName[0]) ||
                  item.email?.[0]?.toUpperCase() ||
                  '?'}
              </Text>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>

        {isAdding ? (
          <ActivityIndicator size="small" color={colors.cobalt} />
        ) : (
          <View style={styles.addButton}>
            <Ionicons name="add-circle" size={24} color={colors.cobalt} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.inkFaint}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color={colors.cobalt}
            style={styles.searchSpinner}
          />
        )}
      </View>

      {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
        <Text style={styles.hint}>Type at least 2 characters to search</Text>
      )}

      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            {searchResults.length} member{searchResults.length !== 1 ? 's' : ''}{' '}
            found
          </Text>
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={item => item.id}
            style={styles.resultsList}
            scrollEnabled={false}
          />
        </View>
      )}

      {!isSearching &&
        searchQuery.trim().length >= 2 &&
        searchResults.length === 0 && (
          <View style={styles.noResults}>
            <Ionicons name="search-outline" size={48} color={colors.inkFaint} />
            <Text style={styles.noResultsText}>No members found</Text>
            <Text style={styles.noResultsHint}>
              Try searching by first name, last name, or email
            </Text>
          </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 4,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.inkFaint,
    fontStyle: 'italic',
  },
  resultsContainer: {
    gap: 8,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  resultsList: {
    maxHeight: 300,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    backgroundColor: colors.cobalt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  addButton: {
    padding: 4,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.inkFaint,
  },
  noResultsHint: {
    fontSize: 13,
    color: colors.inkFaint,
    textAlign: 'center',
  },
});
