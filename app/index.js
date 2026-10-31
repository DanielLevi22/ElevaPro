import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { todayWidgetTaskHandler } from './src/shared/widget';

// O widget de hoje (#376, F7): o Android o acorda com o app fechado.
registerWidgetTaskHandler(todayWidgetTaskHandler);
