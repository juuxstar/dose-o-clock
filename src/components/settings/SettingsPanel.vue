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
					@click="page = 'main'"
				>
					<ChevronLeft :size="26" />
				</button>
				<span v-else class="settings-header__spacer" />
				<h2 class="u-text-center">
					{{ title }}
				</h2>
				<span class="settings-header__spacer" />
			</header>

			<Transition :name="transitionName" mode="out-in">
				<div v-if="page === 'main'" key="main" class="settings-page u-grid u-gap-12">
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100" type="button" @click="openPage('dosage')">
						<span>Dosage Defaults</span>
						<strong>{{ formatDosage(store.defaultUnitHundredths.value) }} ml</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100" type="button" @click="openPage('graphics')">
						<span>Graphics</span>
						<strong>{{ graphicsLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100" type="button" @click="openPage('install')">
						<span>Add to Home Screen</span>
						<strong>{{ installLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100"
						type="button"
						@click="openPage('notifications')"
					>
						<span>Notifications</span>
						<strong>{{ notificationLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100" type="button" @click="openPage('share')">
						<span>Share</span>
						<strong>QR Code</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
					<button
						class="settings-row u-grid u-items-center u-gap-8 u-text-left u-width-100"
						:class="{ 'settings-row--available' : versionUpdateStatus === 'available' }"
						type="button"
						@click="openPage('version')"
					>
						<span>Version Update</span>
						<strong>{{ versionUpdateLabel }}</strong>
						<ChevronRight :size="20" aria-hidden="true" />
					</button>
				</div>

				<DosagePage v-else-if="page === 'dosage'" key="dosage" @interact="$emit('interact')" />

				<GraphicsPage v-else-if="page === 'graphics'" key="graphics" />

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
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { markRaw }                   from 'vue';
import { Component, Emit, Prop, toNative, Vue, Watch } from 'vue-facing-decorator';

import DosagePage        from '@/components/settings/DosagePage.vue';
import GraphicsPage      from '@/components/settings/GraphicsPage.vue';
import InstallPage       from '@/components/settings/InstallPage.vue';
import NotificationsPage from '@/components/settings/NotificationsPage.vue';
import SharePage         from '@/components/settings/SharePage.vue';
import VersionUpdatePage from '@/components/settings/VersionUpdatePage.vue';
import PanelShell        from '@/components/widgets/PanelShell.vue';
import { Dosage }        from '@/domain/Dosage';
import { SessionNotification, type SessionNotificationStatus } from '@/domain/SessionNotification';
import { checkVersionUpdate, type VersionUpdateStatus }        from '@/pwa';
import { useTimerStore } from '@/store/useTimerStore';

/**
 * Owns the settings flows for defaults, graphics, install status, and app sharing.
 */
@Component({
	components : {
		ChevronLeft,
		ChevronRight,
		DosagePage,
		GraphicsPage,
		InstallPage,
		NotificationsPage,
		PanelShell,
		SharePage,
		VersionUpdatePage,
	},
	emits : [ 'close', 'interact' ],
})
class SettingsPanel extends Vue {

	@Prop({ type : Boolean, required : true })
	readonly open!: boolean;

	store           = markRaw(useTimerStore());
	page: Page      = 'main';
	transitionName  = 'settings-forward';
	formatDosage    = Dosage.format;

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
			dosage        : 'Dosage',
			graphics      : 'Graphics',
			install       : 'Add to Home Screen',
			main          : 'Settings',
			notifications : 'Notifications',
			share         : 'Sharing is Caring',
			version       : 'Version Update',
		}[this.page];
	}

	get graphicsLabel(): string {
		return this.timerPositionLabel;
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
			this.page = 'main';
			this.refreshStandaloneState();
			this.refreshNotificationStatus();
			void this.refreshOfflineState();
			void this.refreshVersionUpdateStatus();
		}
	}

	@Emit('close')
	close(): void {}

	@Emit('interact')
	interact(): void {}

	async refreshVersionUpdateStatus(): Promise<void> {
		const updateCheck        = await checkVersionUpdate();
		this.versionUpdateStatus = updateCheck.status;
	}

	setVersionUpdateStatus(status: VersionUpdateStatus): void {
		this.versionUpdateStatus = status;
	}

	openPage(nextPage: Page): void {
		this.transitionName = 'settings-forward';
		this.page           = nextPage;

		if (nextPage === 'install') {
			void this.refreshOfflineState();
		}

		if (nextPage === 'notifications') {
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

type Page = 'main' | SettingsPageName;

type SettingsPageName = 'dosage' | 'graphics' | 'install' | 'notifications' | 'share' | 'version';

export default toNative(SettingsPanel);
</script>

<style scoped>
.settings-header {
	grid-template-columns: 44px 1fr 44px;
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
	border-radius: 8px;
	background: transparent;
}

.settings-header__spacer {
	width: 44px;
}

.settings-row {
	min-height: 54px;
	grid-template-columns: 1fr auto 20px;
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
