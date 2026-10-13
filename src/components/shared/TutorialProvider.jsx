import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import OnboardingTutorial from './OnboardingTutorial';
import { newTutorial, readTutorialSession } from './tutorialSteps';
import { updateUsuario } from '@/store/slices/user/userThunks';
import { hasAppAccess } from '@/utils/subscriptionAccess';

const TutorialContext = createContext({ openTutorial: () => {}, tutorialActive: false });

export function TutorialProvider({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.usuario?.user);
  const supervising = useSelector(state => state.usuario?.supervising);
  const workspace = useSelector(state => state.workspace?.selected);
  const canStartTutorial = Boolean(user?._id && user.role !== 'club_admin' && !supervising && !user.trialSetupRequired && hasAppAccess(user) && workspace && workspace.canWrite !== false);
  const [session, setSession] = useState(() => readTutorialSession(user?._id));
  useEffect(() => {
    setSession(readTutorialSession(user?._id));
  }, [user?._id]);
  useEffect(() => {
    try {
      if (session) sessionStorage.setItem('xtramys:guided-tutorial', JSON.stringify(session));
      else sessionStorage.removeItem('xtramys:guided-tutorial');
    } catch {}
  }, [session]);
  const openTutorial = useCallback(() => {
    if (!canStartTutorial) return;
    const next = newTutorial(user._id);
    try { sessionStorage.setItem('xtramys:guided-tutorial', JSON.stringify(next)); } catch {}
    setSession(next);
  }, [user, canStartTutorial]);
  const finish = useCallback(() => {
    setSession(null);
    try {
      sessionStorage.removeItem('xtramys:guided-tutorial');
      localStorage.setItem(`xtramys.tutorialCompleto.${user._id}`, 'true');
      localStorage.setItem(`xtramys.demoTutorialCompleto.${user._id}`, 'true');
    } catch {}
    navigate('/app', { replace: true });
    if (!user.tutorialCompleto) dispatch(updateUsuario({id: user._id, updatedUser: {tutorialCompleto: true}}));
  }, [dispatch, navigate, user]);
  const change = useCallback(next => {
    // Save before routing: refresh and layout changes must preserve the explicitly started guide.
    setSession(previous => {
      if (previous && next.task < previous.task) return previous;
      try { sessionStorage.setItem('xtramys:guided-tutorial', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const active = Boolean(session && session.userId === user?._id && hasAppAccess(user) && !supervising);
  return <TutorialContext.Provider value={{openTutorial, tutorialActive: active, canStartTutorial}}>
    {children}
    {active && <OnboardingTutorial session={session} onChange={change} onComplete={finish} />}
  </TutorialContext.Provider>;
}
export function useTutorial() { return useContext(TutorialContext); }
