/**
 * Wrapper común para páginas que montan componentes RN del proyecto móvil.
 * Provee SafeAreaProvider + GestureHandlerRootView ocupando 100% del contenedor.
 */
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const fillStyle = { flex: 1, width: '100%', height: '100%' };

export default function RNWebPage({ children }) {
  return (
    <SafeAreaProvider style={fillStyle}>
      <GestureHandlerRootView style={fillStyle}>
        {children}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
