// components/pages/matchSheet/MatchSheetSelectionModals.js
// Modales de selección reutilizables para fichas de partido
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons } from '@expo/vector-icons';
import { getPlayerFullName } from '@/utils/playerHelpers';

// Detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

/**
 * Modal genérico para selección de opciones
 */
export function OptionSelectionModal({ 
  visible, 
  onClose, 
  options, 
  selectedOption, 
  onSelect, 
  title,
  renderOption = null, 
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  selectedOption === option && styles.optionItemActive,
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                {renderOption ? (
                  renderOption(option, selectedOption === option)
                ) : (
                  <>
                    <Text style={[
                      styles.optionText,
                      selectedOption === option && styles.optionTextActive,
                    ]}>
                      {option}
                    </Text>
                    {selectedOption === option && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Modal para selección de ubicación (Local/Visitante/Neutral)
 */
export function UbicacionModal({ visible, onClose, ubicaciones, selectedUbicacion, onSelect }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <OptionSelectionModal
      visible={visible}
      onClose={onClose}
      options={ubicaciones}
      selectedOption={selectedUbicacion}
      onSelect={onSelect}
      title={t('matchSheet.modals.selectLocation')}
      renderOption={(option, isSelected) => (
        <>
          <View style={styles.ubicacionOption}>
            <Ionicons 
              name={option === ubicaciones[0] ? 'home' : option === ubicaciones[1] ? 'airplane' : 'location'}
              size={20} 
              color={isSelected ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
              {option}
            </Text>
          </View>
          {isSelected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
        </>
      )}
    />
  );
}

/**
 * Modal para selección de jornada
 */
export function JornadaModal({ visible, onClose, jornadaOptions, selectedJornada, onSelect }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('matchSheet.fields.selectMatchday')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={jornadaOptions}
            keyExtractor={(item) => item}
            numColumns={5}
            contentContainerStyle={styles.jornadaGrid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.jornadaItem,
                  selectedJornada === item && styles.jornadaItemActive,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[
                  styles.jornadaText,
                  selectedJornada === item && styles.jornadaTextActive,
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

/**
 * Modal para selección de alineación/formación
 */
export function AlineacionModal({ visible, onClose, alineaciones, selectedAlineacion, onSelect, title }) {
  const { t } = useTranslation();

  return (
    <OptionSelectionModal
      visible={visible}
      onClose={onClose}
      options={alineaciones}
      selectedOption={selectedAlineacion}
      onSelect={onSelect}
      title={title || t('matchSheet.modals.selectFormation')}
    />
  );
}

/**
 * Modal para selección múltiple de jugadores
 */
export function PlayerSelectionModal({ 
  visible, 
  onClose, 
  title, 
  players = [], 
  selectedIds = [], 
  excludeIds = [], 
  onConfirm,
  maxSelection = null,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [tempSelected, setTempSelected] = useState([]);
  
  useEffect(() => {
    if (visible) {
      setTempSelected([...selectedIds]);
    }
  }, [visible, selectedIds]);

  const availablePlayers = players.filter(p => !excludeIds.includes(p._id));

  const togglePlayer = (playerId) => {
    setTempSelected(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        if (maxSelection && prev.length >= maxSelection) {
          return prev;
        }
        return [...prev, playerId];
      }
    });
  };

  const selectAll = () => {
    if (maxSelection) {
      setTempSelected(availablePlayers.slice(0, maxSelection).map(p => p._id));
    } else {
      setTempSelected(availablePlayers.map(p => p._id));
    }
  };
  
  const deselectAll = () => setTempSelected([]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectAllRow}>
            <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>{t('schedule.selectAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deselectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>{t('schedule.deselect')}</Text>
            </TouchableOpacity>
            <Text style={styles.countText}>
              {t('schedule.selectedCount', { count: tempSelected.length })}
              {maxSelection && ` / ${maxSelection}`}
            </Text>
          </View>

          <ScrollView style={styles.playerList}>
            {availablePlayers.length === 0 ? (
              <Text style={styles.emptyText}>{t('schedule.noPlayersAvailable')}</Text>
            ) : (
              availablePlayers.map(player => {
                const isSelected = tempSelected.includes(player._id);
                return (
                  <TouchableOpacity
                    key={player._id}
                    style={[styles.playerItem, isSelected && styles.playerItemSelected]}
                    onPress={() => togglePlayer(player._id)}
                  >
                    <View style={styles.playerInfo}>
                      {player.foto ? (
                        <Image source={{ uri: player.foto }} style={styles.playerPhoto} />
                      ) : (
                        <View style={[styles.playerPhoto, styles.playerPhotoPlaceholder]}>
                          <Text style={styles.playerInitials}>
                            {player.dorsal || '?'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.playerDetails}>
                        <Text style={styles.playerName}>{getPlayerFullName(player)}</Text>
                        {player.posicion && (
                          <Text style={styles.playerPosition}>{player.posicion}</Text>
                        )}
                      </View>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('matchSheet.actions.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={() => {
                onConfirm(tempSelected);
                onClose();
              }}
            >
              <Text style={styles.confirmButtonText}>{t('matchSheet.actions.confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Modal para selección de un solo jugador
 */
export function SinglePlayerModal({ 
  visible, 
  onClose, 
  title, 
  players = [], 
  selectedId = null,
  excludeIds = [], 
  onSelect,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  
  const availablePlayers = players.filter(p => !excludeIds.includes(p._id));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxHeight: '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.playerList}>
            {availablePlayers.length === 0 ? (
              <Text style={styles.emptyText}>{t('schedule.noPlayersAvailable')}</Text>
            ) : (
              availablePlayers.map(player => {
                const isSelected = selectedId === player._id;
                return (
                  <TouchableOpacity
                    key={player._id}
                    style={[styles.playerItem, isSelected && styles.playerItemSelected]}
                    onPress={() => {
                      onSelect(player);
                      onClose();
                    }}
                  >
                    <View style={styles.playerInfo}>
                      {player.foto ? (
                        <Image source={{ uri: player.foto }} style={styles.playerPhoto} />
                      ) : (
                        <View style={[styles.playerPhoto, styles.playerPhotoPlaceholder]}>
                          <Text style={styles.playerInitials}>
                            {player.dorsal || '?'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.playerDetails}>
                        <Text style={styles.playerName}>{getPlayerFullName(player)}</Text>
                        {player.posicion && (
                          <Text style={styles.playerPosition}>{player.posicion}</Text>
                        )}
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 8 : 12,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 12 : 14,
    width: '100%',
    maxWidth: isMobileDevice() ? '100%' : 380,
    maxHeight: isMobileDevice() ? '85%' : '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalBody: {
    padding: isMobileDevice() ? 6 : 8,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: isMobileDevice() ? 12 : 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  
  // Option styles
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: isMobileDevice() ? 12 : 14,
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    borderRadius: 10,
    marginVertical: 2,
  },
  optionItemActive: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  optionText: {
    fontSize: isMobileDevice() ? 14 : 16,
    color: theme.colors.text,
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  ubicacionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  // Jornada styles
  jornadaGrid: {
    padding: isMobileDevice() ? 12 : 16,
  },
  jornadaItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: isMobileDevice() ? 44 : 50,
    maxWidth: isMobileDevice() ? 54 : 60,
  },
  jornadaItemActive: {
    backgroundColor: theme.colors.primary,
  },
  jornadaText: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  jornadaTextActive: {
    color: '#fff',
  },
  
  // Select all row
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 6 : 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: isMobileDevice() ? 8 : 12,
  },
  selectAllBtn: {
    paddingVertical: isMobileDevice() ? 5 : 6,
    paddingHorizontal: isMobileDevice() ? 10 : 12,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
  },
  selectAllText: {
    fontSize: isMobileDevice() ? 12 : 13,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  countText: {
    fontSize: isMobileDevice() ? 12 : 13,
    color: theme.colors.textSecondary,
    marginLeft: 'auto',
  },
  
  // Player list styles
  playerList: {
    maxHeight: 400,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: isMobileDevice() ? 10 : 12,
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playerItemSelected: {
    backgroundColor: `${theme.colors.primary}08`,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerPhoto: {
    width: isMobileDevice() ? 36 : 40,
    height: isMobileDevice() ? 36 : 40,
    borderRadius: isMobileDevice() ? 18 : 20,
    marginRight: isMobileDevice() ? 10 : 12,
  },
  playerPhotoPlaceholder: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInitials: {
    color: '#fff',
    fontSize: isMobileDevice() ? 12 : 14,
    fontWeight: '600',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  playerPosition: {
    fontSize: isMobileDevice() ? 12 : 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  
  // Checkbox styles
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  
  // Button styles
  cancelButton: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 11 : 12,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 11 : 12,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
    color: '#fff',
  },
  
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});
