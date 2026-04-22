import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error?.message || error);
    console.error('[ErrorBoundary] Stack:', errorInfo?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            </View>

            <Text style={styles.title}>Algo salió mal</Text>
            <Text style={styles.message}>
              La aplicación ha encontrado un error inesperado. Pulsa el botón para recargar.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetails} nestedScrollEnabled>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReload}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Recargar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 24,
  },
  errorDetails: {
    maxHeight: 120,
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 36,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    minWidth: 160,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.4,
  },
});

export default ErrorBoundary;
