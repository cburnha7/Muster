import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../types';
import { ConversationListScreen } from '../../screens/messages/ConversationListScreen';
import { ChatScreen } from '../../screens/messages/ChatScreen';
import { colors, fonts } from '../../theme';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

const detailHeader = {
  headerShown: true,
  headerBackVisible: true,
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: colors.surfaceContainerLowest },
  headerShadowVisible: false,
  headerTitleStyle: { fontFamily: fonts.heading, fontSize: 22, color: colors.onSurface },
};

export function MessagesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConversationList" component={ConversationListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} options={detailHeader} />
    </Stack.Navigator>
  );
}
