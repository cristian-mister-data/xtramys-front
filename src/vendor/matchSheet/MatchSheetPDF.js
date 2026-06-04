
import { generateLineupPdf, generateCallUpPdf, generateMatchSheetPdf } from './pdf';
import api from '@/api/client';

// Helper to pre-resolve images to base64 to avoid Cloudflare R2 CORS/tainted canvas issues
const toDataUrl = async (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:')) return url;
  try {
    const res = await api.get('/media/image-download', {
      params: { url },
      responseType: 'blob',
      timeout: 15000,
    });
    const blob = res.data;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Proxy fetch failed for URL, trying direct fetch:', url, err.message);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed: ' + res.status);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch (e2) {
      console.warn('Direct fetch failed for URL, fallback to original:', url, e2.message);
      return url;
    }
  }
};

const resolvePhotos = async (players, team) => {
  const resolvedPlayers = await Promise.all(
    (players || []).map(async (p) => {
      if (p.foto && typeof p.foto === 'string' && p.foto.startsWith('http')) {
        const base64 = await toDataUrl(p.foto);
        return { ...p, foto: base64 };
      }
      return p;
    }),
  );

  let resolvedTeamEscudo = team?.escudo;
  if (team?.escudo && typeof team.escudo === 'string' && team.escudo.startsWith('http')) {
    resolvedTeamEscudo = await toDataUrl(team.escudo);
  }
  const resolvedTeam = team ? { ...team, escudo: resolvedTeamEscudo } : team;

  return { resolvedPlayers, resolvedTeam };
};

export const generateLineupPDF = async ({ matchSheet, team, players, lineup, formation, showPhotos = true, showNames = true, translations = {} }) => {
  try {
    const { resolvedPlayers, resolvedTeam } = await resolvePhotos(players, team);
    await generateLineupPdf({ matchSheet, team: resolvedTeam, players: resolvedPlayers, lineup, formation, showPhotos, showNames, translations });
  } catch (error) {
    console.error('Error generating lineup PDF:', error);
    throw error;
  }
};

export const generateCallUpPDF = async ({ matchSheet, team, players, horaQuedada, lugarQuedada, observaciones, fechaQuedada, showPhotos = true, translations = {} }) => {
  try {
    const convocados = matchSheet.convocados || [];
    const noConvocados = players.filter(p => !convocados.includes(p._id)).map(p => p._id);
    const { resolvedPlayers, resolvedTeam } = await resolvePhotos(players, team);
    await generateCallUpPdf({ matchSheet, team: resolvedTeam, players: resolvedPlayers, convocados, noConvocados, horaQuedada, lugarQuedada, observaciones, fechaQuedada, showPhotos, translations });
  } catch (error) {
    console.error('Error generating callup PDF:', error);
    throw error;
  }
};

export const generateMatchSheetPDF = async ({ matchSheet, team, players, showPhotos = true, translations = {} }) => {
  try {
    const titulares = matchSheet.alineacionTitulares || [];
    const suplentes = matchSheet.alineacionSuplentes || [];
    const goles = matchSheet.goles || [];
    const golesRival = matchSheet.golesRival || [];
    const tarjetasAmarillas = matchSheet.tarjetasAmarillas || [];
    const tarjetasRojas = matchSheet.tarjetasRojas || [];
    const cambios = matchSheet.cambios || [];
    const { resolvedPlayers, resolvedTeam } = await resolvePhotos(players, team);
    await generateMatchSheetPdf({ matchSheet, team: resolvedTeam, players: resolvedPlayers, titulares, suplentes, goles, golesRival, tarjetasAmarillas, tarjetasRojas, cambios, showPhotos, translations });
  } catch (error) {
    console.error('Error generating match sheet PDF:', error);
    throw error;
  }
};
