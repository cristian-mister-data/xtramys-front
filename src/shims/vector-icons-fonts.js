// Inject @font-face declarations so @expo/vector-icons render glyphs on web.
// The font-family names MUST match what each Icon set passes to createIconSet
// (see node_modules/@expo/vector-icons/build/<Set>.js).
import AntDesign from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf?url';
import Entypo from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf?url';
import EvilIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/EvilIcons.ttf?url';
import Feather from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf?url';
import FontAwesome from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf?url';
import FontAwesome5_Brands from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf?url';
import FontAwesome5_Regular from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf?url';
import FontAwesome5_Solid from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf?url';
import FontAwesome6_Brands from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.ttf?url';
import FontAwesome6_Regular from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Regular.ttf?url';
import FontAwesome6_Solid from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.ttf?url';
import Fontisto from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Fontisto.ttf?url';
import Foundation from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Foundation.ttf?url';
import Ionicons from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf?url';
import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf?url';
import MaterialIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf?url';
import Octicons from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Octicons.ttf?url';
import SimpleLineIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.ttf?url';
import Zocial from '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Zocial.ttf?url';

// Each entry: [css font-family, ttf url]
const FONT_FACES = [
  ['anticon', AntDesign],
  ['entypo', Entypo],
  ['evilicons', EvilIcons],
  ['feather', Feather],
  ['FontAwesome', FontAwesome],
  ['Fontisto', Fontisto],
  ['foundation', Foundation],
  ['ionicons', Ionicons],
  ['material-community', MaterialCommunityIcons],
  ['material', MaterialIcons],
  ['octicons', Octicons],
  ['simple-line-icons', SimpleLineIcons],
  ['zocial', Zocial],
  // FontAwesome5 — names produced by createIconSetFromFontAwesome5: `${family}-${styleName}`
  ['FontAwesome5Free-solid', FontAwesome5_Solid],
  ['FontAwesome5Free-regular', FontAwesome5_Regular],
  ['FontAwesome5Free-brands', FontAwesome5_Brands],
  // FontAwesome6
  ['FontAwesome6Free-solid', FontAwesome6_Solid],
  ['FontAwesome6Free-regular', FontAwesome6_Regular],
  ['FontAwesome6Free-brands', FontAwesome6_Brands],
];

let injected = false;
export function injectVectorIconFonts() {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const css = FONT_FACES
    .map(
      ([family, url]) =>
        `@font-face { font-family: '${family}'; src: url('${url}') format('truetype'); font-weight: normal; font-style: normal; font-display: block; }`
    )
    .join('\n');
  const style = document.createElement('style');
  style.setAttribute('data-vector-icons', 'true');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}
