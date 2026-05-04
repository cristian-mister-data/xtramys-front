import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import OnboardingTutorial from './OnboardingTutorial';
import { updateUsuario } from '@/store/slices/user/userThunks';

const TutorialContext = createContext({ openTutorial: () => {} });

export function TutorialProvider({ children }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.usuario?.user);
  const [visible, setVisible] = useState(false);
  const autoShownForUserRef = useRef(null);

  useEffect(() => {
    if (!user?._id) {
      autoShownForUserRef.current = null;
      setVisible(false);
      return;
    }

    if (autoShownForUserRef.current === user._id) return;
    if (user.tutorialCompleto) {
      autoShownForUserRef.current = user._id;
      return;
    }

    autoShownForUserRef.current = user._id;
    setVisible(true);
  }, [user?._id, user?.tutorialCompleto]);

  const openTutorial = useCallback(() => {
    setVisible(true);
  }, []);

  const completeTutorial = useCallback(async () => {
    setVisible(false);
    if (!user?._id || user.tutorialCompleto) return;

    try {
      await dispatch(
        updateUsuario({ id: user._id, updatedUser: { tutorialCompleto: true } }),
      ).unwrap();
    } catch {}
  }, [dispatch, user]);

  return (
    <TutorialContext.Provider value={{ openTutorial }}>
      {children}
      <OnboardingTutorial visible={visible} onComplete={completeTutorial} />
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
