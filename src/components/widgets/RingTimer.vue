<template>
	<canvas ref="canvas" class="ring-timer" aria-label="Elapsed timer visualization" />
</template>

<script lang="ts">
import { Component, Prop, Ref, toNative, Vue, Watch } from 'vue-facing-decorator';

import { maxElapsedSeconds }   from '@/domain/TimerSession';
import type { TimerRingShape } from '@/store/storage';

/**
 * Renders elapsed time as one duration-scaled progress ring on a responsive canvas.
 */
@Component
class RingTimer extends Vue {

	@Prop({ type : Number, required : true })
	readonly elapsedSeconds!: number;

	@Prop({ type : Number, default : maxElapsedSeconds })
	readonly durationSeconds!: number;

	@Prop({ type : String, default : 'dots' })
	readonly ringShape!: TimerRingShape;

	@Prop({ type : Number, default : 60 })
	readonly ringSegments!: number;

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
	@Watch('ringShape')
	@Watch('ringSegments')
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
		const baseDotRadius = Math.max(1.2, size * 0.011);
		const outerRadius   = size * 0.43;
		const dartLength    = baseDotRadius * 5.2;
		const dartWidth     = baseDotRadius * 3.2;
		const diamondSize   = baseDotRadius * 4.2;
		const barLength     = baseDotRadius * 5.8;
		const barWidth      = baseDotRadius * 2.3;
		const capsuleLength = baseDotRadius * 6.4;
		const capsuleWidth  = baseDotRadius * 2.9;
		const tickLength    = baseDotRadius * 6.3;
		const tickWidth     = Math.max(1, baseDotRadius * 0.95);
		const petalLength   = baseDotRadius * 6.2;
		const petalWidth    = baseDotRadius * 3.8;
		const duration      = Math.max(1, this.durationSeconds);
		const elapsed       = Math.max(this.elapsedSeconds, 0);
		const ringSegments  = Math.max(1, Math.round(this.ringSegments));
		const secondsPerDot = duration / ringSegments;
		const inactive      = getComputedStyle(document.documentElement).getPropertyValue('--dot-inactive').trim();

		if (this.ringShape === 'minimal') {
			this.drawMinimalRing(context, center, outerRadius, baseDotRadius * 3.2, elapsed, duration, inactive);
			return;
		}

