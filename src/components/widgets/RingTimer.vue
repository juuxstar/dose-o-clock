<template>
	<canvas ref="canvas" class="ring-timer" aria-label="Elapsed timer visualization" />
</template>

<script lang="ts">
import { Component, Prop, Ref, toNative, Vue, Watch } from 'vue-facing-decorator';

import { maxElapsedSeconds } from '@/domain/TimerSession';
import { TimerRingShape }    from '@/store/storage';

/**
 * Renders elapsed time as one duration-scaled progress ring on a responsive canvas.
 */
@Component
class RingTimer extends Vue {

	@Prop({ type : Number, required : true })
	readonly elapsedSeconds!: number;

	@Prop({ type : Number, default : maxElapsedSeconds })
	readonly durationSeconds!: number;

	@Prop({ type : String, default : TimerRingShape.Dots })
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
		const duration      = Math.max(1, this.durationSeconds);
		const elapsed       = Math.max(this.elapsedSeconds, 0);
		const inactive      = getComputedStyle(document.documentElement).getPropertyValue('--dot-inactive').trim();
		const ringRenderer  = ringRenderers[this.ringShape] ?? ringRenderers[TimerRingShape.Dots];

		ringRenderer.draw(context, {
			activeColorAt : this.activeColorAt.bind(this),
			baseDotRadius,
			center,
			clamp         : this.clamp,
			duration,
			elapsed,
			inactive,
			mixCss        : this.mixCss.bind(this),
			radius        : outerRadius,
			ringSegments  : Math.max(1, Math.round(this.ringSegments)),
		});
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

/**
 * Draws a complete timer ring style, including any track, progress, and repeated marks.
 */
abstract class RingRenderer {

	abstract draw(context: CanvasRenderingContext2D, ring: RingRenderContext): void;

}

/**
 * Draws ring styles made from repeated marks that each receive their own progress color.
 */
class SegmentedRingRenderer extends RingRenderer {

	readonly shapeRenderer: RingShapeRenderer;

	constructor(shapeRenderer: RingShapeRenderer) {
		super();
		this.shapeRenderer = shapeRenderer;
	}

	draw(context: CanvasRenderingContext2D, ring: RingRenderContext): void {
		const ringSegments  = this.shapeRenderer.visibleSegments(ring.ringSegments);
		const secondsPerDot = ring.duration / ringSegments;

		for (let dot = 0; dot < ringSegments; dot += 1) {
			const angle          = -Math.PI / 2 + (dot / ringSegments) * Math.PI * 2;
			const dotStartSecond = dot * secondsPerDot;
			const progress       = ring.elapsed >= ring.duration ? 1 : ring.clamp((ring.elapsed - dotStartSecond) / secondsPerDot, 0, 1);
			const isCardinal     = dot % Math.max(1, ringSegments / 4) === 0;
			const scale          = isCardinal ? cardinalScale : 1;
			const activeColor    = ring.activeColorAt(dot / Math.max(1, ringSegments - 1), ring.elapsed, ring.duration);
			context.fillStyle    = progress > 0 ? ring.mixCss(ring.inactive, activeColor, progress) : ring.inactive;

			this.shapeRenderer.draw(context, {
				angle,
				baseDotRadius : ring.baseDotRadius,
				center        : ring.center,
				radius        : ring.radius,
				scale,
			});
		}
	}

}

class MinimalRingRenderer extends RingRenderer {

