<template>
	<canvas ref="canvas" class="dot-ring-timer" aria-label="Elapsed timer visualization" />
</template>

<script lang="ts">
import { Component, Prop, Ref, toNative, Vue, Watch } from 'vue-facing-decorator';

import { MAX_ELAPSED_SECONDS } from '@/domain/TimerSession';
import type { DotColorStyle }  from '@/store/storage';

/**
 * Renders elapsed time as concentric progress rings on a responsive canvas.
 */
@Component
class DotRingTimer extends Vue {

	@Prop({ type : Number, required : true })
	readonly elapsedSeconds!: number;

	@Prop({ type : Number, default : MAX_ELAPSED_SECONDS })
	readonly durationSeconds!: number;

	@Prop({ type : String, required : true })
	readonly colorStyle!: DotColorStyle;

	@Ref('canvas')
	canvas?: HTMLCanvasElement;

	resizeObserver: ResizeObserver | null = null;

	mounted(): void {
		this.resizeObserver = new ResizeObserver(() => this.draw());

		if (this.canvas) {
			this.resizeObserver.observe(this.canvas);
		}

		this.draw();
	}

	beforeUnmount(): void {
		this.resizeObserver?.disconnect();
	}

	@Watch('elapsedSeconds')
	@Watch('durationSeconds')
	@Watch('colorStyle')
	onTimerInputChanged(): void {
		this.draw();
	}

	draw(): void {
		const element = this.canvas;

		if (!element) {
			return;
		}

		const rect     = element.getBoundingClientRect();
		const size     = Math.max(1, Math.floor(rect.width));
		const ratio    = window.devicePixelRatio || 1;
		element.width  = size * ratio;
		element.height = size * ratio;

		const context = element.getContext('2d');

		if (!context) {
			return;
		}

		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, size, size);

		const center         = size / 2;
		const baseDotRadius  = Math.max(3, size * 0.011);
		const outerRadius    = size * 0.43;
		const duration       = Math.max(1, this.durationSeconds);
		const elapsed        = Math.max(this.elapsedSeconds, 0);
		const secondsPerDot  = duration / dotsPerRing;
		const inactive       = getComputedStyle(document.documentElement).getPropertyValue('--dot-inactive').trim();
		const completedRings = Math.floor(elapsed / duration);
		const ringCount      = Math.max(1, completedRings + 1);
		const ringGap        = Math.max(baseDotRadius * 4.25, size * 0.055);
		const minRadius      = baseDotRadius * 4;
		const firstRing      = Math.max(0, ringCount - Math.max(1, Math.floor((outerRadius - minRadius) / ringGap) + 1));

		for (let ring = firstRing; ring < ringCount; ring += 1) {
			const ringRadius  = outerRadius - (ring - firstRing) * ringGap;
			const ringElapsed = this.clamp(elapsed - ring * duration, 0, duration);

			for (let dot = 0; dot < dotsPerRing; dot += 1) {
				const angle          = -Math.PI / 2 + (dot / dotsPerRing) * Math.PI * 2;
				const dotStartSecond = dot * secondsPerDot;
				const progress       = this.clamp((ringElapsed - dotStartSecond) / secondsPerDot, 0, 1);
				const isCardinal     = dot % 15 === 0;
				const dotRadius      = baseDotRadius * 2 * (isCardinal ? 1.28 : 1);
				const activeColor    = ring === 0 ? this.activeDotColor(dot, ringElapsed, duration) : this.toRgb(green);
				context.fillStyle    = progress > 0 ? this.mixCss(inactive, activeColor, progress) : inactive;
				context.beginPath();
				context.arc(center + Math.cos(angle) * ringRadius, center + Math.sin(angle) * ringRadius, dotRadius, 0, Math.PI * 2);
				context.fill();
			}
		}
	}

	activeDotColor(dot: number, elapsed: number, duration: number): string {
		if (this.colorStyle === 'gradient') {
			return this.progressColor(dot / 59);
		}

		return this.progressColor(this.clamp(elapsed / duration, 0, 1));
	}

	progressColor(progress: number): string {
		if (progress <= 0.5) {
			return this.toRgb(this.mixRgb(red, yellow, progress / 0.5));
		}

		return this.toRgb(this.mixRgb(yellow, green, (progress - 0.5) / 0.5));
	}

	mixRgb(start: TimerColor, end: TimerColor, progress: number): TimerColor {
		return {
			r : Math.round(start.r + (end.r - start.r) * progress),
			g : Math.round(start.g + (end.g - start.g) * progress),
			b : Math.round(start.b + (end.b - start.b) * progress),
		};
	}

	toRgb(color: TimerColor): string {
		return `rgb(${color.r}, ${color.g}, ${color.b})`;
	}

	mixCss(start: string, end: string, progress: number): string {
		const startRgb = this.parseRgb(start);
		const endRgb   = this.parseRgb(end);
		return this.toRgb(this.mixRgb(startRgb, endRgb, progress));
	}

	parseRgb(value: string): TimerColor {
		const match = value.match(/\d+/g)?.map(Number);
		return { r : match?.[0] ?? 209, g : match?.[1] ?? 209, b : match?.[2] ?? 214 };
	}

	clamp(value: number, minimum: number, maximum: number): number {
		return Math.min(Math.max(value, minimum), maximum);
	}

}

const red         = { r : 255, g : 46, b : 31 };
const yellow      = { r : 255, g : 214, b : 0 };
const green       = { r : 41, g : 184, b : 71 };
const dotsPerRing = 60;

type TimerColor = typeof red;

export default toNative(DotRingTimer);
</script>

<style scoped>
.dot-ring-timer {
	display: block;
	width: min(calc(100vw - 16px), calc(50dvh - 16px), 440px);
	aspect-ratio: 1;
}
</style>
