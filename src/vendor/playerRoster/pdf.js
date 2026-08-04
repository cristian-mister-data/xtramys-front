import React from 'react';
import {
  COLORS,
  Document,
  FONT_SIZE,
  Image,
  Page,
  PdfFooter,
  PdfHeader,
  StyleSheet,
  Text,
  View,
  renderPdf,
} from '@/utils/pdfDesign';
import api from '@/api/client';
import { cdnUrl } from '@/config';
import { getPlayerRosterName, translatePosition } from '@/components/player/playerHelpers';
import { getPlayerInjuryStatus } from '@/vendor/shared/training';

const toDataUrl = async (url) => {
  if (!url || typeof url !== 'string' || url.startsWith('data:')) return url;

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  const normalizeBlob = async (blob) => {
    if (blob?.type !== 'image/webp' || typeof window === 'undefined') return blobToDataUrl(blob);
    return new Promise((resolve, reject) => {
      const image = new window.Image();
      const objectUrl = URL.createObjectURL(blob);
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      };
      image.src = objectUrl;
    });
  };

  try {
    const response = await api.get('/media/image-download', {
      params: { url, format: 'jpeg' },
      responseType: 'blob',
      timeout: 15000,
    });
    return normalizeBlob(response.data);
  } catch (error) {
    console.warn('[playerRosterPdf] No se pudo cargar la foto mediante el servidor:', error?.message || error);
    try {
      const response = await fetch(cdnUrl(url));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return normalizeBlob(await response.blob());
    } catch (fallbackError) {
      console.warn('[playerRosterPdf] No se pudo cargar la foto:', fallbackError?.message || fallbackError);
      return cdnUrl(url);
    }
  }
};

const resolvePlayerPhotos = (players) => Promise.all(
  (players || []).map(async (player) => (
    player?.foto ? { ...player, foto: await toDataUrl(player.foto) } : player
  )),
);

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 45,
    paddingHorizontal: 30,
    backgroundColor: COLORS.bgMain,
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
  },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  summaryLabel: { marginTop: 2, fontSize: 7, color: COLORS.textSecondary, textTransform: 'uppercase' },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 7, overflow: 'hidden' },
  inactiveHeaderRow: { backgroundColor: COLORS.bgMain, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inactiveHeaderCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 6 },
  inactiveHeaderText: { color: COLORS.textSecondary, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, minHeight: 34 },
  headerRow: { backgroundColor: COLORS.primary, borderBottomWidth: 0 },
  cell: { justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 6 },
  headerText: { color: COLORS.white, fontFamily: 'Helvetica-Bold', fontSize: 7, textTransform: 'uppercase' },
  cellText: { color: COLORS.text, fontSize: 8, lineHeight: 1.25 },
  name: { fontFamily: 'Helvetica-Bold' },
  photo: { width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.borderLight },
  initials: { width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.accentLight, alignItems: 'center', justifyContent: 'center' },
  initialsText: { color: COLORS.accent, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  inactive: { color: COLORS.textSecondary },
  extra: { color: COLORS.warning, fontFamily: 'Helvetica-Bold' },
  colPhoto: { width: '7%' },
  colNumber: { width: '8%' },
  colName: { flex: 1 },
  colPosition: { width: '18%' },
  colAge: { width: '9%' },
  colHeight: { width: '11%' },
  colType: { width: '12%' },
  colInjury: { width: '12%' },
  colStatus: { width: '12%' },
});

const playerInitials = (player) => `${player?.nombre?.[0] || ''}${player?.apellido?.[0] || ''}`.toUpperCase() || '?';

const PlayerRow = ({ player, showPhotos, injuries, t }) => {
  const injured = getPlayerInjuryStatus(player._id, injuries)?.status === 'injured';
  return (
  <View style={styles.row} wrap={false}>
    {showPhotos ? (
      <View style={[styles.cell, styles.colPhoto]}>
        {player.foto ? <Image src={player.foto} style={styles.photo} /> : (
          <View style={styles.initials}><Text style={styles.initialsText}>{playerInitials(player)}</Text></View>
        )}
      </View>
    ) : null}
    <View style={[styles.cell, styles.colNumber]}><Text style={styles.cellText}>{player.dorsal ?? '-'}</Text></View>
    <View style={[styles.cell, styles.colName]}><Text style={[styles.cellText, styles.name, player.activo === false && styles.inactive]}>{getPlayerRosterName(player) || '-'}</Text></View>
    <View style={[styles.cell, styles.colPosition]}><Text style={styles.cellText}>{translatePosition(player.posicion, t) || '-'}</Text></View>
    <View style={[styles.cell, styles.colAge]}><Text style={styles.cellText}>{player.edad ?? '-'}</Text></View>
    <View style={[styles.cell, styles.colHeight]}><Text style={styles.cellText}>{player.altura ? `${player.altura} cm` : '-'}</Text></View>
    <View style={[styles.cell, styles.colType]}><Text style={[styles.cellText, player.extra && styles.extra]}>{player.extra ? t('player.extra', 'Extra') : t('player.roster', 'Plantilla')}</Text></View>
    <View style={[styles.cell, styles.colInjury]}><Text style={[styles.cellText, injured && styles.extra]}>{injured ? t('player.injured', 'Lesionado') : t('player.notInjured', 'No lesionado')}</Text></View>
    <View style={[styles.cell, styles.colStatus]}><Text style={[styles.cellText, player.activo === false && styles.inactive]}>{player.activo === false ? t('player.inactive', 'De baja') : t('player.active', 'Activo')}</Text></View>
  </View>
  );
};

