import { useState } from 'react';
import { View, Image, Text, PanResponder, TouchableWithoutFeedback } from 'react-native';

const Draggable = ({ 
  source, 
  initialX, 
  initialY, 
  isTemplate = false,
  number = '1',
  size = 40,
  color = '#FF5733',
  onClone,
  onRemove,
  onLongPress
}) => {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  
  // Implementación básica del arrastre (simplificada)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      setPosition({
        x: initialX + gestureState.dx,
        y: initialY + gestureState.dy,
      });
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (isTemplate && onClone) {
        onClone(position.x, position.y);
      }
      setPosition({ x: initialX, y: initialY });
    },
    onPanResponderTerminate: () => {
      setPosition({ x: initialX, y: initialY });
    },
  });

  return (
    <View 
      {...panResponder.panHandlers}
      style={{ 
        position: 'absolute', 
        left: position.x, 
        top: position.y,
        width: size,
        height: size,
      }}
    >
      <TouchableWithoutFeedback onLongPress={onLongPress}>
        <View>
          <Image 
            source={source} 
            style={{ 
              width: size, 
              height: size, 
              tintColor: color,
              resizeMode: 'contain'
            }} 
          />
          <Text 
            style={{
              position: 'absolute',
              top: size/2 - 10,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: size/2.5,
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {number}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

export default Draggable;