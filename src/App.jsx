import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import AppRouter from './router/AppRouter';
import { fetchMe, logoutThunk } from './store/slices/user/userThunks';
import { setNetworkErrorHandler, setUnauthorizedHandler } from './api/client';
import Toaster from './ui/Toaster';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(logoutThunk());
    });
    setNetworkErrorHandler((type, ctx) => {
      console.warn('[Network]', type, ctx);
    });
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
