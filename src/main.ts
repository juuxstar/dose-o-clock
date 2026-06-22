import './styles.css';

import { createApp } from 'vue';

import App                           from './App.vue';
import { startVersionUpdateMonitor } from './pwa';

createApp(App).mount('#app');
startVersionUpdateMonitor();
