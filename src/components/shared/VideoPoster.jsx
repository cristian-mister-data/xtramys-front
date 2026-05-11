import { View, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function VideoPoster({
  video,
  poster,
  style,
  showPlay = true,
  playSize = 42,
  fallback = null,
  alt = 'Video',
}) {
  const posterUrl = poster || video?.thumbnailUrl || video?.thumbnail || video?.poster || '';

  return (
    <View style={[{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      backgroundColor: '#0f172a',
      alignItems: 'center',
      justifyContent: 'center',
    }, style]}>
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          accessibilityLabel={alt}
        />
      ) : (
        <View style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e293b',
        }}>
          {fallback || (
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MaterialIcons name="play-circle-filled" size={28} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </View>
      )}
      {showPlay && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15,23,42,0.38)',
        }} pointerEvents="none">
          <MaterialIcons name="play-circle-filled" size={playSize} color="#fff" />
        </View>
      )}
    </View>
  );
}
