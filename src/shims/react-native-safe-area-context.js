import React from 'react';
import { View } from 'react-native';

export const SafeAreaProvider = ({ children, style }) => (
  <View style={[{ flex: 1 }, style]}>{children}</View>
);

export const SafeAreaView = ({ children, style, edges, ...props }) => (
  <View style={[{ flex: 1 }, style]} {...props}>{children}</View>
);

export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0
});

export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  initialWindowMetrics
};
