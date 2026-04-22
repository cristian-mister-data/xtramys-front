import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Field from '@/vendor/tacticalBoard/field';

const fillStyle = { flex: 1, width: '100%', height: '100%' };

export default function TacticalBoardPage() {
  return (
    <SafeAreaProvider style={fillStyle}>
      <GestureHandlerRootView style={fillStyle}>
        <Field sandbox />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