	draw(context: CanvasRenderingContext2D, ring: RingRenderContext): void {
		const progress = ring.elapsed >= ring.duration ? 1 : ring.clamp(ring.elapsed / ring.duration, 0, 1);

		context.save();
		context.lineWidth   = ring.baseDotRadius * 3.2;
		context.lineCap     = 'round';
		context.strokeStyle = ring.inactive;
		context.beginPath();
		context.arc(ring.center, ring.center, ring.radius, 0, Math.PI * 2);
		context.stroke();

		if (progress > 0) {
			const segmentCount = Math.max(1, Math.ceil(progress * smoothRingSegments));
			for (let segment = 0; segment < segmentCount; segment += 1) {
				const segmentStart = segment / smoothRingSegments;
				const segmentEnd   = Math.min((segment + 1) / smoothRingSegments, progress);

				const startAngle = -Math.PI / 2 + segmentStart * Math.PI * 2;
				const endAngle   = -Math.PI / 2 + segmentEnd * Math.PI * 2;

				context.strokeStyle = ring.activeColorAt(segmentStart, ring.elapsed, ring.duration);
				context.beginPath();
				context.arc(ring.center, ring.center, ring.radius, startAngle, endAngle);
				context.stroke();
			}
		}

		context.restore();
	}

}

/**
 * Draws one timer ring mark and optionally adjusts how many marks a style displays.
 */
abstract class RingShapeRenderer {

	visibleSegments(ringSegments: number): number {
		return ringSegments;
	}

	abstract draw(context: CanvasRenderingContext2D, mark: RingShapeMark): void;

}

/**
 * Base for glyphs that are easiest to draw around a local origin pointed inward.
 */
abstract class PositionedRingShapeRenderer extends RingShapeRenderer {

	draw(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const outerX = mark.center + Math.cos(mark.angle) * mark.radius;
		const outerY = mark.center + Math.sin(mark.angle) * mark.radius;

		context.save();
		context.translate(outerX, outerY);
		context.rotate(mark.angle + Math.PI);
		this.drawLocal(context, mark);
		context.restore();
	}

	protected abstract drawLocal(context: CanvasRenderingContext2D, mark: RingShapeMark): void;

}

class DotRingShapeRenderer extends RingShapeRenderer {

	draw(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const dotRadius = mark.baseDotRadius * 2 * mark.scale;

		context.beginPath();
		context.arc(
			mark.center + Math.cos(mark.angle) * mark.radius,
			mark.center + Math.sin(mark.angle) * mark.radius,
			dotRadius,
			0,
			Math.PI * 2
		);
		context.fill();
	}

}

class DartRingShapeRenderer extends PositionedRingShapeRenderer {

	protected drawLocal(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const length = mark.baseDotRadius * 5.2 * mark.scale;
		const width  = mark.baseDotRadius * 3.2 * mark.scale;

		context.beginPath();
		context.moveTo(length / 2, 0);
		context.lineTo(-length / 2, -width / 2);
		context.lineTo(-length / 2, width / 2);
		context.closePath();
		context.fill();
	}

}

class DiamondRingShapeRenderer extends PositionedRingShapeRenderer {

	protected drawLocal(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const size = mark.baseDotRadius * 4.2 * mark.scale;

		context.beginPath();
		context.moveTo(size / 2, 0);
		context.lineTo(0, -size / 2);
		context.lineTo(-size / 2, 0);
		context.lineTo(0, size / 2);
		context.closePath();
		context.fill();
	}

}

class BarRingShapeRenderer extends PositionedRingShapeRenderer {

	protected drawLocal(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const length = mark.baseDotRadius * 5.8 * mark.scale;
		const width  = mark.baseDotRadius * 2.3 * mark.scale;

		context.beginPath();
		context.rect(-length / 2, -width / 2, length, width);
		context.fill();
	}

}

class CapsuleRingShapeRenderer extends PositionedRingShapeRenderer {

	protected drawLocal(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const length = mark.baseDotRadius * 6.4 * mark.scale;
		const width  = mark.baseDotRadius * 2.9 * mark.scale;

		roundedRect(context, -length / 2, -width / 2, length, width, width / 2);
		context.fill();
	}

}

class TickRingShapeRenderer extends RingShapeRenderer {

