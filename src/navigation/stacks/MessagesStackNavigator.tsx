import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../types';
import { ConversationListScreen } from '../../screens/messages/ConversationListScreen';
import { NewConversationScreen } from '../../screens/messages/NewConversationScreen';
import { ChatScreen } from '../../screens/messages/ChatScreen';
import { detailHeader } from '../headerOptions';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ConversationList"
        component={ConversationListScreen}
      />
      <Stack.Screen
        name="NewConversation"
        component={NewConversationScreen}
        options={{ ...detailHeader, headerTitle: 'New Message' }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} options={detailHeader} />
    </Stack.Navigator>
  );
}
