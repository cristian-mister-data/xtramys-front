import React, { useState, useEffect } from 'react';
import { View, Image, useWindowDimensions, Text, ActivityIndicator } from 'react-native';
import { prefetchAndCacheImage, getVersionedUrl } from '@/utils/imageCache';

export function normalizeImageSource(imageSource, { cacheBust = false } = {}) {
  const normalizedSource = typeof imageSource === 'string' ? imageSource.trim() : imageSource;
  if (!normalizedSource) return '';
  if (typeof normalizedSource === 'object') {
    const uri = normalizedSource?.uri || normalizedSource?.default || normalizedSource?.uri?.toString?.();
    if (uri) return normalizeImageSource(uri, { cacheBust });
  }
  if (typeof normalizedSource === 'number' && typeof Image.resolveAssetSource === 'function') {
    const resolved = Image.resolveAssetSource(normalizedSource);
    return normalizeImageSource(resolved?.uri || resolved?.default || '', { cacheBust });
  }

  const isHttpUrl = typeof normalizedSource === 'string' && (normalizedSource.startsWith('http://') || normalizedSource.startsWith('https://'));
  const isUri = typeof normalizedSource === 'string' && (
    normalizedSource.startsWith('data:') ||
    normalizedSource.startsWith('blob:') ||
    normalizedSource.startsWith('file:') ||
    normalizedSource.startsWith('content:') ||
    normalizedSource.startsWith('/') ||
    normalizedSource.startsWith('./') ||
    normalizedSource.startsWith('../')
  );

  if (isHttpUrl) {
    if (!cacheBust) return normalizedSource;
    const timestamp = new Date().getTime();
    return normalizedSource.includes('?')
      ? `${normalizedSource}&t=${timestamp}`
      : `${normalizedSource}?t=${timestamp}`;
  }

  if (isUri) return normalizedSource;
  return `data:image/png;base64,${normalizedSource}`;
}

// Recibe imagen URL o base64, aspecto (ratio), ancho/alto base opcional, y estilos personalizados
export default function Base64ImagePreview({
  base64,
  imageUrl,
  aspect = 0.8,
  forceWidth,
  forceHeight,
  maxWidth,
  horizontalInset,
  marginVerticalBoolean,
  style,
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [displayUri, setDisplayUri] = useState('');
  const [loading, setLoading] = useState(false);

  const imageSource = imageUrl || base64;

  useEffect(() => {
    let active = true;
    if (!imageSource) {
      setDisplayUri('');
      setLoading(false);
      return;
    }

    const load = async () => {
      // Si ya es base64 o local, renderizar directo
      if (!imageSource.startsWith('http://') && !imageSource.startsWith('https://')) {
        setDisplayUri(normalizeImageSource(imageSource));
        setLoading(false);
        return;
      }

      setLoading(true);
      const versionedUrl = getVersionedUrl(imageSource);
      try {
        const cachedUri = await prefetchAndCacheImage(versionedUrl);
        if (active) {
          setDisplayUri(cachedUri);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setDisplayUri(normalizeImageSource(versionedUrl));
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [imageSource]);

  const verticalMargin = 24;
  const horizontalMargin = horizontalInset ?? 32;

  let imageWidth = Math.max(120, screenWidth - horizontalMargin);
  if (maxWidth) {
    imageWidth = Math.min(imageWidth, maxWidth);
  }
  let imageHeight = imageWidth * aspect;

  const maxFieldHeight = screenHeight - verticalMargin - 54 - 150;
  if (imageHeight > maxFieldHeight) {
    imageHeight = maxFieldHeight;
    imageWidth = imageHeight / aspect;
  }

  const computedStyle = {
    width: forceWidth ? forceWidth : imageWidth,
    height: forceHeight ? forceHeight : imageHeight,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b', // Color premium gris pizarra en lugar de verde
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  };

  const imageStyle = {
    width: forceWidth ? forceWidth : imageWidth,
    height: forceHeight ? forceHeight : imageHeight,
    resizeMode: 'contain',
  };

  const baseStyle = style
    ? Array.isArray(style) ? style : [style]
    : [];

  if (!imageSource) {
    return (
      <View style={[computedStyle, ...baseStyle]}>
        <Text style={{ color: '#64748b', fontSize: 12 }}>No hay imagen disponible</Text>
      </View>
    );
  }

  return (
    <View style={[computedStyle, ...baseStyle]}>
      {displayUri ? (
        <Image
          source={{ uri: displayUri }}
          style={imageStyle}
        />
      ) : null}

      {loading && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(30, 41, 59, 0.6)'
        }}>
          <ActivityIndicator size="small" color="#3578e5" />
        </View>
      )}
    </View>
  );
}
