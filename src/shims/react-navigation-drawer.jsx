/**
 * Shim mínimo de @react-navigation/drawer para componentes RN reusados en web.
 * - DrawerContentScrollView: ScrollView básico (sin insets de drawer).
 * - createDrawerNavigator: stub no-op (no se monta drawer real, las páginas
 *   se enrutan con react-router-dom; el contenido del drawer se renderiza
 *   directamente en el Sidebar layout).
 */
import React from 'react';
import { ScrollView } from 'react-native';

export const DrawerContentScrollView = React.forwardRef(function DrawerContentScrollView(
  { children, style, contentContainerStyle, ...rest },
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      style={style}
      contentContainerStyle={contentContainerStyle}
      {...rest}
    >
      {children}
    </ScrollView>
  );
});

export function createDrawerNavigator() {
  const Navigator = ({ children }) => <>{children}</>;
  const Screen = () => null;
  return { Navigator, Screen };
}

export const DrawerActions = {
  openDrawer: () => ({ type: 'OPEN_DRAWER' }),
  closeDrawer: () => ({ type: 'CLOSE_DRAWER' }),
  toggleDrawer: () => ({ type: 'TOGGLE_DRAWER' }),
};

export default { DrawerContentScrollView, createDrawerNavigator, DrawerActions };
