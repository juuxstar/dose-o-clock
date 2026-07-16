<template>
	<div
		ref="root"
		class="dial-selector"
		:style="centerOvalStyle"
		@pointerdown="onPointerDown"
		@touchstart.prevent="onTouchStart"
		@touchmove.prevent="onTouchMove"
		@touchend.prevent="onTouchEnd"
		@touchcancel.prevent="onTouchEnd"
	>
		<div class="dial-selector__mask u-grid u-place-center">
			<div class="dial-selector__item dial-selector__item--center u-grid u-place-center u-text-center" :style="{ color : selectedColor }">
				{{ selectedLabel }}
			</div>
			<div
				v-for="item in visibleItems"
				:key="item.index"
				class="dial-selector__item u-text-center"
				:style="item.style"
			>
				{{ item.label }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Emit, Prop, Ref, toNative, Vue } from 'vue-facing-decorator';

/**
 * Lets users scrub through a fixed set of numeric choices with touch-friendly momentum.
 */
@Component({ emits : [ 'update:modelValue', 'interact' ] })
class DialSelector extends Vue {

	@Prop({ type : Array, required : true })
	readonly values!: number[];

	@Prop({ type : Number, required : true })
	readonly modelValue!: number;

	@Prop({ type : Function, required : true })
	readonly format!: ValueFormatter;

	@Prop({ type : Function, default : undefined })
	readonly colorForValue?: ValueFormatter;

	@Prop({ type : Number, default : 92 })
	readonly centerOvalWidth!: number;

	@Prop({ type : Number, default : 72 })
	readonly itemSpacing!: number;

	@Ref('root')
	root?: HTMLElement;

	dragOffset           = 0;
	dragVelocity         = 0;
	lastDragClientX      = 0;
	lastDragAt           = 0;
	momentumFrame        = 0;
	momentumDurationMs   = 260;
	momentumProjectionMs = 240;
	startX               = 0;
	startIndex           = 0;
	isDragging           = false;
	isMomentumScrolling  = false;
	dragMode: 'pointer' | 'touch' | null = null;

	get selectedIndex(): number {
		const found = this.values.indexOf(this.modelValue);
		return found >= 0 ? found : 0;
	}

	get selectedLabel(): string {
		return this.format(this.values[this.selectedIndex] ?? this.modelValue);
	}

	get selectedColor(): string | undefined {
		return this.colorForValue?.(this.values[this.selectedIndex] ?? this.modelValue);
	}

	get centerOvalStyle(): Record<string, string> {
		return { '--dial-selector-center-width' : `${this.centerOvalWidth}px` };
	}

	get residualDragOffset(): number {
		if (!this.isDragging && !this.isMomentumScrolling) {
			return this.dragOffset;
		}

		return this.dragOffset + (this.selectedIndex - this.startIndex) * this.itemSpacing;
	}

	get minimumDragOffset(): number {
		return (this.startIndex - this.values.length + 1) * this.itemSpacing;
	}

	get maximumDragOffset(): number {
		return this.startIndex * this.itemSpacing;
	}

	get visibleItems(): VisibleItem[] {
		return this.values
			.map((value, index) => {
				const offset         = index - this.selectedIndex;
				const visualOffset   = offset * this.itemSpacing + this.residualDragOffset;
				const visualDistance = Math.abs(visualOffset / this.itemSpacing);
				return {
					value,
					index,
					offset,
					visualDistance,
					label : this.format(value),
					style : {
						transform : `translateX(${visualOffset}px) scale(${Math.max(0.62, 1 - visualDistance * 0.12)})`,
						opacity   : offset === 0 ? 0 : Math.max(0, 1 - visualDistance * 0.28),
						color     : this.colorForValue?.(value),
					},
				};
			})
			.filter(item => item.visualDistance <= 4.5);
	}

	onPointerDown(event: PointerEvent): void {
		if (this.dragMode === 'touch') {
			return;
		}

		this.root?.setPointerCapture?.(event.pointerId);
		this.beginDrag(event.clientX, 'pointer');
		window.addEventListener('pointermove', this.onPointerMove);
		window.addEventListener('pointerup', this.onPointerUp, { once : true });
		window.addEventListener('pointercancel', this.onPointerUp, { once : true });
	}

	onPointerMove = (event: PointerEvent): void => {
		if (this.dragMode !== 'pointer') {
			return;
		}

		this.moveDrag(event.clientX);
	};

	onPointerUp = (): void => {
		window.removeEventListener('pointermove', this.onPointerMove);
		this.endDrag();
	};

	beforeUnmount(): void {
		window.removeEventListener('pointermove', this.onPointerMove);
		this.cancelMomentumScroll();
	}

	onTouchStart(event: TouchEvent): void {
		const touch = event.touches[0];

		if (!touch) {
			return;
		}

		this.beginDrag(touch.clientX, 'touch');
	}

	onTouchMove(event: TouchEvent): void {
		const touch = event.touches[0];

		if (!touch || this.dragMode !== 'touch') {
			return;
		}

		this.moveDrag(touch.clientX);
	}

