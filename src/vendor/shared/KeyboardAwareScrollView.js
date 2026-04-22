/**
 * KeyboardAwareScrollView stub para web.
 * En web no hay teclado virtual nativo, así que basta con un ScrollView normal.
 */
import { ScrollView } from 'react-native';

export default function KeyboardAwareScrollView(props) {
  return <ScrollView {...props} />;
}
