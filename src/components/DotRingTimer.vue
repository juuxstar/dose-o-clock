<template>
	<canvas ref="canvas" class="dot-ring-timer" aria-label="Elapsed timer visualization" />
</template>

<script lang="ts">
import { Component, Prop, Ref, toNative, Vue, Watch } from 'vue-facing-decorator';

import { MAX_ELAPSED_SECONDS } from '@/domain/TimerSession';
import type { DotColorStyle }  from '@/store/storage';

const red    = { r : 255, g : 46, b : 31 };
const yellow = { r : 255, g : 214, b : 0 };
const green  = { r : 41, g : 184, b : 71 };

type TimerColor = typeof red;

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

		const center        = size / 2;
		const baseDotRadius = Math.max(3, size * 0.011);
		const ringGap       = size * 0.105;
		const outerRadius   = size * 0.43;
		const elapsed       = Math.min(Math.max(this.elapsedSeconds, 0), this.durationSeconds);

		for (let ring = 0; ring < 4; ring += 1) {
			const ringStarted = ring === 0 || elapsed > ring * 3600;

			if (!ringStarted) {
				continue;
			}

			const radius        = outerRadius - ring * ringGap;
			const elapsedInRing = Math.min(Math.max(elapsed - ring * 3600, 0), 3600);

			for (let minute = 0; minute < 60; minute += 1) {
				const angle          = -Math.PI / 2 + (minute / 60) * Math.PI * 2;
				const dotStartSecond = minute * 60;
				const progress       = this.clamp((elapsedInRing - dotStartSecond) / 60, 0, 1);
				const isCardinal     = minute % 15 === 0;
				const dotRadius      = baseDotRadius * (ring === 0 ? 2 : 1) * (isCardinal ? 1.28 : 1);
				const inactive       = getComputedStyle(document.documentElement).getPropertyValue('--dot-inactive').trim();
				const activeColor    = this.activeDotColor(ring, minute, elapsed);
				context.fillStyle    = progress > 0 ? this.mixCss(inactive, activeColor, progress) : inactive;
				context.beginPath();
				context.arc(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius, dotRadius, 0, Math.PI * 2);
				context.fill();
			}
		}
	}

	activeDotColor(ring: number, minute: number, elapsed: number): string {
		if (this.colorStyle === 'gradient') {
			return ring === 0 ? this.progressColor(minute / 59) : this.toRgb(green);
		}

		return this.progressColor(this.clamp(Math.floor(Math.min(elapsed, 3600) / 60) / 59, 0, 1));
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

export default toNative(DotRingTimer);
</script>

<style scoped>
.dot-ring-timer {
	display: block;
	width: min(calc(100vw - 32px), calc(50dvh - 16px), 440px);
	aspect-ratio: 1;
}
</style>
