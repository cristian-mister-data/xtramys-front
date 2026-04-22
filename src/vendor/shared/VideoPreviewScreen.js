// components/VideoPreviewScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import RNFS from 'react-native-fs';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import api from '@/utils/api';
import { uploadToR2 } from '@/utils/videoUtils';

// Props recibidas desde la pantalla de pizarra:
// localVideoPath — ruta del MP4 generado en el dispositivo
// duration       — duración en segundos
// speed          — velocidad usada: 0.5 | 1 | 2
// frames         — array con { timestamp, filePath, elements }
// editingVideoId — ObjectId del vídeo que se está editando (null si es nuevo)

const VideoPreviewScreen = ({
  localVideoPath,
  duration,
  speed,
  frames,
  editingVideoId,
}) => {
  const navigation = useNavigation();
  const [isSaved, setIsSaved]           = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isUploading, setIsUploading]   = useState(false);

  // Configurar player con expo-video
  const player = useVideoPlayer(localVideoPath, (p) => {
    p.loop = true;
    p.play();
  });

  // Cleanup: borrar MP4 local si el usuario sale sin guardar
  useEffect(() => {
    return () => {
      if (localVideoPath && !isSaved) {
        RNFS.unlink(localVideoPath).catch(() => {});
      }
    };
  }, [localVideoPath, isSaved]);

  // ─────────────────────────────────────────────────────────────────────
  // ACCIÓN 1: Guardar en Mis Vídeos
  // ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async ({ title, association } = {}) => {
    if (isSaved || isUploading) return;

    setIsUploading(true);
    try {
      // 1. URL prefirmada del backend
      const { data: presign } = await api.post('/tactical-videos/presign');

      // 2. Subida directa a R2
      await uploadToR2(localVideoPath, presign.uploadUrl);
      // Limpiar archivo local tras subida exitosa
      RNFS.unlink(localVideoPath).catch(() => {});

      // 3. Guardar metadata en MongoDB
      const framesForMongo = frames.map(({ timestamp, elements }) => ({ timestamp, elements }));

      if (editingVideoId) {
        await api.put(`/tactical-videos/${editingVideoId}`, {
          title,
          speed,
          duration,
          frameCount:   frames.length,
          r2Key:        presign.r2Key,
          thumbnailKey: presign.thumbnailKey,
          frames:       framesForMongo,
        });
      } else {
        await api.post('/tactical-videos', {
          title,
          speed,
          duration,
          frameCount:   frames.length,
          r2Key:        presign.r2Key,
          thumbnailKey: presign.thumbnailKey,
          frames:       framesForMongo,
          association,
        });
      }

      setIsSaved(true);
      Alert.alert('Éxito', 'Guardado en Mis Vídeos');
    } catch (e) {
      Alert.alert('Error', 'Error al guardar. Inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
    }
  }, [isSaved, isUploading, localVideoPath, frames, editingVideoId, speed, duration]);

  // ─────────────────────────────────────────────────────────────────────
  // ACCIÓN 2: Descargar a galería
  // ─────────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (isDownloaded) return;

    // Permiso solo en Android 9 (API 28) y anteriores
    if (Platform.OS === 'android' && Platform.Version < 29) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permiso denegado', 'Permiso de almacenamiento denegado');
        return;
      }
    }

    try {
      await CameraRoll.save(localVideoPath, { type: 'video' });
      setIsDownloaded(true);
      Alert.alert('Éxito', 'Guardado en tu galería');
    } catch (e) {
      Alert.alert('Error', 'Error al descargar. Inténtalo de nuevo.');
    }
  }, [isDownloaded, localVideoPath]);

  // ─────────────────────────────────────────────────────────────────────
  // ACCIÓN 3: Salir sin guardar
  // ─────────────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (localVideoPath && !isSaved) {
      Alert.alert(
        '¿Salir sin guardar?',
        'El vídeo generado se perderá.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text:    'Salir',
            style:   'destructive',
            onPress: async () => {
              await RNFS.unlink(localVideoPath).catch(() => {});
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [localVideoPath, isSaved, navigation]);

  return (
    <View style={styles.container}>
      {/* Reproductor de vídeo — usa el MP4 local, sin red */}
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>

      {/* Controles */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton, (isSaved || isUploading) && styles.disabledButton]}
          onPress={() => handleSave({ title: 'Jugada táctica' })}
          disabled={isSaved || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {isSaved ? '✓ Guardado' : '💾 Guardar en Mis Vídeos'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.downloadButton, isDownloaded && styles.disabledButton]}
          onPress={handleDownload}
          disabled={isDownloaded}
        >
          <Text style={styles.buttonText}>
            {isDownloaded ? '✓ Descargado' : '⬇ Descargar a galería'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={handleBack}
        >
          <Text style={styles.buttonText}>✕ Salir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  downloadButton: {
    backgroundColor: '#16a34a',
  },
  backButton: {
    backgroundColor: '#6b7280',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VideoPreviewScreen;
