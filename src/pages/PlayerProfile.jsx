// pages/PlayerProfile.jsx
// Wrapper web del componente RN `PlayerProfile` (idéntico a misterdata).
// Lee el `id` de la URL, asegura que el jugador, equipo, lesiones,
// match sheets y sesiones estén en Redux, y renderiza el modal RN.
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import RNWebPage from './_RNWebPage';
import VendorPlayerProfile from '@/vendor/playerProfile/PlayerProfile';

import { fetchJugadorEquipo, fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchInjuriesByTeam } from '@/store/slices/injury/injuryThunks';
import { fetchMatchSheetsByTeam } from '@/store/slices/matchSheet/matchSheetThunks';
import { fetchEntrenamientosPorEquipo } from '@/store/slices/session/sessionThunks';

const EMPTY = [];

export default function PlayerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const fetchedPlayer = useSelector((s) => s.player?.player);
  const playersList = useSelector((s) => s.player?.players ?? EMPTY);
  const teams = useSelector((s) => s.team?.teams ?? EMPTY);

  // Fallback: si /player/:id devuelve null, buscamos en la lista de la plantilla.
  const player = useMemo(() => {
    if (fetchedPlayer && String(fetchedPlayer._id) === String(id)) return fetchedPlayer;
    return playersList.find((p) => String(p?._id) === String(id)) || fetchedPlayer || null;
  }, [fetchedPlayer, playersList, id]);

  const selectedTeam = useMemo(() => teams.find((e) => e.seleccionado === true), [teams]);
  const team = useMemo(() => {
    if (selectedTeam) return selectedTeam;
    const playerTeamId = player?.equipo?._id || player?.equipo;
    return teams.find((e) => String(e._id) === String(playerTeamId)) || null;
  }, [selectedTeam, teams, player]);

  const teamId = team?._id;

  useEffect(() => {
    if (id) dispatch(fetchJugadorEquipo({ id }));
  }, [id, dispatch]);

  useEffect(() => {
    if (teamId && playersList.length === 0) {
      dispatch(fetchJugadoresEquipo({ team: teamId }));
    }
  }, [teamId, playersList.length, dispatch]);

  // Datos que el vendor PlayerProfile lee directamente del store.
  useEffect(() => {
    if (!teamId) return;
    dispatch(fetchInjuriesByTeam({ team: teamId }));
    dispatch(fetchMatchSheetsByTeam(teamId));
    dispatch(fetchEntrenamientosPorEquipo({ team: teamId }));
  }, [teamId, dispatch]);

  const handleClose = () => navigate(-1);

  return (
    <RNWebPage>
      <VendorPlayerProfile
        visible={!!player}
        player={player}
        team={team}
        onClose={handleClose}
      />
    </RNWebPage>
  );
}
