// store/rootReducer.js
import { combineReducers } from 'redux';
import seasonReducer from './slices/season/seasonSlice';
import teamReducer from './slices/team/teamSlice';
import playerReducer from './slices/player/playerSlice';
import exerciseReducer from './slices/exercise/exerciseSlice';
import sessionReducer from './slices/session/sessionSlice';
import injuryReducer from './slices/injury/injurySlice';
import matchSheetReducer from './slices/matchSheet/matchSheetSlice';
import rivalAnalysisReducer from './slices/rivalAnalysis/rivalAnalysisSlice';
import anthropometryReducer from './slices/anthropometry/anthropometrySlice';
import strategyReducer from './slices/strategy/strategySlice';
import rivalReducer from './slices/rival/rivalSlice';
import tournamentReducer from './slices/tournament/tournamentSlice';
import userReducer from './slices/user/userSlice';
import workspaceReducer from './slices/workspace/workspaceSlice';
import { RESET_STORE, RESET_WORKSPACE } from './actionTypes';

const appReducer = combineReducers({
  season: seasonReducer,
  team: teamReducer,
  player: playerReducer,
  exercise: exerciseReducer,
  session: sessionReducer,
  injury: injuryReducer,
  matchSheet: matchSheetReducer,
  rivalAnalysis: rivalAnalysisReducer,
  anthropometry: anthropometryReducer,
  strategy: strategyReducer,
  rival: rivalReducer,
  tournament: tournamentReducer,
  usuario: userReducer,
  workspace: workspaceReducer,
});

// Al despachar RESET_STORE, todos los reducers reciben state=undefined
// y devuelven su initialState
const rootReducer = (state, action) => {
  if (action.type === RESET_STORE) {
    const resetState = appReducer(undefined, action);
    return { ...resetState, workspace: { ...resetState.workspace, selected: null } };
  }
  if (action.type === RESET_WORKSPACE) {
    const resetState = appReducer(undefined, { type: '@@RESET_WORKSPACE' });
    return {
      ...resetState,
      usuario: state?.usuario || resetState.usuario,
      workspace: state?.workspace || resetState.workspace,
    };
  }
  return appReducer(state, action);
};

export default rootReducer;
// Re-export RESET_STORE para que vendor copies de RN puedan importarlo
// desde el mismo path que el source original (`redux/rootReducer`).
export { RESET_STORE };
