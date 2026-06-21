<template>
	<MainView />
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator';

import MainView from '@/components/MainView.vue';

@Component({ components : { MainView } })
class App extends Vue {

}

export default toNative(App);
</script>
