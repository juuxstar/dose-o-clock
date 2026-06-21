<template>
	<PanelShell :open="open" @close="$emit('close')" @interact="$emit('interact')">
		<div class="panel-content">
			<header class="settings-header u-grid u-items-center">
				<button
					v-if="page !== 'main'"
					class="icon-only u-grid u-place-center"
					type="button"
					aria-label="Back"
					@click="page = 'main'"
				>
					<ChevronLeft :size="26" />
				</button>
				<span v-else class="settings-header__spacer" />
				<h2 class="u-text-center">
					{{ title }}
				</h2>
				<button
					class="settings-refresh-button u-grid u-place-center"
					type="button"
					aria-label="Refresh app"
					:disabled="refreshingApp"
					@click.stop="refreshApp"
				>
					<RefreshCw :size="20" />
				</button>
			</header>

			<Transition :name="transitionName" mode="out-in">
				<div v-if="page === 'main'" key="main" class="settings-page u-grid u-gap-12">
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left" type="button" @click="openPage('dosage')">
						<span>Dosage</span>
						<strong>{{ formatDosage(store.defaultUnitHundredths.value) }} ml</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left" type="button" @click="openPage('graphics')">
						<span>Graphics</span>
						<strong>{{ graphicsLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left" type="button" @click="openPage('install')">
						<span>Add to Home Screen</span>
						<strong>{{ installLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
				</div>

				<div v-else-if="page === 'dosage'" key="dosage" class="settings-page u-grid u-gap-12">
					<section class="panel-section">
						<h3 class="u-text-center">
							Default Dosage (ml)
						</h3>
						<DialSelector
							:model-value="store.defaultUnitHundredths.value"
							:values="store.dosageValues.value"
							:format="formatDosage"
							@update:model-value="store.setDefaultDosage"
							@interact="$emit('interact')"
						/>
					</section>
					<section class="panel-section">
						<h3 class="u-text-center">
							Max Dosage (ml)
						</h3>
						<DialSelector
							:model-value="store.maxUnitHundredths.value"
							:values="store.maxDosageValues.value"
							:format="formatDosage"
							@update:model-value="store.setMaxDosage"
							@interact="$emit('interact')"
						/>
					</section>
					<section class="panel-section">
						<h3 class="u-text-center">
							Dosage Increment
						</h3>
						<DialSelector
							:model-value="store.dosageIncrementHundredths.value"
							:values="incrementValues"
							:format="formatDosage"
							@update:model-value="store.setDosageIncrement"
							@interact="$emit('interact')"
						/>
					</section>
				</div>

				<div v-else-if="page === 'graphics'" key="graphics" class="settings-page u-grid u-gap-12">
					<label class="field-label">Dot Colour Style</label>
					<div class="segmented u-grid u-gap-4" role="group" aria-label="Dot Colour Style">
						<button
							type="button"
							:class="{ active : store.dotColorStyle.value === 'solid' }"
							@click="store.setDotColorStyle('solid')"
						>
							Solid
						</button>
						<button
							type="button"
							:class="{ active : store.dotColorStyle.value === 'gradient' }"
							@click="store.setDotColorStyle('gradient')"
						>
							Gradient
						</button>
					</div>
					<label class="field-label">Timer Position</label>
					<div class="segmented u-grid u-gap-4" role="group" aria-label="Timer Position">
						<button
							type="button"
							:class="{ active : store.timerPosition.value === 'top' }"
							@click="store.setTimerPosition('top')"
						>
							Top
						</button>
						<button
							type="button"
							:class="{ active : store.timerPosition.value === 'center' }"
							@click="store.setTimerPosition('center')"
						>
							Center
						</button>
					</div>
				</div>

				<div v-else key="install" class="settings-page install-page u-grid u-gap-12 u-content-center">
					<div class="capability-status u-grid u-items-center u-gap-12 u-text-left" :class="{ 'capability-status--ready' : offlineReady }">
						<CheckCircle2 v-if="offlineReady" :size="28" aria-hidden="true" />
						<XCircle v-else :size="28" aria-hidden="true" />
						<div>
							<strong>{{ offlineStatusLabel }}</strong>
							<p>{{ offlineStatusDescription }}</p>
						</div>
					</div>
					<div class="capability-status u-grid u-items-center u-gap-12 u-text-left" :class="{ 'capability-status--ready' : isStandalone }">
						<CheckCircle2 v-if="isStandalone" :size="28" aria-hidden="true" />
						<XCircle v-else :size="28" aria-hidden="true" />
						<div>
							<strong>{{ homeScreenStatusLabel }}</strong>
							<p>{{ homeScreenStatusDescription }}</p>
						</div>
					</div>
					<div v-if="!isStandalone" class="install-actions u-grid u-gap-14 u-justify-items-center u-text-center">
						<button
							class="primary-button primary-button--green u-flex u-items-center u-justify-center u-gap-8"
							type="button"
							:disabled="!canPromptInstall"
							@click="installApp"
						>
							<Plus :size="20" />
							Add to Home Screen
						</button>
						<p v-if="canPromptInstall">
							Use this to install Dose-o-clock as a standalone app.
						</p>
						<p v-else>
							Use your browser share menu, then choose Add to Home Screen.
						</p>
					</div>
				</div>
			</Transition>
			<p v-if="page === 'main'" class="settings-build-stamp u-text-center">
				Build {{ buildStamp }}
			</p>
		</div>
	</PanelShell>
</template>

<script lang="ts">
import { CheckCircle2, ChevronLeft, ChevronRight, Plus, RefreshCw, XCircle } from '@lucide/vue';
import { markRaw } from 'vue';
import { Component, Emit, Prop, toNative, Vue, Watch }                       from 'vue-facing-decorator';

import DialSelector      from '@/components/DialSelector.vue';
import PanelShell        from '@/components/PanelShell.vue';
import { formatDosage, SUPPORTED_INCREMENT_HUNDREDTHS } from '@/domain/dosage';
import { refreshPwa }    from '@/pwa';
import { useTimerStore } from '@/store/useTimerStore';

type Page = 'main' | 'dosage' | 'graphics' | 'install';

@Component({
	components : { CheckCircle2, ChevronLeft, ChevronRight, DialSelector, PanelShell, Plus, RefreshCw, XCircle },
	emits      : [ 'close', 'interact' ],
})
class SettingsPanel extends Vue {

	@Prop({ type : Boolean, required : true })
	readonly open!: boolean;

	store           = markRaw(useTimerStore());
	page: Page      = 'main';
	transitionName  = 'settings-forward';
	incrementValues = [ ...SUPPORTED_INCREMENT_HUNDREDTHS ];
	formatDosage    = formatDosage;

	deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
	isStandalone         = false;
	offlineReady         = false;
	offlineCheckComplete = false;
	offlineStatusDetail  = '';
	refreshingApp        = false;

	get title(): string {
		return {
			// Mapping page names to titles
			dosage   : 'Dosage',
			graphics : 'Graphics',
			install  : 'Add to Home Screen',
			main     : 'Settings',
		}[this.page];
	}

	get graphicsLabel(): string {
		return `${this.colorStyleLabel}, ${this.timerPositionLabel}`;
	}

	get colorStyleLabel(): string {
		return this.store.dotColorStyle.value === 'solid' ? 'Solid' : 'Gradient';
	}

	get timerPositionLabel(): string {
		return this.store.timerPosition.value === 'center' ? 'Center' : 'Top';
	}

	get canPromptInstall(): boolean {
		return this.deferredInstallPrompt !== null;
	}

	get installLabel(): string {
		if (this.isStandalone) {
			return 'Installed';
		}
		if (this.offlineReady) {
			return 'Offline Ready';
		}
		return this.canPromptInstall ? 'Install Ready' : 'Manual';
	}

	get offlineStatusLabel(): string {
		if (!this.offlineCheckComplete) {
			return 'Checking offline capability';
		}
		return this.offlineReady ? 'Offline capable' : 'Offline unavailable';
	}

	get offlineStatusDescription(): string {
		if (!this.offlineCheckComplete) {
			return 'Checking for cached app files.';
		}
		if (this.offlineReady) {
			return 'Can launch without the server after first load.';
		}
		return this.offlineStatusDetail || 'Load the production app online once.';
	}

	get homeScreenStatusLabel(): string {
		return this.isStandalone ? 'Added to Home Screen' : 'Not added to Home Screen';
	}

	get homeScreenStatusDescription(): string {
		return this.isStandalone ? 'Running as a standalone app.' : 'Use Add to Home Screen to enable app mode.';
	}

	get buildStamp(): string {
		return new Intl.DateTimeFormat(undefined, { dateStyle : 'medium', timeStyle : 'short' })
			.format(new Date(import.meta.env.VITE_BUILD_TIMESTAMP));
	}

	mounted(): void {
		this.refreshStandaloneState();
		void this.refreshOfflineState();
		window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt as EventListener);
		window.addEventListener('appinstalled', this.onAppInstalled);
	}

	beforeUnmount(): void {
		window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt as EventListener);
		window.removeEventListener('appinstalled', this.onAppInstalled);
	}

	@Watch('open')
	onOpenChanged(open: boolean): void {
		if (open) {
			this.page = 'main';
			this.refreshStandaloneState();
			void this.refreshOfflineState();
		}
	}

	@Emit('close')
	close(): void {}

	@Emit('interact')
	interact(): void {}

	async refreshApp(): Promise<void> {
		if (this.refreshingApp) {
			return;
		}

		this.refreshingApp = true;
		this.interact();
		await refreshPwa();
	}

	openPage(nextPage: Page): void {
		this.transitionName = 'settings-forward';
		this.page           = nextPage;

		if (nextPage === 'install') {
			void this.refreshOfflineState();
		}
	}

	onBeforeInstallPrompt(event: BeforeInstallPromptEvent): void {
		event.preventDefault();
		this.deferredInstallPrompt = markRaw(event);
	}

	onAppInstalled = (): void => {
		this.deferredInstallPrompt = null;
		this.isStandalone          = true;
	};

	async installApp(): Promise<void> {
		if (!this.deferredInstallPrompt) {
			return;
		}

		const prompt               = this.deferredInstallPrompt;
		this.deferredInstallPrompt = null;
		await prompt.prompt();
		await prompt.userChoice;
		this.refreshStandaloneState();
		await this.refreshOfflineState();
	}

	refreshStandaloneState(): void {
		this.isStandalone = window.matchMedia('(display-mode: standalone)').matches
			|| Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
	}

	async refreshOfflineState(): Promise<void> {
		this.offlineCheckComplete = false;
		const status              = await this.getOfflineStatus();
		this.offlineReady         = status.ready;
		this.offlineStatusDetail  = status.detail;
		this.offlineCheckComplete = true;
	}

	async getOfflineStatus(): Promise<{ detail: string; ready: boolean }> {
		if (!window.isSecureContext) {
			return { ready : false, detail : 'Offline mode requires HTTPS or localhost. This page is not a secure context.' };
		}

		if (!('serviceWorker' in navigator)) {
			return { ready : false, detail : 'Service workers are unavailable in this browser.' };
		}

		if (!('caches' in window)) {
			return { ready : false, detail : 'Service workers or Cache Storage are unavailable in this browser.' };
		}

		const registration = await this.waitForServiceWorkerReady();

		if (!registration || (!registration.active && !navigator.serviceWorker.controller)) {
			return { ready : false, detail : 'No active service worker yet.' };
		}

		const cacheKeys = await caches.keys();
		if (cacheKeys.length === 0) {
			return { ready : false, detail : 'No app caches found yet.' };
		}

		const cachedUrls  = await this.getCachedUrls(cacheKeys);
		const hasHtml     = cachedUrls.some(url => url.endsWith('/index.html'));
		const hasManifest = cachedUrls.some(url => url.endsWith('/manifest.webmanifest'));
		const hasScript   = cachedUrls.some(url => /\/assets\/.+\.js$/.test(url));
		const hasStyle    = cachedUrls.some(url => /\/assets\/.+\.css$/.test(url));
		const ready       = hasHtml && hasManifest && hasScript && hasStyle;
		const shellStatus = hasHtml && hasManifest ? 'yes' : 'no';
		const assetStatus = hasScript && hasStyle ? 'yes' : 'no';

		return {
			ready,
			detail : `SW ${registration.active?.state ?? 'controller'}; caches ${cacheKeys.length}; shell ${shellStatus}; assets ${assetStatus}.`,
		};
	}

	async waitForServiceWorkerReady(): Promise<ServiceWorkerRegistration | undefined> {
		const registration = await navigator.serviceWorker.getRegistration();

		if (registration?.active || navigator.serviceWorker.controller) {
			return registration;
		}

		return Promise.race([
			navigator.serviceWorker.ready,
			new Promise<undefined>(resolve => window.setTimeout(resolve, 2500)),
		]);
	}

	async getCachedUrls(cacheKeys: string[]): Promise<string[]> {
		const requests = await Promise.all(cacheKeys.map(async key => (await caches.open(key)).keys()));
		return requests.flat().map(request => new URL(request.url).pathname);
	}

}

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default toNative(SettingsPanel);
</script>

<style scoped>
.settings-header {
	grid-template-columns: 44px 1fr 44px;
	margin-bottom: 14px;
}

.settings-header h2 {
	margin: 0 0 10px;
	font-size: 18px;
	font-weight: 700;
}

.icon-only {
	width: 44px;
	height: 38px;
	border-radius: 8px;
	background: transparent;
}

.settings-header__spacer {
	width: 44px;
}

.settings-refresh-button {
	width: 44px;
	height: 38px;
	border-radius: 8px;
	background: color-mix(in srgb, var(--blue), transparent 86%);
	color: var(--blue);
}

.settings-refresh-button:disabled {
	opacity: 0.35;
}

.settings-build-stamp {
	margin: 14px 0 0;
	color: var(--muted-text);
	font-size: 12px;
	font-weight: 700;
}

.settings-row {
	min-height: 54px;
	grid-template-columns: 1fr auto 20px;
	width: 100%;
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 0 14px;
}

.settings-row strong {
	color: var(--muted-text);
}

.settings-row svg {
	color: var(--muted-text);
}

.install-page {
	min-height: 210px;
}

.capability-status {
	grid-template-columns: 32px 1fr;
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 12px;
}

.capability-status svg {
	color: var(--red);
}

.capability-status--ready svg {
	color: var(--green);
}

.capability-status strong {
	display: block;
	margin-bottom: 3px;
}

.capability-status p {
	margin: 0;
	color: var(--muted-text);
	font-size: 13px;
	line-height: 1.3;
}

.install-actions p {
	margin: 0;
	color: var(--muted-text);
	line-height: 1.35;
}

.field-label {
	color: var(--muted-text);
	font-size: 14px;
	font-weight: 700;
}

.segmented {
	grid-template-columns: repeat(2, 1fr);
	border-radius: 8px;
	background: var(--tertiary-grouped-bg);
	padding: 4px;
}

.segmented button {
	min-height: 42px;
	border-radius: 6px;
	background: transparent;
	font-weight: 800;
	color: var(--muted-text);
}

.segmented button.active {
	background: var(--secondary-grouped-bg);
	color: var(--text);
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.settings-forward-enter-active,
.settings-forward-leave-active {
	transition:
		opacity 180ms ease,
		transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.settings-forward-enter-from {
	opacity: 0;
	transform: translateX(26px);
}

.settings-forward-leave-to {
	opacity: 0;
	transform: translateX(-26px);
}
</style>
