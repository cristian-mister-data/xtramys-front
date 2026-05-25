/**
 * FieldSelectorModal — Two-axis field selector:
 *   1. Line Type: what markings to draw (full, zones1-4, empty)
 *   2. View Mode: how to crop the field (entire, halfUp, halfDown)
 * 
 * Each option shows a live SVG thumbnail preview.
 * 
 * Props:
 *  - visible: boolean
 *  - currentLineType: string
 *  - currentViewMode: string
 *  - onSelect: (lineType, viewMode) => void
 *  - onClose: () => void
 *  - screenWidth: number
 *  - screenHeight: number
 */
import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { useTranslation } from 'react-i18next';
import FieldSVGRenderer from './fields/FieldSVGRenderer';
import { getLineTypeList, getViewModeList, getAspectForView } from './fields/fieldConfigs';

// ─── Thumbnail Preview ────────────────────────
const FieldThumbnail = memo(({ lineType, viewMode, isSelected, onPress, size }) => {
  const thumbW = size;
  const thumbH = size * 0.65;

  return (
    <TouchableOpacity
      style={[
        thumbStyles.container,
        { width: thumbW + 8, height: thumbH + 8 },
        isSelected && thumbStyles.selected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[thumbStyles.svgWrap, { width: thumbW, height: thumbH }]}>
        <FieldSVGRenderer
          lineType={lineType}
          viewMode={viewMode || 'entire'}
          width={thumbW}
          height={thumbH}
          strokeWidth={1}
        />
      </View>
    </TouchableOpacity>
  );
});

// ─── View Mode Thumbnail (camera) ─────────────
// All view mode thumbnails use the same outer container size.
// The inner SVG is sized to fit its natural aspect within that container.
const ViewModeThumbnail = memo(({ lineType, viewModeId, isSelected, onPress, size }) => {
  const containerW = size;
  const containerH = size * 0.65; // same as FieldThumbnail

  const aspect = getAspectForView(viewModeId); // height/width
  // Fit inside container keeping aspect ratio
  let svgW, svgH;
  if (aspect <= containerH / containerW) {
    // wider than tall → fit width
    svgW = containerW;
    svgH = containerW * aspect;
  } else {
    // taller than wide → fit height
    svgH = containerH;
    svgW = containerH / aspect;
  }

  return (
    <TouchableOpacity
      style={[
        thumbStyles.container,
        { width: containerW + 8, height: containerH + 8 },
        isSelected && thumbStyles.selected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[thumbStyles.svgWrap, { width: containerW, height: containerH, alignItems: 'center', justifyContent: 'center' }]}>
        <FieldSVGRenderer
          lineType={lineType}
          viewMode={viewModeId}
          width={svgW}
          height={svgH}
          strokeWidth={1}
        />
      </View>
    </TouchableOpacity>
  );
});

const thumbStyles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#555',
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  selected: {
    borderColor: '#2176ff',
    backgroundColor: '#1a3a6a',
  },
  svgWrap: {
    borderRadius: 6,
    overflow: 'hidden',
  },
});

// ─── Main Modal ───────────────────────────────
const FieldSelectorModal = memo(({
  visible,
  currentLineType,
  currentViewMode,
  onSelect,
  onClose,
  screenWidth,
  screenHeight,
}) => {
  const { t } = useTranslation();
  const [pendingLineType, setPendingLineType] = useState(currentLineType || 'full');
  const [pendingViewMode, setPendingViewMode] = useState(currentViewMode || 'entire');

  const isMobile = Math.min(screenWidth, screenHeight) < 768;
  const modalWidth = isMobile
    ? Math.min(screenWidth * 0.92, 400)
    : Math.min(screenWidth * 0.7, 550);
  const thumbSize = isMobile ? 75 : 95;

  const lineTypes = getLineTypeList();
  const viewModes = getViewModeList();

  const handleConfirm = useCallback(() => {
    onSelect(pendingLineType, pendingViewMode);
    onClose();
  }, [pendingLineType, pendingViewMode, onSelect, onClose]);

  const handleCancel = useCallback(() => {
    setPendingLineType(currentLineType || 'full');
    setPendingViewMode(currentViewMode || 'entire');
    onClose();
  }, [currentLineType, currentViewMode, onClose]);

  // Reset pending when modal opens
  useEffect(() => {
    if (visible) {
      setPendingLineType(currentLineType || 'full');
      setPendingViewMode(currentViewMode || 'entire');
    }
  }, [visible, currentLineType, currentViewMode]);

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { width: modalWidth, maxHeight: screenHeight * 0.85 }]}>
            {/* Header */}
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>{t('tacticalBoard.fieldSelector.title')}</Text>
              <TouchableOpacity style={modalStyles.closeBtn} onPress={handleCancel}>
                <Text style={{ fontSize: 18, color: '#999' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>
              {/* Section 1: Line Type */}
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>
                  {t('tacticalBoard.fieldSelector.lines')}
                </Text>
                <View style={modalStyles.grid}>
                  {lineTypes.map((lt) => (
                    <View key={lt.id} style={modalStyles.thumbContainer}>
                      <FieldThumbnail
                        lineType={lt.id}
                        isSelected={pendingLineType === lt.id}
                        onPress={() => setPendingLineType(lt.id)}
                        size={thumbSize}
                      />
                      <Text style={[
                        modalStyles.thumbLabel,
                        pendingLineType === lt.id && modalStyles.thumbLabelSelected,
                      ]}>
                        {t(`tacticalBoard.fieldTypes.${lt.id}`, { defaultValue: lt.id })}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Section 2: View Mode (Camera) */}
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>
                  {t('tacticalBoard.fieldSelector.camera')}
                </Text>
                <View style={modalStyles.grid}>
                  {viewModes.map((vm) => (
                    <View key={vm.id} style={modalStyles.thumbContainer}>
                      <ViewModeThumbnail
                        lineType={pendingLineType}
                        viewModeId={vm.id}
                        isSelected={pendingViewMode === vm.id}
                        onPress={() => setPendingViewMode(vm.id)}
                        size={thumbSize}
                      />
                      <Text style={[
                        modalStyles.thumbLabel,
                        pendingViewMode === vm.id && modalStyles.thumbLabelSelected,
                      ]}>
                        {t(`tacticalBoard.fieldSelector.viewModes.${vm.id}`, { defaultValue: vm.id })}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={modalStyles.footer}>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnCancel]} onPress={handleCancel}>
                <Text style={[modalStyles.btnText, { color: '#ccc' }]}>
                  {t('tacticalBoard.formationModal.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnConfirm]} onPress={handleConfirm}>
                <Text style={[modalStyles.btnText, { color: '#fff' }]}>
                  {t('tacticalBoard.fieldSelector.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#2a2a2a',
    borderRadius: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#bbb',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumbContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  thumbLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  thumbLabelSelected: {
    color: '#2176ff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: '#444',
  },
  btnConfirm: {
    backgroundColor: '#2176ff',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default FieldSelectorModal;