	draw(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const length      = mark.baseDotRadius * 6.3 * mark.scale;
		const width       = Math.max(1, mark.baseDotRadius * 0.95 * mark.scale);
		const innerRadius = mark.radius - length / 2;
		const outerRadius = mark.radius + length / 2;

		context.save();
		context.lineCap     = 'round';
		context.lineWidth   = width;
		context.strokeStyle = context.fillStyle;
		context.beginPath();
		context.moveTo(mark.center + Math.cos(mark.angle) * innerRadius, mark.center + Math.sin(mark.angle) * innerRadius);
		context.lineTo(mark.center + Math.cos(mark.angle) * outerRadius, mark.center + Math.sin(mark.angle) * outerRadius);
		context.stroke();
		context.restore();
	}

}

class PetalRingShapeRenderer extends PositionedRingShapeRenderer {

	protected drawLocal(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		const length = mark.baseDotRadius * 6.2 * mark.scale;
		const width  = mark.baseDotRadius * 3.8 * mark.scale;

		context.beginPath();
		context.moveTo(length / 2, 0);
		context.bezierCurveTo(length * 0.12, -width / 2, -length / 2, -width / 2, -length / 2, 0);
		context.bezierCurveTo(-length / 2, width / 2, length * 0.12, width / 2, length / 2, 0);
		context.fill();
	}

}

class PenisRingShapeRenderer extends PositionedRingShapeRenderer {

	visibleSegments(ringSegments: number): number {
		return Math.max(1, Math.round(ringSegments * penisSegmentRatio));
	}

