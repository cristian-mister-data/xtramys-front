/**
 * Shim de @react-navigation/native-stack para web.
 * No-op real: Stack.Navigator renderiza sólo el primer Stack.Screen
 * (su componente o render-prop) o el matching `initialRouteName`.
 *
 * Las páginas wrapper en `src/pages/` definen sus rutas con react-router-dom.
 * Este shim sólo permite que código vendor que usa createNativeStackNavigator
 * compile y ejecute sin crash.
 */
import React from 'react';

function makeNavigator() {
  function Navigator({ children, initialRouteName }) {
    const screens = React.Children.toArray(children).filter(Boolean);
    const target = initialRouteName
      ? screens.find((c) => c.props?.name === initialRouteName)
      : screens[0];
    if (!target) return null;
    const renderProp = target.props.children;
    const Comp = target.props.component;
    if (Comp) return <Comp />;
    if (typeof renderProp === 'function') return renderProp({ navigation: { navigate: () => {} }, route: { params: {} } });
    return renderProp || null;
  }
  function Screen() { return null; }
  function Group({ children }) { return children; }
  return { Navigator, Screen, Group };
}

export function createNativeStackNavigator() { return makeNavigator(); }
export function createStackNavigator() { return makeNavigator(); }

export default { createNativeStackNavigator, createStackNavigator };
