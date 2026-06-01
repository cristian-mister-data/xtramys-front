// Funciones mejoradas para renderizar formas geométricas
import React from 'react';
import { Pressable, TouchableOpacity, View
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Svg, { Circle, Rect, Text as SvgText, G } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

function renderCircle({ 
  icon, 
  idx, 
  imageWidth, 
  imageHeight, 
  selectedCloneId, 
  selectedCloneIds = [],
  multiSelectMode = false,
  setSelectedCloneId, 
  setEditingIcon, 
  setLeftPanelVisible, 
  handleDeleteClone, 
  handleDuplicateClone,
  setClones, 
  dragStart, 
  applySmootherMovement,
  ControlButton,
  drawingStates = {},
  setOptionsMenu,
  handleIncreaseSize,
  handleDecreaseSize,
  clones
}) {
  if (!icon.points || icon.points.length !== 2) return null;
  
  const originalWidth = icon.imageWidth || imageWidth;
  const originalHeight = icon.imageHeight || imageHeight;
  const widthRatio = imageWidth / originalWidth;
  const heightRatio = imageHeight / originalHeight;
  const scale = (widthRatio + heightRatio) / 2;
  
  const p1 = {
    x: icon.points[0].x * imageWidth,
    y: icon.points[0].y * imageHeight
  };
  const p2 = {
    x: icon.points[1].x * imageWidth,
    y: icon.points[1].y * imageHeight
  };
  
  // Grosor reducido para líneas más finas
  const thickness = (icon.thickness || 1) * scale * 0.7;
  const halfThickness = thickness / 2;
  
  // Calculamos el centro del círculo y el radio
  const centerX = (p1.x + p2.x) / 2;
  const centerY = (p1.y + p2.y) / 2;
  
  // El radio es la mitad de la distancia entre los dos puntos
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const radius = Math.sqrt(dx * dx + dy * dy) / 2;
  
  const dx_ratio = icon.points[1].x - icon.points[0].x;
  const dy_ratio = icon.points[1].y - icon.points[0].y;
  const diameter_m = Math.sqrt((dx_ratio * 105) ** 2 + (dy_ratio * 68) ** 2);
  
  const isSelected = selectedCloneId === icon.id;
  const isMultiSelected = multiSelectMode && selectedCloneIds && selectedCloneIds.includes(icon.id);
  const isSelectedEither = isSelected || isMultiSelected;
  const color = icon.color || "#2980b9";
  
  const isInteractionEnabled = !(
    drawingStates.drawingStraightArrow || 
    drawingStates.drawingStraightLine || 
    drawingStates.drawingCurveArrow || 
    drawingStates.drawingCurveLine || 
    drawingStates.drawingRectangle || 
    drawingStates.drawingCircle || 
    drawingStates.drawingTriangle ||
    drawingStates.drawingCustomShape
  );
  
  // Definición de tolerancia para la detección de toques en la línea
  const touchTolerance = Math.max(thickness * 1.5, 15 * scale);

  // Función para verificar si un punto está cerca de la circunferencia
  const isPointNearCircle = (x, y) => {
    // Calcular distancia del punto al centro
    const distanceToCenter = Math.sqrt(
      Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
    );
    
    // Verificar si la distancia está dentro del rango de la línea circular
    const minDistance = radius - touchTolerance / 2;
    const maxDistance = radius + touchTolerance / 2;
    
    return distanceToCenter >= minDistance && distanceToCenter <= maxDistance;
  };

  // HANDLERS CORREGIDOS - usar la misma lógica que el triángulo
  const handlePanStateChange = (e) => {
    if (e.nativeEvent.state === State.BEGAN) {
      dragStart.current = { 
        x: e.nativeEvent.absoluteX || e.nativeEvent.x, 
        y: e.nativeEvent.absoluteY || e.nativeEvent.y
      };
    } else if (e.nativeEvent.state === State.END) {
      dragStart.current = {};
    }
  };

  const handlePanGesture = (e) => {
    if (e.nativeEvent.state === State.ACTIVE && 
        dragStart.current.x !== undefined) {
      
      const currentX = e.nativeEvent.absoluteX || e.nativeEvent.x;
      const currentY = e.nativeEvent.absoluteY || e.nativeEvent.y;
      
      const dx = (currentX - dragStart.current.x) / imageWidth;
      const dy = (currentY - dragStart.current.y) / imageHeight;
      
      dragStart.current.x = currentX;
      dragStart.current.y = currentY;
      
      applySmootherMovement(() => {
        setClones(prev => prev.map(c => {
          if (c.id === icon.id) {
            return {
              ...c,
              points: c.points.map(p => ({
                x: Math.max(0, Math.min(1, p.x + dx)),
                y: Math.max(0, Math.min(1, p.y + dy))
              }))
            };
          }
          return c;
        }));
      });
    }
  };

  // Configuración para el estilo de la línea
  const dashArray = icon.lineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : null;

  // Función para el manejo de toques en el círculo
  const handlePress = (e) => {
    if (isInteractionEnabled) {
      const touchX = centerX - radius - halfThickness - touchTolerance/2 + e.nativeEvent.locationX;
      const touchY = centerY - radius - halfThickness - touchTolerance/2 + e.nativeEvent.locationY;
      
      if (isPointNearCircle(touchX, touchY)) {
        e.stopPropagation && e.stopPropagation();
        if (!multiSelectMode) setSelectedCloneId(icon.id);
      }
      // Si no está cerca del círculo, no hacer nada y dejar que el evento burbujee
    }
  };

  const handleLongPress = (e) => {
    if (isInteractionEnabled) {
      const touchX = centerX - radius - halfThickness - touchTolerance/2 + e.nativeEvent.locationX;
      const touchY = centerY - radius - halfThickness - touchTolerance/2 + e.nativeEvent.locationY;
      
      if (isPointNearCircle(touchX, touchY)) {
        if (!multiSelectMode) {
          setSelectedCloneId(icon.id);
          setEditingIcon(icon);
          setLeftPanelVisible(true);
        }
      }
    }
  };

  return (
    <>
      {/* Circunferencia visible */}
      <Circle
        key={`circle-visual-${icon.id}-${color}-${thickness}-${icon.lineType || 'solid'}-${icon.dotSize || 2}-${icon.dotSpacing || 4}-${icon.fillColor || 'transparent'}`}
        cx={centerX}
        cy={centerY}
        r={radius}
        stroke={isMultiSelected ? '#3498db' : color}
        strokeWidth={thickness}
        fill={icon.fillColor && icon.fillColor !== 'transparent' ? `${icon.fillColor}99` : "transparent"}
        strokeDasharray={dashArray}
      />
      {diameter_m !== undefined && diameter_m > 0 && (
        <SvgText
          x={centerX}
          y={centerY + 4}
          fill="#ffffff"
          fontSize={11 * scale}
          fontWeight="bold"
          textAnchor="middle"
          stroke="#000000"
          strokeWidth="0.5"
        >
          {`${diameter_m.toFixed(1)}m`}
        </SvgText>
      )}
      
      {/* Área de detección SOLO en el perímetro - usando View con pointerEvents */}
      {!Object.values(drawingStates).some(state => state) && (
        <PanGestureHandler
          key={`circle-drag-${icon.id}`}
          enabled={!icon.locked && isInteractionEnabled}
          onHandlerStateChange={e => {
            if (e.nativeEvent.state === State.BEGAN && !icon.locked) {
              // Obtener la posición del toque relativa al contenedor
              const touchX = e.nativeEvent.x;
              const touchY = e.nativeEvent.y;

              // Calcular distancia del toque al centro del círculo
              // El View está posicionado en (centerX - radius - touchTolerance, centerY - radius - touchTolerance)
              // Entonces el centro del círculo está en (radius + touchTolerance, radius + touchTolerance) dentro del View
              const centerInView = radius + touchTolerance;
              const dx = touchX - centerInView;
              const dy = touchY - centerInView;
              const distanceToCenter = Math.sqrt(dx * dx + dy * dy);

              // Solo permitir drag si el toque está cerca del perímetro
              const isNearPerimeter = distanceToCenter >= (radius - touchTolerance) && 
                                      distanceToCenter <= (radius + touchTolerance);

              if (!isNearPerimeter) {
                return; // No iniciar drag si no está en el perímetro
              }

              if (selectedCloneId && selectedCloneId !== icon.id) {
                setSelectedCloneId(null);
              }

              if (multiSelectMode && selectedCloneIds && selectedCloneIds.includes(icon.id)) {
                const initialPositions = {};
                (selectedCloneIds || []).forEach(id => {
                  const c = clones && clones.find(cl => cl.id === id);
                  if (!c) return;
                  if (c.points && Array.isArray(c.points)) {
                    initialPositions[id] = c.points.map(p => ({ x: p.x, y: p.y }));
                  } else {
                    initialPositions[id] = c.points ? c.points.map(p => ({ x: p.x, y: p.y })) : [];
                  }
                });
                dragStart.current[icon.id] = {
                  multiSelect: true,
                  selectedIds: [...selectedCloneIds],
                  initialPositions
                };
              } else {
                dragStart.current[icon.id] = {
                  points: icon.points.map(p => ({ x: p.x, y: p.y })),
                  isValid: true
                };
              }
            } else if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
              if (dragStart.current[icon.id]) {
                delete dragStart.current[icon.id];
              }
            }
          }}
          onGestureEvent={e => {
            const base = dragStart.current[icon.id];
            if (e.nativeEvent.state === State.ACTIVE && !icon.locked && base) {
              
              const dx = e.nativeEvent.translationX / imageWidth;
              const dy = e.nativeEvent.translationY / imageHeight;

              // Si es multi-drag, aplicar a todos los seleccionados y salir
              if (base && base.multiSelect && base.selectedIds && base.initialPositions) {
                setClones(prev => prev.map(c => {
                  if (!base.selectedIds.includes(c.id)) return c;
                  const init = base.initialPositions[c.id];
                  if (!init) return c;
                  return {
                    ...c,
                    points: init.map(pt => ({ x: Math.max(0, Math.min(1, pt.x + dx)), y: Math.max(0, Math.min(1, pt.y + dy)) }))
                  };
                }));
                return;
              }
              
              setClones(prev => {
                const correctIndex = prev.findIndex(c => c.id === icon.id);
                if (correctIndex === -1) return prev;
                
                const next = [...prev];
                next[correctIndex] = {
                  ...next[correctIndex],
                  points: base.points.map(pt => ({
                    x: Math.max(0, Math.min(1, pt.x + dx)),
                    y: Math.max(0, Math.min(1, pt.y + dy))
                  }))
                };
                return next;
              });
            }
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: centerX - radius - touchTolerance,
              top: centerY - radius - touchTolerance,
              width: (radius + touchTolerance) * 2,
              height: (radius + touchTolerance) * 2,
              zIndex: isSelectedEither ? 9999 : (icon.zIndex || 9),
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
              }}
              onPress={(e) => {
                const touchX = e.nativeEvent.locationX;
                const touchY = e.nativeEvent.locationY;
                
                // Calcular distancia del toque al centro
                const adjustedX = touchX - radius - touchTolerance;
                const adjustedY = touchY - radius - touchTolerance;
                const distanceToCenter = Math.sqrt(adjustedX * adjustedX + adjustedY * adjustedY);
                
                // Solo responder si el toque está en el perímetro (línea del círculo)
                if (distanceToCenter >= radius - touchTolerance && 
                    distanceToCenter <= radius + touchTolerance) {
                  
                  if (!multiSelectMode) setSelectedCloneId(icon.id);
                }
                // Si no está en el perímetro, el evento pasa a través debido a pointerEvents="box-none"
              }}
            />
          </View>
        </PanGestureHandler>
      )}

      {/* Botón de opciones */}
      {isSelected && !multiSelectMode && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setOptionsMenu({
              visible: true,
              position: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
              iconId: icon.id,
              canRotate: false,
              hideEdit: false,
              onIncreaseSize: () => handleIncreaseSize(icon.id),
              onDecreaseSize: () => handleDecreaseSize(icon.id)
            });
          }}
          style={{
            position: 'absolute',
            width: 28 * scale,
            height: 28 * scale,
            borderRadius: (28 * scale) / 2,
            backgroundColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1.5,
            elevation: 10,
            borderWidth: 1,
            borderColor: '#dddddd',
            zIndex: isSelected ? 10000 : 100,
            left: centerX + radius + 7 * scale,
            top: centerY - 14 * scale
          }}
        >
          <Feather name="more-vertical" size={16 * scale} color="#444444" />
        </TouchableOpacity>
      )}
    </>
  );
}