		for (let dot = 0; dot < ringSegments; dot += 1) {
			const angle          = -Math.PI / 2 + (dot / ringSegments) * Math.PI * 2;
			const dotStartSecond = dot * secondsPerDot;
			const progress       = elapsed >= duration ? 1 : this.clamp((elapsed - dotStartSecond) / secondsPerDot, 0, 1);
			const isCardinal     = dot % Math.max(1, ringSegments / 4) === 0;
			const shapeScale     = isCardinal ? cardinalScale : 1;
			const dotRadius      = baseDotRadius * 2 * shapeScale;
			const activeColor    = this.activeColor(dot, ringSegments, elapsed, duration);
			context.fillStyle    = progress > 0 ? this.mixCss(inactive, activeColor, progress) : inactive;

			if (this.ringShape === 'darts') {
				this.drawDart(context, center, outerRadius, angle, dartLength * shapeScale, dartWidth * shapeScale);
			}
			else if (this.ringShape === 'diamond') {
				this.drawDiamond(context, center, outerRadius, angle, diamondSize * shapeScale);
			}
			else if (this.ringShape === 'bars') {
				this.drawBar(context, center, outerRadius, angle, barLength * shapeScale, barWidth * shapeScale);
			}
			else if (this.ringShape === 'capsules') {
				this.drawCapsule(context, center, outerRadius, angle, capsuleLength * shapeScale, capsuleWidth * shapeScale);
			}
			else if (this.ringShape === 'ticks') {
				context.strokeStyle = context.fillStyle;
				this.drawTick(context, center, outerRadius, angle, tickLength * shapeScale, tickWidth * shapeScale);
			}
			else if (this.ringShape === 'petals') {
				this.drawPetal(context, center, outerRadius, angle, petalLength * shapeScale, petalWidth * shapeScale);
			}
			else {
				context.beginPath();
				context.arc(center + Math.cos(angle) * outerRadius, center + Math.sin(angle) * outerRadius, dotRadius, 0, Math.PI * 2);
				context.fill();
			}
		}
	}

	drawDart(context: CanvasRenderingContext2D, center: number, radius: number, angle: number, length: number, width: number): void {
		const outerX      = center + Math.cos(angle) * radius;
		const outerY      = center + Math.sin(angle) * radius;
		const inwardAngle = angle + Math.PI;

		context.save();
		context.translate(outerX, outerY);
		context.rotate(inwardAngle);
		context.beginPath();
		context.moveTo(length / 2, 0);
		context.lineTo(-length / 2, -width / 2);
		context.lineTo(-length / 2, width / 2);
		context.closePath();
		context.fill();
		context.restore();
	}

	drawDiamond(context: CanvasRenderingContext2D, center: number, radius: number, angle: number, size: number): void {
		const outerX      = center + Math.cos(angle) * radius;
		const outerY      = center + Math.sin(angle) * radius;
		const inwardAngle = angle + Math.PI;

		context.save();
		context.translate(outerX, outerY);
		context.rotate(inwardAngle);
		context.beginPath();
		context.moveTo(size / 2, 0);
		context.lineTo(0, -size / 2);
		context.lineTo(-size / 2, 0);
		context.lineTo(0, size / 2);
		context.closePath();
		context.fill();
		context.restore();
	}

	drawBar(context: CanvasRenderingContext2D, center: number, radius: number, angle: number, length: number, width: number): void {
		const outerX      = center + Math.cos(angle) * radius;
		const outerY      = center + Math.sin(angle) * radius;
		const inwardAngle = angle + Math.PI;

		context.save();
		context.translate(outerX, outerY);
		context.rotate(inwardAngle);
		context.beginPath();
		context.rect(-length / 2, -width / 2, length, width);
		context.fill();
		context.restore();
	}

	drawCapsule(context: CanvasRenderingContext2D, center: number, radius: number, angle: number, length: number, width: number): void {
		const outerX      = center + Math.cos(angle) * radius;
		const outerY      = center + Math.sin(angle) * radius;
		const inwardAngle = angle + Math.PI;

		context.save();
		context.translate(outerX, outerY);
		context.rotate(inwardAngle);
		this.roundedRect(context, -length / 2, -width / 2, length, width, width / 2);
		context.fill();
		context.restore();
	}

	drawTick(context: CanvasRenderingContext2D, center: number, radius: number, angle: number, length: number, width: number): void {
		const innerRadius = radius - length / 2;
		const outerRadius = radius + length / 2;

		context.save();
		context.lineCap   = 'round';
		context.lineWidth = width;
		context.beginPath();
		context.moveTo(center + Math.cos(angle) * innerRadius, center + Math.sin(angle) * innerRadius);
		context.lineTo(center + Math.cos(angle) * outerRadius, center + Math.sin(angle) * outerRadius);
		context.stroke();
		context.restore();
	}

	drawPetal(context: CanvasRenderingContext2D, center: number, radius: number, angle: number, length: number, width: number): void {
		const outerX      = center + Math.cos(angle) * radius;
		const outerY      = center + Math.sin(angle) * radius;
		const inwardAngle = angle + Math.PI;

		context.save();
		context.translate(outerX, outerY);
		context.rotate(inwardAngle);
		context.beginPath();
		context.moveTo(length / 2, 0);
		context.bezierCurveTo(length * 0.12, -width / 2, -length / 2, -width / 2, -length / 2, 0);
		context.bezierCurveTo(-length / 2, width / 2, length * 0.12, width / 2, length / 2, 0);
		context.fill();
		context.restore();
	}

	drawMinimalRing(
		context: CanvasRenderingContext2D,
		center: number,
		radius: number,
		width: number,
		elapsed: number,
		duration: number,
		inactive: string
	): void {
		const progress = elapsed >= duration ? 1 : this.clamp(elapsed / duration, 0, 1);

		context.save();
		context.lineWidth   = width;
		context.lineCap     = 'round';
		context.strokeStyle = inactive;
		context.beginPath();
		context.arc(center, center, radius, 0, Math.PI * 2);
		context.stroke();

		if (progress > 0) {
			const segmentCount = Math.max(1, Math.ceil(progress * smoothRingSegments));
			for (let segment = 0; segment < segmentCount; segment += 1) {
				const segmentStart = segment / smoothRingSegments;
				const segmentEnd   = Math.min((segment + 1) / smoothRingSegments, progress);

				context.strokeStyle = this.activeColorAt(segmentStart, elapsed, duration);
				context.beginPath();
				context.arc(center, center, radius, -Math.PI / 2 + segmentStart * Math.PI * 2, -Math.PI / 2 + segmentEnd * Math.PI * 2);
				context.stroke();
			}
		}

		context.restore();
	}

	roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
		context.beginPath();
		context.moveTo(x + radius, y);
		context.lineTo(x + width - radius, y);
		context.quadraticCurveTo(x + width, y, x + width, y + radius);
		context.lineTo(x + width, y + height - radius);
		context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		context.lineTo(x + radius, y + height);
		context.quadraticCurveTo(x, y + height, x, y + height - radius);
		context.lineTo(x, y + radius);
		context.quadraticCurveTo(x, y, x + radius, y);
		context.closePath();
	}

	activeColor(dot: number, ringSegments: number, elapsed: number, duration: number): string {
		return this.activeColorAt(dot / Math.max(1, ringSegments - 1), elapsed, duration);
	}

	activeColorAt(position: number, elapsed: number, duration: number): string {
		const baseColor        = this.progressColor(position);
		const overtimeProgress = this.clamp((elapsed - duration) / duration, 0, 1);
		const dotGreenProgress = this.clamp((overtimeProgress - position) * defaultRingSegments, 0, 1);

		return this.toRgb(this.mixRgb(this.parseRgb(baseColor), green, dotGreenProgress));
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

const red                 = { r : 255, g : 46, b : 31 };
const yellow              = { r : 255, g : 214, b : 0 };
const green               = { r : 41, g : 184, b : 71 };
const defaultRingSegments = 60;
const smoothRingSegments  = 120;
const cardinalScale       = 1.36;

type TimerColor = typeof red;

export default toNative(RingTimer);
</script>

<style scoped>
.ring-timer {
	display: block;
	width: min(100%, calc(100vw - 16px), calc(50dvh - 16px), 440px);
	aspect-ratio: 1;
}
</style>
