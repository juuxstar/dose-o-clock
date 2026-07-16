<template>
	<PanelShell
		:open="open"
		size="tall"
		@close="$emit('close')"
		@interact="$emit('interact')"
	>
		<div class="panel-content">
			<header class="settings-header u-grid u-items-center">
				<button
					v-if="page !== 'main'"
					class="icon-only u-grid u-place-center"
					type="button"
					aria-label="Back"
					@click="goBack"
				>
					<ChevronLeft :size="26" />
				</button>
				<span v-else class="settings-header__spacer" />
				<h2 class="u-text-center">
					{{ title }}
				</h2>
				<button
					v-if="setupMode"
					class="wizard-next-button"
					type="button"
					@click="advanceSetup"
				>
					{{ setupNextLabel }}
				</button>
				<span v-else class="settings-header__spacer" />
			</header>
			<p v-if="setupMode && setupStepDescription" class="setup-step-description u-text-center">
				{{ setupStepDescription }}
			</p>

			<Transition :name="transitionName" mode="out-in">
				<div v-if="page === 'main'" key="main" class="settings-page u-grid u-gap-12">
					<button
						v-if="!setupComplete"
						class="settings-row settings-row--navigation u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="startSetup"
					>
						<CircleHelp :size="22" aria-hidden="true" />
						<span>Getting Started</span>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row settings-row--navigation u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="openPage('dosage')"
					>
						<SlidersHorizontal :size="22" aria-hidden="true" />
						<span>Dosage Setup</span>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row settings-row--navigation u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="openPage('app')"
					>
						<Smartphone :size="22" aria-hidden="true" />
						<span>App Setup</span>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row settings-row--navigation u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="openPage('display')"
					>
						<Palette :size="22" aria-hidden="true" />
						<span>Display</span>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row settings-row--navigation u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="openPage('share')"
					>
						<Share2 :size="22" aria-hidden="true" />
						<span>Share with a friend</span>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						v-if="isDevelopmentMode"
						class="settings-row settings-row--navigation u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="openPage('devTools')"
					>
						<Wrench :size="22" aria-hidden="true" />
						<span>Dev Tools</span>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
				</div>

				<div v-else-if="page === 'app'" key="app" class="settings-page u-grid u-gap-12">
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100" type="button" @click="openPage('install')">
						<Home :size="22" aria-hidden="true" />
						<span>Add to Home Screen</span>
						<strong>{{ installLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="openPage('notifications')"
					>
						<Bell :size="22" aria-hidden="true" />
						<span>Notifications</span>
						<strong>{{ notificationLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100"
						:class="{ 'settings-row--available' : versionUpdateStatus === 'available' }"
						type="button"
						@click="openPage('version')"
					>
						<RefreshCw :size="22" aria-hidden="true" />
						<span>Version Update</span>
						<strong>{{ versionUpdateLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						v-if="setupComplete"
						class="settings-row settings-row--navigation u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="startSetup"
					>
						<CircleHelp :size="22" aria-hidden="true" />
						<span>Getting Started</span>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
				</div>

				<DisplayGuidePage v-else-if="page === 'displayGuide'" key="displayGuide" />

				<TimerRingGuidePage v-else-if="page === 'timer'" key="timer" />

				<GraphicsPage v-else-if="page === 'display'" key="display" />

				<DosagePage v-else-if="page === 'dosage'" key="dosage" @interact="$emit('interact')" />

				<InstallPage
					v-else-if="page === 'install'"
					key="install"
					:can-prompt-install="canPromptInstall"
					:is-standalone="isStandalone"
					:offline-check-complete="offlineCheckComplete"
					:offline-ready="offlineReady"
					:offline-status-detail="offlineStatusDetail"
					@install="installApp"
				/>

				<NotificationsPage
					v-else-if="page === 'notifications'"
					key="notifications"
					:notification-status="notificationStatus"
					@interact="$emit('interact')"
					@status-change="setNotificationStatus"
				/>

				<SharePage v-else-if="page === 'share'" key="share" />

				<DevToolsPage v-else-if="page === 'devTools'" key="devTools" @interact="$emit('interact')" />

				<VersionUpdatePage
					v-else
					key="version"
					:initial-version-update-status="versionUpdateStatus"
					@interact="$emit('interact')"
					@status-change="setVersionUpdateStatus"
				/>
			</Transition>
		</div>
	</PanelShell>
</template>

<script lang="ts">
import { Bell, ChevronLeft, ChevronRight, CircleHelp, Home, Palette, RefreshCw, Share2, SlidersHorizontal, Smartphone, Wrench } from '@lucide/vue';
import { markRaw } from 'vue';
import { Component, Emit, Prop, toNative, Vue, Watch } from 'vue-facing-decorator';

import DevToolsPage          from '@/components/settings/DevToolsPage.vue';
import DisplayGuidePage      from '@/components/settings/DisplayGuidePage.vue';
import DosagePage            from '@/components/settings/DosagePage.vue';
import GraphicsPage          from '@/components/settings/GraphicsPage.vue';
import InstallPage           from '@/components/settings/InstallPage.vue';
import NotificationsPage     from '@/components/settings/NotificationsPage.vue';
import SharePage             from '@/components/settings/SharePage.vue';
import TimerRingGuidePage    from '@/components/settings/TimerRingGuidePage.vue';
import VersionUpdatePage     from '@/components/settings/VersionUpdatePage.vue';
import PanelShell            from '@/components/widgets/PanelShell.vue';
import { isDevelopmentMode } from '@/domain/AppEnvironment';
import { Dosage }            from '@/domain/Dosage';
import { SessionNotification, type SessionNotificationStatus } from '@/domain/SessionNotification';
import { checkVersionUpdate, type VersionUpdateStatus }        from '@/pwa';
import { useTimerStore }     from '@/store/useTimerStore';

/**
 * Owns the settings flows for defaults, graphics, install status, and app sharing.
 */
@Component({
	components : {
		Bell,
		ChevronLeft,
		ChevronRight,
		CircleHelp,
		DevToolsPage,
		DisplayGuidePage,
		DosagePage,
		GraphicsPage,
		Home,
		InstallPage,
		NotificationsPage,
		Palette,
		PanelShell,
		RefreshCw,
		SharePage,
		Share2,
		SlidersHorizontal,
		Smartphone,
		TimerRingGuidePage,
		VersionUpdatePage,
		Wrench,
	},
	emits : [ 'close', 'interact', 'setup-mode-change' ],
})
class SettingsPanel extends Vue {

	@Prop({ type : Boolean, required : true })
	readonly open!: boolean;

	@Prop({ type : String, default : null })
	readonly initialPage!: SettingsInitialPage | null;

	@Prop({ type : Boolean, default : false })
	readonly initialSetupMode!: boolean;

	store           = markRaw(useTimerStore());
	page: Page      = 'main';
	setupMode       = false;
	setupComplete   = false;
	transitionName  = 'settings-forward';
	formatDosage    = Dosage.format;
	isDevelopmentMode = isDevelopmentMode;

	deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
	isStandalone         = false;
	offlineReady         = false;
	offlineCheckComplete = false;
	offlineStatusDetail  = '';
	versionUpdateStatus: VersionUpdateStatus = 'unknown';
	notificationStatus: SessionNotificationStatus = SessionNotification.status();

	get title(): string {
		return {
			// Mapping page names to titles
			app           : 'App Setup',
			devTools      : 'Dev Tools',
			displayGuide  : 'Display Options',
			display       : 'Display',
			dosage        : 'Dosage',
			install       : 'Add to Home Screen',
			main          : 'Settings',
			notifications : 'Notifications',
			share         : 'Sharing is Caring',
			timer         : 'Timer Ring',
			version       : 'Version Update',
		}[this.page];
	}

	get setupNextLabel(): string {
		return this.isLastSetupStep ? 'Done' : 'Next';
	}

	get setupStepDescription(): string {
		return setupStepDescriptions[this.page as SetupPage] ?? '';
	}

	get isLastSetupStep(): boolean {
		return this.setupStepIndex === setupPages.length - 1;
	}

	get setupStepIndex(): number {
		return setupPages.indexOf(this.page as SetupPage);
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

	get versionUpdateLabel(): string {
		if (this.versionUpdateStatus === 'available') {
			return 'Available';
		}
		if (this.versionUpdateStatus === 'up-to-date') {
			return 'Up-to-Date';
		}
		return 'Unknown';
	}

	get notificationLabel(): string {
		return { blocked : 'Blocked', off : 'Off', on : 'On', unavailable : 'Unavailable' }[this.notificationStatus];
	}

	mounted(): void {
		this.refreshStandaloneState();
		this.refreshNotificationStatus();
		void this.refreshOfflineState();
		void this.refreshVersionUpdateStatus();
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
			this.setupComplete = localStorage.getItem(setupCompleteKey) === 'true';
			this.setupMode     = this.initialSetupMode;
			this.page          = this.initialSetupMode ? setupPages[0] : this.initialPage ?? 'main';
			this.refreshStandaloneState();
			this.refreshNotificationStatus();
			void this.refreshOfflineState();
			void this.refreshVersionUpdateStatus();
		}
	}

	@Watch('initialPage')
	onInitialPageChanged(initialPage: SettingsInitialPage | null): void {
		if (this.open && initialPage) {
			this.setupMode = this.initialSetupMode;
			this.page      = initialPage;
		}
	}

	@Watch('setupMode')
	onSetupModeChanged(setupMode: boolean): void {
		this.setupModeChange(setupMode);
	}

	@Emit('close')
	close(): void {}

	@Emit('interact')
	interact(): void {}

	@Emit('setup-mode-change')
	setupModeChange(setupMode: boolean): boolean {
		return setupMode;
	}

	async refreshVersionUpdateStatus(): Promise<void> {
		const updateCheck        = await checkVersionUpdate();
		this.versionUpdateStatus = updateCheck.status;
	}

	setVersionUpdateStatus(status: VersionUpdateStatus): void {
		this.versionUpdateStatus = status;
	}

	goBack(): void {
		if (this.setupMode) {
			this.goToPreviousSetupStep();
			return;
		}

		this.transitionName = 'settings-forward';
		this.page           = parentPageByPage[this.page] ?? 'main';
	}

	openPage(nextPage: Page): void {
		if (!this.setupMode || !isSetupPage(nextPage)) {
			this.setupMode = false;
		}

		this.transitionName = 'settings-forward';
		this.page           = nextPage;

		this.refreshPageState(nextPage);
	}

	startSetup(): void {
		this.setupMode      = true;
		this.transitionName = 'settings-forward';
		this.page           = setupPages[0];
		this.refreshPageState(this.page);
	}

	advanceSetup(): void {
		const nextIndex = this.setupStepIndex + 1;
		if (nextIndex >= setupPages.length) {
			this.finishSetup();
			return;
		}

		this.transitionName = 'settings-forward';
		this.page           = setupPages[nextIndex];
		this.refreshPageState(this.page);
	}

	goToPreviousSetupStep(): void {
		const previousIndex = this.setupStepIndex - 1;
		if (previousIndex < 0) {
			this.cancelSetup();
			return;
		}

		this.transitionName = 'settings-forward';
		this.page           = setupPages[previousIndex];
		this.refreshPageState(this.page);
	}

	cancelSetup(): void {
		this.setupMode      = false;
		this.transitionName = 'settings-forward';
		this.page           = 'main';
	}

	finishSetup(): void {
		localStorage.setItem(setupCompleteKey, 'true');
		this.setupComplete = true;
		this.cancelSetup();
	}

	refreshPageState(page: Page): void {
		if (page === 'install') {
			void this.refreshOfflineState();
		}

		if (page === 'notifications') {
			this.refreshNotificationStatus();
		}
	}

	refreshNotificationStatus(): void {
		this.notificationStatus = SessionNotification.status();
	}

	setNotificationStatus(status: SessionNotificationStatus): void {
		this.notificationStatus = status;
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

type Page = 'main' | SettingsGroupPageName | SettingsPageName;

type SettingsInitialPage = SetupPage;

type SettingsGroupPageName = 'app' | 'display';

type SettingsPageName = 'devTools' | 'displayGuide' | 'dosage' | 'install' | 'notifications' | 'share' | 'timer' | 'version';

type SetupPage = 'displayGuide' | 'dosage' | 'install' | 'notifications' | 'timer';

const setupPages: SetupPage[] = [ 'dosage', 'timer', 'install', 'notifications', 'displayGuide' ];

const setupStepDescriptions: Record<SetupPage, string> = {
	displayGuide  : '',
	dosage        : 'Choose the default dose options you want ready each time you start a new timer.',
	install       : 'Add Dose-o-clock to your Home Screen so it opens like an app and is easier to find.',
	notifications : 'Set up completion alerts so the app can let you know when a timer finishes.',
	timer         : 'After adding a new timer, the timer ring changes from a fresh start through completion and overtime.',
};

const setupCompleteKey = 'dose-o-clock.setup-complete';

const parentPageByPage: Partial<Record<Page, Page>> = {
	app           : 'main',
	devTools      : 'main',
	display       : 'main',
	displayGuide  : 'main',
	dosage        : 'main',
	install       : 'app',
	notifications : 'app',
	share         : 'main',
	timer         : 'main',
	version       : 'app',
};

function isSetupPage(page: Page): page is SetupPage {
	return setupPages.includes(page as SetupPage);
}

export default toNative(SettingsPanel);
</script>

<style scoped>
.settings-header {
	grid-template-columns: 64px 1fr 64px;
	margin-bottom: 14px;
}

.settings-header h2 {
	margin: 0 0 10px;
	font-size: var(--font-size-title);
	font-weight: 700;
}

.icon-only {
	width: 44px;
	height: 38px;
	border-radius: var(--radius-control);
	background: transparent;
}

.settings-header__spacer {
	width: 64px;
}

.setup-step-description {
	margin: -4px 8px 14px;
	color: var(--muted-text);
	font-size: var(--font-size-body);
	line-height: 1.35;
}

.wizard-next-button {
	min-height: 38px;
	border-radius: var(--radius-control);
	background: transparent;
	color: var(--blue);
	font-weight: 800;
}

.settings-row {
	min-height: 54px;
	grid-template-columns: 28px 1fr auto 20px;
	border-radius: var(--radius-control);
	background: var(--tertiary-grouped-bg);
	padding: 0 14px;
}

.settings-row--navigation {
	grid-template-columns: 28px 1fr 20px;
}

.settings-row strong {
	color: var(--muted-text);
}

.settings-row svg {
	color: var(--blue);
}

.settings-row--available strong {
	color: var(--green);
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
