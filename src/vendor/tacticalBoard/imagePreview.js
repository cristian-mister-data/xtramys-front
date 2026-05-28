import React from 'react';
import { View, Image, useWindowDimensions, Text } from 'react-native';

export function normalizeImageSource(imageSource, { cacheBust = true } = {}) {
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
  marginVerticalBoolean,
  style // Nuevo: permite pasar estilos personalizados externos
}) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Margen vertical y horizontal
  const verticalMargin = 24;
  const horizontalMargin = 32;

  // Calcula ancho máximo y alto máximo
  let imageWidth = screenWidth - horizontalMargin;
  let imageHeight = imageWidth * aspect;

  // Limita altura a la pantalla
  const maxFieldHeight = screenHeight - verticalMargin - 54 - 150;
  if (imageHeight > maxFieldHeight) {
    imageHeight = maxFieldHeight;
    imageWidth = imageHeight / aspect;
  }

  // Si se pasan estilos, se usan esos y se ignora el cálculo automático
  const customStyle = style
    ? [style]
    : [
        {
          width: forceWidth ? forceWidth : imageWidth,
          height: forceHeight ? forceHeight : imageHeight,
          alignSelf: 'center',
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: 'green',
          elevation: 3,
          justifyContent: 'center',
          alignItems: 'center',
        },
      ];

  const imageCustomStyle = style
    ? [style, { resizeMode: style?.resizeMode || 'contain' }]
    : [
        {
          width: forceWidth ? forceWidth : imageWidth,
          height: forceHeight ? forceHeight : imageHeight,
          resizeMode: 'contain',
        },
      ];

  // Renderiza solo si hay imagen (URL o base64)
  const imageSource = imageUrl || base64;
  if (!imageSource) {
    return (
      <View style={customStyle}>
        <Text style={{ color: '#888' }}>No hay imagen disponible</Text>
      </View>
    );
  }

  const uri = normalizeImageSource(imageSource);

  return (
    <View style={customStyle}>
      <Image
        source={{ uri }}
        style={imageCustomStyle}
      />
    </View>
  );
}