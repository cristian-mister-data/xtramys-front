import React from 'react';
import { View, Image, useWindowDimensions, Text } from 'react-native';

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
          backgroundColor: '#000',
          elevation: 3,
          justifyContent: 'center',
          alignItems: 'center',
        },
      ];

  const imageCustomStyle = style
    ? [style, { resizeMode: style?.resizeMode || 'contain', alignSelf: 'center' }]
    : [
        {
          width: '100%',
          height: '100%',
          resizeMode: 'contain',
          alignSelf: 'center',
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

  // Determinar si es URL o base64
  const isUrl = typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'));
  
  // Agregar cache busting para URLs de Cloudflare
  let uri;
  if (isUrl) {
    const timestamp = new Date().getTime();
    uri = imageSource.includes('?') 
      ? `${imageSource}&t=${timestamp}` 
      : `${imageSource}?t=${timestamp}`;
  } else {
    uri = `data:image/png;base64,${imageSource}`;
  }

  return (
    <View style={customStyle}>
      <Image
        source={{ uri }}
        style={imageCustomStyle}
      />
    </View>
  );
}