const PlayerRosterDocument = ({ players, team, injuries, includeExtras, showPhotos, locale, t }) => {
  const filteredPlayers = players
    .filter((player) => includeExtras || !player.extra)
    .sort((a, b) => {
      const dorsalA = Number.isFinite(Number(a.dorsal)) ? Number(a.dorsal) : Infinity;
      const dorsalB = Number.isFinite(Number(b.dorsal)) ? Number(b.dorsal) : Infinity;
      return dorsalA - dorsalB || getPlayerRosterName(a).localeCompare(getPlayerRosterName(b), locale);
    });
  const active = filteredPlayers.filter((player) => player.activo !== false).length;
  const extras = filteredPlayers.filter((player) => player.extra).length;
  const injured = filteredPlayers.filter((player) => getPlayerInjuryStatus(player._id, injuries)?.status === 'injured').length;
  const activePlayers = filteredPlayers.filter((player) => player.activo !== false);
  const inactivePlayers = filteredPlayers.filter((player) => player.activo === false);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          title={t('player.rosterPdfTitle', 'Listado de jugadores')}
          subtitle={team?.nombre || t('season.myTeam', 'Mi equipo')}
          right={includeExtras ? t('player.rosterPdfWithExtras', 'Plantilla + extras') : t('player.rosterPdfRosterOnly', 'Solo plantilla')}
          date={`${filteredPlayers.length} ${t('player.players', 'jugadores')}`}
        />
        <View style={styles.summary}>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{filteredPlayers.length}</Text><Text style={styles.summaryLabel}>{t('player.players', 'Jugadores')}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{active}</Text><Text style={styles.summaryLabel}>{t('player.active', 'Activos')}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{extras}</Text><Text style={styles.summaryLabel}>{t('player.extraPlayers', 'Extras')}</Text></View>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{injured}</Text><Text style={styles.summaryLabel}>{t('player.injuredPlayers', 'Lesionados')}</Text></View>
        </View>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} wrap={false}>
            {showPhotos ? <View style={[styles.cell, styles.colPhoto]}><Text style={styles.headerText}>{t('player.photo', 'Foto')}</Text></View> : null}
            <View style={[styles.cell, showPhotos ? styles.colNumber : { width: '9%' }]}><Text style={styles.headerText}>#</Text></View>
            <View style={[styles.cell, showPhotos ? styles.colName : { flex: 1 }]}><Text style={styles.headerText}>{t('player.player', 'Jugador')}</Text></View>
            <View style={[styles.cell, styles.colPosition]}><Text style={styles.headerText}>{t('player.position', 'Posición')}</Text></View>
            <View style={[styles.cell, styles.colAge]}><Text style={styles.headerText}>{t('player.age', 'Edad')}</Text></View>
            <View style={[styles.cell, styles.colHeight]}><Text style={styles.headerText}>{t('player.height', 'Altura')}</Text></View>
            <View style={[styles.cell, styles.colType]}><Text style={styles.headerText}>{t('player.type', 'Tipo')}</Text></View>
            <View style={[styles.cell, styles.colInjury]}><Text style={styles.headerText}>{t('player.injuryStatus', 'Lesionado')}</Text></View>
            <View style={[styles.cell, styles.colStatus]}><Text style={styles.headerText}>{t('player.status', 'Estado')}</Text></View>
          </View>
          {activePlayers.map((player) => <PlayerRow key={player._id} player={player} showPhotos={showPhotos} injuries={injuries} t={t} />)}
          {inactivePlayers.length ? (
            <View style={styles.inactiveHeaderRow} wrap={false}>
              <View style={styles.inactiveHeaderCell}>
                <Text style={styles.inactiveHeaderText}>{t('player.inactivePlayers', 'Jugadores de baja')} ({inactivePlayers.length})</Text>
              </View>
            </View>
          ) : null}
          {inactivePlayers.map((player) => <PlayerRow key={player._id} player={player} showPhotos={showPhotos} injuries={injuries} t={t} />)}
        </View>
        <PdfFooter text={`Xtramys · ${team?.nombre || t('season.myTeam', 'Mi equipo')}`} />
      </Page>
    </Document>
  );
};

export async function generatePlayerRosterPdf({ players, team, injuries = [], includeExtras, showPhotos, locale, t }) {
  const selectedPlayers = players?.filter((player) => includeExtras || !player.extra) || [];
  if (!selectedPlayers.length) throw new Error(t('player.rosterPdfEmpty', 'No hay jugadores para exportar.'));
  const safeName = String(team?.nombre || 'plantilla').replace(/[\\/:*?"<>|]+/g, '-');
  const preparedPlayers = showPhotos ? await resolvePlayerPhotos(selectedPlayers) : selectedPlayers;
  await renderPdf(
    <PlayerRosterDocument players={preparedPlayers} team={team} injuries={injuries} includeExtras={includeExtras} showPhotos={showPhotos} locale={locale} t={t} />,
    `plantilla_${safeName}`,
  );
}
