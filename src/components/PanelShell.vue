<template>
	<Transition name="panel-backdrop">
		<div v-if="open" class="panel-backdrop u-flex u-items-end" @pointerdown.self="$emit('close')">
			<section class="panel-shell" @pointerdown="$emit('interact')" @click="$emit('interact')">
				<div class="panel-shell__handle" />
				<slot />
			</section>
		</div>
	</Transition>
</template>

<script lang="ts">
import { Component, Emit, Prop, toNative, Vue } from 'vue-facing-decorator';

@Component({ emits : [ 'close', 'interact' ] })
class PanelShell extends Vue {

	@Prop({ type : Boolean, required : true })
	readonly open!: boolean;

	@Emit('close')
	close(): void {}

	@Emit('interact')
	interact(): void {}

}

export default toNative(PanelShell);
</script>

<style scoped>
.panel-backdrop {
	position: fixed;
	inset: 0;
	z-index: 20;
	background: rgba(0, 0, 0, 0.04);
}

.panel-shell {
	width: 100%;
	height: min(70.5dvh, 480px);
	max-height: calc(100dvh - env(safe-area-inset-top) - 16px);
	overflow: hidden;
	border-radius: 18px 18px 0 0;
	background: var(--secondary-grouped-bg);
	box-shadow: 0 -12px 36px var(--panel-shadow);
	padding: 8px 16px calc(16px + env(safe-area-inset-bottom));
	will-change: transform;
}

.panel-shell__handle {
	width: 38px;
	height: 5px;
	margin: 0 auto 10px;
	border-radius: 999px;
	background: var(--separator);
}

.panel-backdrop-enter-active,
.panel-backdrop-leave-active {
	transition: opacity 260ms ease;
}

.panel-backdrop-enter-active .panel-shell,
.panel-backdrop-leave-active .panel-shell {
	transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.panel-backdrop-enter-from .panel-shell,
.panel-backdrop-leave-to .panel-shell {
	transform: translateY(calc(100% + 32px + env(safe-area-inset-bottom)));
}

.panel-backdrop-enter-from,
.panel-backdrop-leave-to {
	opacity: 0;
}

@media (min-width: 700px) {
	.panel-backdrop {
		justify-content: center;
	}

	.panel-shell {
		max-width: 540px;
	}
}
</style>
