import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

export const SafeAreaProvider = ({ children, style }) => (
  <View style={[{ flex: 1 }, style]}>{children}</View>
);

const zeroInsets = { top: 0, bottom: 0, left: 0, right: 0 };

function readCssInsets() {
  if (typeof document === 'undefined' || !document.body) return zeroInsets;

  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed',
    'visibility:hidden',
    'pointer-events:none',
    'padding-top:env(safe-area-inset-top)',
    'padding-right:env(safe-area-inset-right)',
    'padding-bottom:env(safe-area-inset-bottom)',
    'padding-left:env(safe-area-inset-left)',
  ].join(';');
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  document.body.removeChild(probe);
  return insets;
}

function getInsets() {
  const cssInsets = readCssInsets();
  if (typeof window === 'undefined' || typeof document === 'undefined') return cssInsets;

  const root = document.documentElement;
  const isNative = root.dataset.native === 'true';
  const platform = root.dataset.platform;
  const isNativeAndroid = isNative && platform === 'android';
  const isNativeIOS = isNative && platform === 'ios';
  const isLandscape = window.innerWidth > window.innerHeight;
  const visualViewport = window.visualViewport;
  const viewportInsets = visualViewport
    ? {
        top: Math.max(0, visualViewport.offsetTop || 0),
        left: Math.max(0, visualViewport.offsetLeft || 0),
        right: Math.max(0, window.innerWidth - visualViewport.width - (visualViewport.offsetLeft || 0)),
        bottom: Math.max(0, window.innerHeight - visualViewport.height - (visualViewport.offsetTop || 0)),
      }
    : zeroInsets;

  const insets = {
    top: Math.max(cssInsets.top, viewportInsets.top),
    right: Math.max(cssInsets.right, viewportInsets.right),
    bottom: Math.max(cssInsets.bottom, viewportInsets.bottom),
    left: Math.max(cssInsets.left, viewportInsets.left),
  };

  if (isNativeIOS) {
    return {
      top: Math.max(insets.top, isLandscape ? 0 : 44),
      right: Math.max(insets.right, isLandscape ? 44 : 0),
      bottom: Math.max(insets.bottom, 34),
      left: Math.max(insets.left, isLandscape ? 44 : 0),
    };
  }

  if (!isNativeAndroid) return insets;

  if (isLandscape) {
    return {
      top: Math.max(Math.min(insets.top, 48), 36),
      right: Math.max(Math.min(insets.right, 96), 72),
      bottom: Math.min(insets.bottom, 24),
      left: Math.min(insets.left, 48),
    };
  }

  return {
    top: Math.max(Math.min(insets.top, 64), 24),
    right: Math.min(insets.right, 24),
    bottom: Math.max(Math.min(insets.bottom, 64), 32),
    left: insets.left,
  };
}

export const useSafeAreaInsets = () => {
  const [insets, setInsets] = useState(getInsets);

  useEffect(() => {
    const update = () => setInsets(getInsets());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener?.('resize', update);
    update();
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener?.('resize', update);
    };
  }, []);

  return insets;
};

export const SafeAreaView = ({ children, style, edges, ...props }) => {
  const insets = useSafeAreaInsets();
  const activeEdges = edges || ['top', 'right', 'bottom', 'left'];
  const edgeStyle = {
    flex: 1,
    ...(activeEdges.includes('top') ? { paddingTop: insets.top } : null),
    ...(activeEdges.includes('right') ? { paddingRight: insets.right } : null),
    ...(activeEdges.includes('bottom') ? { paddingBottom: insets.bottom } : null),
    ...(activeEdges.includes('left') ? { paddingLeft: insets.left } : null),
  };
  return <View style={[edgeStyle, style]} {...props}>{children}</View>;
};

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