	onTouchEnd(): void {
		if (this.dragMode === 'touch') {
			this.endDrag();
		}
	}

	beginDrag(clientX: number, mode: 'pointer' | 'touch'): void {
		this.cancelMomentumScroll();
		this.interact();
		this.isDragging      = true;
		this.dragMode        = mode;
		this.startX          = clientX;
		this.startIndex      = this.selectedIndex;
		this.lastDragClientX = clientX;
		this.lastDragAt      = performance.now();
		this.dragOffset      = 0;
		this.dragVelocity    = 0;
	}

	moveDrag(clientX: number): void {
		if (!this.isDragging) {
			return;
		}

		this.interact();
		this.updateDragVelocity(clientX);
		this.applyDragOffset(clientX - this.startX);
	}

	updateDragVelocity(clientX: number): void {
		const now       = performance.now();
		const elapsedMs = Math.max(1, now - this.lastDragAt);
		const velocity  = (clientX - this.lastDragClientX) / elapsedMs;

		this.dragVelocity    = this.dragVelocity * 0.25 + velocity * 0.75;
		this.lastDragClientX = clientX;
		this.lastDragAt      = now;
	}

	applyDragOffset(offset: number): void {
		const delta = this.clamp(offset, this.minimumDragOffset, this.maximumDragOffset);

		this.dragOffset = delta;
		const nextIndex = this.clamp(Math.round(this.startIndex - delta / this.itemSpacing), 0, this.values.length - 1);

		if (nextIndex !== this.selectedIndex) {
			this.updateModelValue(this.values[nextIndex]);
			navigator.vibrate?.(8);
		}
	}

	endDrag(): void {
		const velocity = this.dragVelocity;

		this.isDragging   = false;
		this.dragMode     = null;
		this.dragVelocity = 0;

		if (Math.abs(velocity) < 0.18) {
			this.dragOffset = 0;
			return;
		}

		this.startMomentumScroll(velocity);
	}

	startMomentumScroll(velocity: number): void {
		const startOffset  = this.dragOffset;
		const targetOffset = this.clamp(
			startOffset + velocity * this.momentumProjectionMs,
			this.minimumDragOffset,
			this.maximumDragOffset
		);
		const distance = Math.abs(targetOffset - startOffset);

		if (distance < 1) {
			this.dragOffset = 0;
			return;
		}

		const startedAt = performance.now();
		const duration  = this.clamp(
			140 + (distance / this.itemSpacing) * 42,
			140,
			this.momentumDurationMs
		);

		this.isMomentumScrolling = true;
		const animate            = (now: number): void => {
			const progress = this.clamp((now - startedAt) / duration, 0, 1);
			const eased    = 1 - Math.pow(1 - progress, 3);

			this.applyDragOffset(startOffset + (targetOffset - startOffset) * eased);

			if (progress < 1) {
				this.momentumFrame = requestAnimationFrame(animate);
				return;
			}

			this.isMomentumScrolling = false;
			this.dragOffset          = 0;
			this.momentumFrame       = 0;
		};

		this.momentumFrame = requestAnimationFrame(animate);
	}

	cancelMomentumScroll(): void {
		if (this.momentumFrame !== 0) {
			cancelAnimationFrame(this.momentumFrame);
		}

		this.isMomentumScrolling = false;
		this.momentumFrame       = 0;
		this.dragOffset          = 0;
	}

	@Emit('update:modelValue')
	updateModelValue(value: number): number {
		return value;
	}

	@Emit('interact')
	interact(): void {}

	clamp(value: number, minimum: number, maximum: number): number {
		return Math.min(Math.max(value, minimum), maximum);
	}

}

type ValueFormatter = (value: number) => string;

interface VisibleItem {
	index: number;
	label: string;
	offset: number;
	visualDistance: number;
	style: {
		color: string | undefined;
		opacity: number;
		transform: string;
	};
	value: number;
}

export default toNative(DialSelector);
</script>

<style scoped>
.dial-selector {
	position: relative;
	height: 72px;
	overflow: hidden;
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	touch-action: none;
	user-select: none;
	-webkit-user-select: none;
}

.dial-selector::after {
	position: absolute;
	top: 11px;
	left: 50%;
	width: var(--dial-selector-center-width);
	height: 50px;
	border: 2px solid color-mix(in srgb, var(--text), transparent 72%);
	border-radius: 999px;
	content: "";
	transform: translateX(-50%);
}

.dial-selector__mask {
	position: absolute;
	inset: 0;
	mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
	-webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 22%, #000 78%, transparent 100%);
}

.dial-selector__item {
	position: absolute;
	min-width: 88px;
	font-family: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, monospace;
	font-size: var(--font-size-display);
	font-weight: 700;
	transition:
		transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
		opacity 180ms ease;
	will-change: transform, opacity;
}

.dial-selector__item--center {
	z-index: 2;
	width: var(--dial-selector-center-width);
	height: 50px;
	border-radius: 999px;
	background: var(--tertiary-grouped-bg);
}
</style>
