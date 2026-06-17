import { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, PanResponder, TextInput, StyleSheet, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function TouchableOpacity({ activeOpacity = 0.2, style, onPress, disabled, children, ...props }) {
  return (
    <Pressable
      style={({ pressed }) => [
        style,
        pressed && !disabled && { opacity: activeOpacity },
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
}

// Helpers
function hsvToRgb(h, s, v) {
  let f = (n, k = (n + h / 60) % 6) =>
    v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  let r = Math.round(f(5) * 255),
    g = Math.round(f(3) * 255),
    b = Math.round(f(1) * 255);
  return { r, g, b };
}
function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
      .toUpperCase()
  );
}
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b), h, s, v = max;
  let d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0;
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s, v };
}

const SV_SIZE = 100;

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FFA500', '#FF00FF', '#00FFFF', '#808080',
];

export function MiniColorPickerModal({ visible, initialColor, onClose, onSelect }) {
  // Calculate initial HSV from initialColor
  const rgb = hexToRgb(initialColor || "#2196F3");
  const initialHSV = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const [hue, setHue] = useState(initialHSV.h || 0);
  const [sv, setSV] = useState({ s: initialHSV.s || 1, v: initialHSV.v || 1 });
  const [hexInput, setHexInput] = useState(initialColor ? initialColor.toUpperCase() : "#2196F3");

  // Update when color changes from outside
  useEffect(() => {
    const rgb = hexToRgb(initialColor || "#2196F3");
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHue(hsv.h || 0);
    setSV({ s: hsv.s || 1, v: hsv.v || 1 });
    setHexInput((initialColor || "#2196F3").toUpperCase());
  }, [initialColor, visible]);

  // SV panel
  const svRef = useRef();
  const panSV = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => moveSV(evt.nativeEvent),
      onPanResponderMove: (evt, gestureState) => moveSV(evt.nativeEvent),
    })
  ).current;

  function moveSV(e) {
    svRef.current.measure((fx, fy, width, height, px, py) => {
      let x = e.pageX - px;
      let y = e.pageY - py;
      x = Math.max(0, Math.min(width, x));
      y = Math.max(0, Math.min(height, y));
      const s = x / width;
      const v = 1 - y / height;
      setSV({ s, v });
      const { r, g, b } = hsvToRgb(hue, s, v);
      const hex = rgbToHex(r, g, b);
      setHexInput(hex);
    });
  }

  // Hex input
  function handleHexInput(text) {
    let t = text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    if (t.length === 6) {
      const hex = '#' + t.toUpperCase();
      setHexInput(hex);
      const rgb = hexToRgb(hex);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSV({ s: hsv.s, v: hsv.v });
    } else {
      setHexInput('#' + t.toUpperCase());
    }
  }

  // Preset pick
  function pickPreset(hex) {
    setHexInput(hex);
    const rgb = hexToRgb(hex);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    setHue(hsv.h);
    setSV({ s: hsv.s, v: hsv.v });
  }

  // Color currently picked
  const colorRGB = hsvToRgb(hue, sv.s, sv.v);
  const colorHex = rgbToHex(colorRGB.r, colorRGB.g, colorRGB.b);

  // The SV panel is made by stacking two gradients over a hue background
  // Base: the color with current hue, full sat/value
  // Overlay: left-to-right white (sat), top-to-bottom black (value)
  // We use expo-linear-gradient for correct overlay!
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={pickerModalStyles.overlay}>
        <View style={pickerModalStyles.modalBox}>
          {/* Color preview */}
          <View style={pickerModalStyles.previewRow}>
            <View style={[pickerModalStyles.preview, { backgroundColor: colorHex, borderWidth: 1.5, borderColor: '#000' }]} />
            <Text style={{ fontWeight: 'bold', fontSize: 12, marginLeft: 6, color: "#fff" }}>{colorHex}</Text>
          </View>
          {/* SV panel */}
          <View
            ref={svRef}
            style={{
              width: SV_SIZE,
              height: SV_SIZE,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 8,
              backgroundColor: `hsl(${hue},100%,50%)`
            }}
            {...panSV.panHandlers}
          >
            {/* Saturation: White to Transparent */}
            <LinearGradient
              colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
              start={[0, 0]} end={[1, 0]}
              style={StyleSheet.absoluteFill}
            />
            {/* Value: Transparent to Black */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
              start={[0, 0]} end={[0, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* Selector thumb */}
            <View style={{
              position: 'absolute',
              left: sv.s * SV_SIZE - 7,
              top: (1 - sv.v) * SV_SIZE - 7,
              width: 14, height: 14,
              borderRadius: 7, borderWidth: 2, borderColor: "#000", backgroundColor: colorHex,
            }} pointerEvents="none" />
          </View>
          {/* HEX input */}
          <View style={[pickerModalStyles.inputRow, { justifyContent: 'center' }]}>
            <View style={pickerModalStyles.rgbGroup}>
              <Text style={pickerModalStyles.rgbLabel}>#</Text>
              <TextInput
                style={pickerModalStyles.hexInput}
                value={hexInput}
                onChangeText={handleHexInput}
                maxLength={7}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>
          {/* Presets */}
          <View style={pickerModalStyles.presets}>
            {PRESET_COLORS.map((preset, i) => (
              <TouchableOpacity
                key={preset}
                style={[
                  pickerModalStyles.preset,
                  { backgroundColor: preset, borderWidth: colorHex === preset ? 2 : 1, borderColor: colorHex === preset ? "#000" : "#ccc" }
                ]}
                onPress={() => pickPreset(preset)}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10, alignSelf: 'center' }}>
            <TouchableOpacity onPress={onClose} style={pickerModalStyles.modalButton}>
              <Text style={pickerModalStyles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onSelect && onSelect(colorHex);
                onClose && onClose();
              }}
              style={[pickerModalStyles.modalButton, { backgroundColor: '#3c6', marginLeft: 12 }]}
            >
              <Text style={[pickerModalStyles.buttonText, { color: '#fff' }]}>Seleccionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const pickerModalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', alignItems: 'center', justifyContent: 'center', padding: isMobileDevice() ? 8 : 0,
  },
  modalBox: {
    backgroundColor: '#222', borderRadius: isMobileDevice() ? 12 : 10, padding: isMobileDevice() ? 10 : 12, alignItems: 'center', minWidth: 150, minHeight: 170, maxWidth: isMobileDevice() ? '100%' : 220,
  },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 3,
  },
  preview: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: "#fff", marginRight: 4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 2,
  },
  rgbGroup: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 2,
  },
  rgbLabel: {
    color: '#fff', fontWeight: 'bold', marginRight: 1, width: 12, textAlign: 'right', fontSize: 11,
  },
  hexInput: {
    width: isMobileDevice() ? 60 : 65, color: '#fff', backgroundColor: '#333', borderRadius: 3, padding: 1, textAlign: 'center', marginLeft: 1, fontSize: isMobileDevice() ? 12 : 13, height: isMobileDevice() ? 20 : 22,
  },
  presets: {
    flexDirection: 'row', flexWrap: 'wrap', marginTop: 2, alignItems: 'center', justifyContent: 'center', width: isMobileDevice() ? 10 * 14 : 10 * 16,
  },
  preset: {
    width: isMobileDevice() ? 14 : 16, height: isMobileDevice() ? 14 : 16, margin: 1, borderRadius: 3,
  },
  modalButton: {
    paddingHorizontal: isMobileDevice() ? 12 : 16, paddingVertical: isMobileDevice() ? 6 : 7, borderRadius: 7, backgroundColor: '#fff', minWidth: isMobileDevice() ? 65 : 75, alignItems: 'center'
  },
  buttonText: { fontWeight: 'bold', fontSize: isMobileDevice() ? 12 : 13, color: "#222" }
});