function renderRectangle({ 
  icon, 
  idx, 
  imageWidth, 
  imageHeight, 
  selectedCloneId, 
  selectedCloneIds = [],
  multiSelectMode = false,
  setSelectedCloneId, 
  setEditingIcon, 
  setLeftPanelVisible, 
  handleDeleteClone, 
  handleDuplicateClone,
  setClones, 
  dragStart, 
  applySmootherMovement,
  ControlButton,
  drawingStates = {},
  setOptionsMenu,
  handleIncreaseSize,
  handleDecreaseSize,
  clones
}) {
  if (!icon.points || icon.points.length !== 2) return null;
  
  const originalWidth = icon.imageWidth || imageWidth;
  const originalHeight = icon.imageHeight || imageHeight;
  const widthRatio = imageWidth / originalWidth;
  const heightRatio = imageHeight / originalHeight;
  const scale = (widthRatio + heightRatio) / 2;
  
  const p1 = {
    x: icon.points[0].x * imageWidth,
    y: icon.points[0].y * imageHeight
  };
  const p2 = {
    x: icon.points[1].x * imageWidth,
    y: icon.points[1].y * imageHeight
  };
  
  // Grosor reducido para líneas más finas
  const thickness = (icon.thickness || 1) * scale * 0.7;
  const halfThickness = thickness / 2;
  
  // Calculamos las coordenadas del rectángulo
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);
  
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  const dx_ratio = Math.abs(icon.points[1].x - icon.points[0].x);
  const dy_ratio = Math.abs(icon.points[1].y - icon.points[0].y);
  const width_m = dx_ratio * 105;
  const height_m = dy_ratio * 68;
  
  const isSelected = selectedCloneId === icon.id;
  const isMultiSelected = multiSelectMode && selectedCloneIds && selectedCloneIds.includes(icon.id);
  const isSelectedEither = isSelected || isMultiSelected;
  const color = icon.color || "#2980b9";
  
  const isInteractionEnabled = !(
    drawingStates.drawingStraightArrow || 
    drawingStates.drawingStraightLine || 
    drawingStates.drawingCurveArrow || 
    drawingStates.drawingCurveLine || 
    drawingStates.drawingRectangle || 
    drawingStates.drawingCircle || 
    drawingStates.drawingTriangle ||
    drawingStates.drawingCustomShape
  );
  
  // Definición de tolerancia para la detección de toques en la línea
  const touchTolerance = Math.max(thickness * 1.5, 15 * scale);

  // Configuración para el estilo de la línea
  const dashArray = icon.lineType === 'dotted' ? `${icon.dotSize || 2},${icon.dotSpacing || 4}` : null;

  return (
    <>
      {/* Rectángulo visible */}
      <Rect
        key={`rectangle-visual-${icon.id}-${color}-${thickness}-${icon.lineType || 'solid'}-${icon.dotSize || 2}-${icon.dotSpacing || 4}-${icon.fillColor || 'transparent'}`}
        x={minX}
        y={minY}
        width={width}
        height={height}
        stroke={isMultiSelected ? '#3498db' : color}
        strokeWidth={thickness}
        fill={icon.fillColor && icon.fillColor !== 'transparent' ? `${icon.fillColor}99` : "transparent"}
        strokeDasharray={dashArray}
      />
      {width_m !== undefined && height_m !== undefined && width_m > 0 && height_m > 0 && (
        <SvgText
          x={minX + width / 2}
          y={minY + height / 2 + 4}
          fill="#ffffff"
          fontSize={11 * scale}
          fontWeight="bold"
          textAnchor="middle"
          stroke="#000000"
          strokeWidth="0.5"
        >
          {`${width_m.toFixed(1)}m x ${height_m.toFixed(1)}m`}
        </SvgText>
      )}

      {/* Indicador visual para selección múltiple */}
      {isMultiSelected && (
        <View style={{
          position: 'absolute',
          left: maxX + 7 * scale,
          top: minY - 12 * scale,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#3498db',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 101,
          borderWidth: 2,
          borderColor: '#fff'
        }}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}

      {/* Área de detección sobre el perímetro del rectángulo */}
      {!Object.values(drawingStates).some(state => state) && (
        <PanGestureHandler
          key={`rect-drag-${icon.id}`}
          enabled={!icon.locked && isInteractionEnabled}
          onHandlerStateChange={e => {
            if (e.nativeEvent.state === State.BEGAN && !icon.locked) {
              // Obtener la posición del toque relativa al contenedor
              const touchX = e.nativeEvent.x;
              const touchY = e.nativeEvent.y;

              // El View está posicionado en (minX - touchTolerance, minY - touchTolerance)
              // Convertir a coordenadas relativas al rectángulo
              const relX = touchX - touchTolerance;
              const relY = touchY - touchTolerance;
              
              // Verificar si el toque está cerca de alguno de los 4 lados
              const isNearTop = relY >= -touchTolerance && relY <= touchTolerance;
              const isNearBottom = relY >= (height - touchTolerance) && relY <= (height + touchTolerance);
              const isNearLeft = relX >= -touchTolerance && relX <= touchTolerance;
              const isNearRight = relX >= (width - touchTolerance) && relX <= (width + touchTolerance);
              
              const isNearPerimeter = (isNearTop || isNearBottom) || (isNearLeft || isNearRight);
              
              if (!isNearPerimeter) {
                return; // No iniciar drag si no está en el perímetro
              }
              
              if (selectedCloneId && selectedCloneId !== icon.id) {
                setSelectedCloneId(null);
              }

              // Soporte multi-drag para rectángulos: registrar posiciones iniciales de todos los seleccionados
              if (multiSelectMode && selectedCloneIds && selectedCloneIds.includes(icon.id)) {
                const initialPositions = {};
                (selectedCloneIds || []).forEach(id => {
                  const c = clones && clones.find(cl => cl.id === id);
                  if (!c) return;
                  if (c.points && Array.isArray(c.points)) {
                    initialPositions[id] = c.points.map(p => ({ x: p.x, y: p.y }));
                  } else {
                    initialPositions[id] = c.points ? c.points.map(p => ({ x: p.x, y: p.y })) : [];
                  }
                });
                dragStart.current[icon.id] = {
                  multiSelect: true,
                  selectedIds: [...selectedCloneIds],
                  initialPositions
                };
              } else {
                dragStart.current[icon.id] = {
                  points: icon.points.map(p => ({ x: p.x, y: p.y })),
                  isValid: true
                };
              }
            } else if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
              if (dragStart.current[icon.id]) {
                delete dragStart.current[icon.id];
              }
            }
          }}
          onGestureEvent={e => {
            const base = dragStart.current[icon.id];
            if (e.nativeEvent.state === State.ACTIVE && !icon.locked && base) {
              const dx = e.nativeEvent.translationX / imageWidth;
              const dy = e.nativeEvent.translationY / imageHeight;

              // Si es multi-drag, aplicar a todos los seleccionados
              if (base.multiSelect && base.selectedIds && base.initialPositions) {
                setClones(prev => prev.map(c => {
                  if (!base.selectedIds.includes(c.id)) return c;
                  const init = base.initialPositions[c.id];
                  if (!init) return c;
                  return {
                    ...c,
                    points: init.map(pt => ({ x: Math.max(0, Math.min(1, pt.x + dx)), y: Math.max(0, Math.min(1, pt.y + dy)) }))
                  };
                }));
                return;
              }
              
              setClones(prev => {
                const correctIndex = prev.findIndex(c => c.id === icon.id);
                if (correctIndex === -1) return prev;
                
                const next = [...prev];
                next[correctIndex] = {
                  ...next[correctIndex],
                  points: base.points.map(pt => ({
                    x: Math.max(0, Math.min(1, pt.x + dx)),
                    y: Math.max(0, Math.min(1, pt.y + dy))
                  }))
                };
                return next;
              });
            }
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: minX - touchTolerance,
              top: minY - touchTolerance,
              width: width + touchTolerance * 2,
              height: height + touchTolerance * 2,
              zIndex: isSelectedEither ? 9999 : (icon.zIndex || 9),
            }}
          >
            {/* Áreas de toque solo en los 4 lados */}
            <TouchableOpacity
              activeOpacity={1}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: touchTolerance * 2,
              }}
              onPress={(e) => {
                const relY = e.nativeEvent.locationY;
                if (relY <= touchTolerance * 2) {
                  if (!multiSelectMode) setSelectedCloneId(icon.id);
                }
              }}
            />
            <TouchableOpacity
              activeOpacity={1}
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '100%',
                height: touchTolerance * 2,
              }}
              onPress={(e) => {
                const relY = e.nativeEvent.locationY;
                if (relY >= 0) {
                  if (!multiSelectMode) setSelectedCloneId(icon.id);
                }
              }}
            />
            <TouchableOpacity
              activeOpacity={1}
              style={{
                position: 'absolute',
                left: 0,
                top: touchTolerance * 2,
                width: touchTolerance * 2,
                height: height - touchTolerance * 2,
              }}
              onPress={(e) => {
                const relX = e.nativeEvent.locationX;
                if (relX <= touchTolerance * 2) {
                  if (!multiSelectMode) setSelectedCloneId(icon.id);
                }
              }}
            />
            <TouchableOpacity
              activeOpacity={1}
              style={{
                position: 'absolute',
                right: 0,
                top: touchTolerance * 2,
                width: touchTolerance * 2,
                height: height - touchTolerance * 2,
              }}
              onPress={(e) => {
                const relX = e.nativeEvent.locationX;
                if (relX >= 0) {
                  if (!multiSelectMode) setSelectedCloneId(icon.id);
                }
              }}
            />
          </View>
        </PanGestureHandler>
      )}

      {/* Botón de opciones */}
      {isSelected && !multiSelectMode && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            setOptionsMenu({
              visible: true,
              position: { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY },
              iconId: icon.id,
              canRotate: false,
              hideEdit: false,
              onIncreaseSize: () => handleIncreaseSize(icon.id),
              onDecreaseSize: () => handleDecreaseSize(icon.id)
            });
          }}
          style={{
            position: 'absolute',
            width: 28 * scale,
            height: 28 * scale,
            borderRadius: (28 * scale) / 2,
            backgroundColor: '#ffffff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1.5,
            elevation: 10,
            borderWidth: 1,
            borderColor: '#dddddd',
            zIndex: isSelected ? 10000 : 100,
            left: maxX + 7 * scale,
            top: centerY - 14 * scale
          }}
        >
          <Feather name="more-vertical" size={16 * scale} color="#444444" />
        </TouchableOpacity>
      )}

      {/* Indicador visual para selección múltiple */}
      {isMultiSelected && (
        <View style={{
          position: 'absolute',
          left: maxX + 7 * scale,
          top: minY - 12 * scale,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#3498db',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 101,
          borderWidth: 2,
          borderColor: '#fff'
        }}>
          <Feather name="check" size={10} color="#fff" />
        </View>
      )}
    </>
  );
}

export { renderCircle, renderRectangle };
