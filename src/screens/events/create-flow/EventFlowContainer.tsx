import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { WizardProgressDots } from '../../../components/wizard/WizardProgressDots';
import { useCreateEvent } from './CreateEventContext';
import { canContinue } from './validation';
import { colors, fonts } from '../../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ANIMATION_DURATION = 200;

interface EventFlowContainerProps {
  children: React.ReactNode;
  onSubmit: () => void;
}

export function EventFlowContainer({ children, onSubmit }: EventFlowContainerProps) {
  const { state, dispatch } = useCreateEvent();
  const { currentStep } = state;
  const translateX = useRef(new Animated.Value(-currentStep * SCREEN_WIDTH)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: -currentStep * SCREEN_WIDTH,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [currentStep, translateX]);

  const childArray = React.Children.toArray(children);
  const enabled = canContinue(state, currentStep);
  const isLastStep = currentStep === 4;
  const showButton = currentStep > 0;

  const handlePress = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      dispatch({ type: 'NEXT_STEP' });
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.dotsContainer}>
        <WizardProgressDots current={currentStep} total={5} />
      </View>

      <View style={styles.stageContainer}>
        <Animated.View style={[styles.slider, { transform: [{ translateX }] }]}>
          {childArray.map((child, i) => (
            <View key={i} style={styles.slide}>
              {child}
            </View>
          ))}
        </Animated.View>
      </View>

      {showButton && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, !enabled && styles.buttonDisabled]}
            onPress={handlePress}
            disabled={!enabled}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isLastStep ? 'Create Event' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  dotsContainer: {
    paddingVertical: 12,
  },
  stageContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  slider: {
    flexDirection: 'row',
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  button: {
    backgroundColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.inkSoft,
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontFamily: fonts.ui,
    fontSize: 16,
  },
});