	protected drawLocal(context: CanvasRenderingContext2D, mark: RingShapeMark): void {
		// Define the local dimensions for the curved shaft, head, and base lobes.
		const length     = mark.baseDotRadius * 6.8 * mark.scale;
		const width      = mark.baseDotRadius * 2.2 * mark.scale;
		const shaftLeft  = -length * 0.26;
		const shaftRight = length * 0.26;
		const shaftHalf  = width * 0.32;
		const headTip    = length * 0.52;
		const headBase   = length * 0.25;
		const headWing   = width * 0.68;
		const shaftBend  = -width * 0.28;
		const shaftCurve = -width * 0.2;
		const headBend   = -width * 0.34;
		const headTilt   = width * 0.14;
		const ballCenter = -length * 0.35;
		const ballRadius = width * 0.64;
		const ballOuter  = ballCenter - ballRadius * 1.18;
		const ballInner  = ballCenter - ballRadius * 0.5;

		// Draw the single filled silhouette for the head, curved shaft, and base lobes.
		context.beginPath();
		context.moveTo(headTip, headBend);
		context.bezierCurveTo(
			headTip - headTilt,
			headBend - headWing * 0.62,
			headBase - headTilt,
			headBend - headWing,
			headBase,
			headBend - headWing * 0.26
		);
		context.bezierCurveTo(headBase, -shaftHalf * 0.86 + shaftBend, shaftRight, -shaftHalf + shaftBend, shaftRight, -shaftHalf + shaftBend);
		context.bezierCurveTo(
			shaftRight - length * 0.16,
			-shaftHalf + shaftBend,
			shaftLeft + length * 0.14,
			-shaftHalf + shaftCurve,
			shaftLeft,
			-shaftHalf
		);
		context.bezierCurveTo(shaftLeft, -ballRadius * 0.82, ballCenter, -ballRadius * 1.1, ballInner, -ballRadius);
		context.bezierCurveTo(ballOuter, -ballRadius * 0.72, ballOuter, 0, ballInner, 0);
		context.bezierCurveTo(ballOuter, 0, ballOuter, ballRadius * 0.72, ballInner, ballRadius);
		context.bezierCurveTo(ballCenter, ballRadius * 1.1, shaftLeft, ballRadius * 0.82, shaftLeft, shaftHalf);
		context.bezierCurveTo(
			shaftLeft + length * 0.14,
			shaftHalf + shaftCurve,
			shaftRight - length * 0.16,
			shaftHalf + shaftBend,
			shaftRight,
			shaftHalf + shaftBend
		);
		context.bezierCurveTo(shaftRight, shaftHalf + shaftBend, headBase, shaftHalf * 0.86 + shaftBend, headBase, headBend + headWing * 0.26);
		context.bezierCurveTo(headBase + headTilt, headBend + headWing, headTip + headTilt, headBend + headWing * 0.62, headTip, headBend);
		context.closePath();
		context.fill();

		// Set up subtle internal strokes that share one detail style.
		context.save();
		context.globalAlpha = 0.34;
		context.lineCap     = 'round';
		context.lineWidth   = Math.max(0.6, width * 0.12);
		context.strokeStyle = 'rgb(0, 0, 0)';
		context.beginPath();

		// Draw the head and shaft contour details.
		context.moveTo(headTip - width * 0.16, headBend - width * 0.28);
		context.quadraticCurveTo(headTip - width * 0.05, headBend, headTip + width * 0.02, headBend + width * 0.28);
		context.moveTo(headBase + width * 0.14, shaftBend - shaftHalf * 0.64);
		context.quadraticCurveTo(headBase - width * 0.08, shaftBend + shaftCurve * 0.2, headBase + width * 0.06, shaftBend + shaftHalf * 0.64);

		// Draw the base lobe separation details.
		context.moveTo(shaftLeft + width * 0.08, -shaftHalf * 0.95);
		context.bezierCurveTo(
			shaftLeft - ballRadius * 0.08,
			-ballRadius * 0.16,
			ballInner,
			-ballRadius * 0.12,
			ballInner,
			0
		);
		context.moveTo(ballInner + ballRadius * 0.22, ballRadius * 0.12);
		context.quadraticCurveTo(ballInner + ballRadius * 0.34, ballRadius * 0.45, shaftLeft + width * 0.42, shaftHalf * 0.92);
		context.stroke();
		context.restore();
	}

}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
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

const red                 = { r : 255, g : 46, b : 31 };
const yellow              = { r : 255, g : 214, b : 0 };
const green               = { r : 41, g : 184, b : 71 };
const defaultRingSegments = 60;
const penisSegmentRatio   = 0.8;
const smoothRingSegments  = 120;
const cardinalScale       = 1.36;

type TimerColor = typeof red;

interface RingShapeMark {
	angle: number;
	baseDotRadius: number;
	center: number;
	radius: number;
	scale: number;
}

interface RingRenderContext {
	activeColorAt: (position: number, elapsed: number, duration: number) => string;
	baseDotRadius: number;
	center: number;
	clamp: (value: number, minimum: number, maximum: number) => number;
	duration: number;
	elapsed: number;
	inactive: string;
	mixCss: (start: string, end: string, progress: number) => string;
	radius: number;
	ringSegments: number;
}

const ringRenderers: Record<TimerRingShape, RingRenderer> = {
	[TimerRingShape.Dots]     : new SegmentedRingRenderer(new DotRingShapeRenderer()),
	[TimerRingShape.Darts]    : new SegmentedRingRenderer(new DartRingShapeRenderer()),
	[TimerRingShape.Diamond]  : new SegmentedRingRenderer(new DiamondRingShapeRenderer()),
	[TimerRingShape.Bars]     : new SegmentedRingRenderer(new BarRingShapeRenderer()),
	[TimerRingShape.Capsules] : new SegmentedRingRenderer(new CapsuleRingShapeRenderer()),
	[TimerRingShape.Ticks]    : new SegmentedRingRenderer(new TickRingShapeRenderer()),
	[TimerRingShape.Petals]   : new SegmentedRingRenderer(new PetalRingShapeRenderer()),
	[TimerRingShape.Minimal]  : new MinimalRingRenderer(),
	[TimerRingShape.Penises]  : new SegmentedRingRenderer(new PenisRingShapeRenderer()),
};

export default toNative(RingTimer);
</script>

<style scoped>
.ring-timer {
	display: block;
	width: min(100%, calc(100vw - 16px), calc(50dvh - 16px), 440px);
	aspect-ratio: 1;
}
</style>
