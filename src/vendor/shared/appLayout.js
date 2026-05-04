// Copia literal de misterdata-source/src/appLayout.js (RN).
// Se mantiene como wrapper interno; el AppLayout web (sidebar/header) ya
// envuelve la página por fuera. Este sólo aporta scroll + safe area + KeyboardAvoiding.
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components';

function hasVirtualizedList(children) {
  if (!children) return false;
  if (Array.isArray(children)) return children.some((c) => hasVirtualizedList(c));
  if (children.type) {
    const type = children.type?.displayName || children.type?.name;
    if (type === 'FlatList' || type === 'SectionList' || type === 'VirtualizedList') return true;
    if (children.props && children.props.children) return hasVirtualizedList(children.props.children);
  }
  return false;
}

export default function AppLayout({ children, scrollEnabled = true, backgroundColor }) {
  const useDirectRender = !scrollEnabled || hasVirtualizedList(children);
  const theme = useTheme();
  const bg = backgroundColor || theme?.colors?.background || '#f2f6fc';
  return (
    <SafeAreaView
      style={{ flex: 1, minHeight: '100%', backgroundColor: bg, width: '100%' }}
      edges={['left', 'right', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {useDirectRender ? (
          children
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}
            scrollEnabled={scrollEnabled}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
