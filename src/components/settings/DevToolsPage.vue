<template>
	<div class="settings-page dev-tools-page u-grid u-gap-12">
		<section class="dev-tools-page__section u-grid u-gap-10">
			<button
				class="primary-button u-flex u-items-center u-justify-center u-gap-8 u-width-100"
				type="button"
				:disabled="loadingLocalServerUrl"
				@click="showLocalServerQr"
			>
				<QrCode :size="20" />
				{{ localServerButtonLabel }}
			</button>
			<div v-if="localServerQrModules.length" class="dev-tools-page__qr-panel u-grid u-gap-10 u-justify-items-center u-text-center">
				<svg
					class="dev-tools-page__qr"
					:aria-label="`QR code for ${localServerUrl}`"
					:viewBox="localServerQrViewBox"
					role="img"
				>
					<rect class="dev-tools-page__qr-bg" :width="localServerQrSize" :height="localServerQrSize" />
					<g v-for="(row, rowIndex) in localServerQrModules" :key="rowIndex">
						<rect
							v-for="(dark, columnIndex) in row"
							v-show="dark"
							:key="columnIndex"
							:x="columnIndex + localServerQrMargin"
							:y="rowIndex + localServerQrMargin"
							width="1"
							height="1"
						/>
					</g>
				</svg>
				<a
					class="dev-tools-page__url"
					:href="localServerUrl"
					target="_blank"
					rel="noopener noreferrer"
				>
					{{ localServerUrl }}
				</a>
			</div>
		</section>

		<button
			class="primary-button primary-button--green u-flex u-items-center u-justify-center u-gap-8 u-width-100"
			type="button"
			:disabled="sending"
			@click="sendSampleExpiryNotification"
		>
			<Send :size="20" />
			{{ sendButtonLabel }}
		</button>
		<p v-if="statusMessage" class="dev-tools-page__status u-margin-0 u-text-center">
			{{ statusMessage }}
		</p>
	</div>
</template>

<script lang="ts">
import { QrCode, Send }             from '@lucide/vue';
import qrcode                       from 'qrcode-generator';
import { Component, toNative, Vue } from 'vue-facing-decorator';

import { SessionNotification } from '@/domain/SessionNotification';

/**
 * Provides development-only actions for testing app integrations.
 */
@Component({ components : { QrCode, Send }, emits : [ 'interact' ] })
class DevToolsPage extends Vue {

	sending = false;
	loadingLocalServerUrl = false;
	localServerUrl = '';
	localServerQrModules: boolean[][] = [];
	localServerQrMargin = localServerQrMargin;
	statusMessage = '';

	get sendButtonLabel(): string {
		return this.sending ? 'Sending...' : 'Send Sample Session Expiry';
	}

	get localServerButtonLabel(): string {
		return this.loadingLocalServerUrl ? 'Loading Local QR...' : 'Show Local Server QR';
	}

	async showLocalServerQr(): Promise<void> {
		this.$emit('interact');
		this.loadingLocalServerUrl = true;
		this.statusMessage         = '';

		try {
			const url = await this.fetchLocalServerUrl();
			const qr  = qrcode(0, 'M');
			qr.addData(url);
			qr.make();

			this.localServerUrl       = url;
			this.localServerQrModules = this.readQrModules(qr);
		}
		catch {
			this.statusMessage = 'Unable to build the local server QR code.';
		}
		finally {
			this.loadingLocalServerUrl = false;
		}
	}

	async sendSampleExpiryNotification(): Promise<void> {
		this.$emit('interact');
		this.sending       = true;
		this.statusMessage = '';

		try {
			await SessionNotification.sendSampleExpiryNotification();
			this.statusMessage = 'Sample notification scheduled for immediate delivery.';
		}
		catch {
			this.statusMessage = 'Unable to send the sample notification.';
		}
		finally {
			this.sending = false;
		}
	}

	async fetchLocalServerUrl(): Promise<string> {
		const response = await fetch('/dev-network-url', { cache : 'no-store' });

		if (!response.ok) {
			throw new Error('Unable to load local server URL');
		}

		const payload = await response.json() as LocalServerUrlResponse;

		if (!payload.url) {
			throw new Error('Missing local server URL');
		}

		return payload.url;
	}

	readQrModules(qr: ReturnType<typeof qrcode>): boolean[][] {
		return Array.from({ length : qr.getModuleCount() }, (_, row) => (
			Array.from({ length : qr.getModuleCount() }, (_, column) => qr.isDark(row, column))
		));
	}

	get localServerQrSize(): number {
		return this.localServerQrModules.length + (this.localServerQrMargin * 2);
	}

	get localServerQrViewBox(): string {
		return `0 0 ${this.localServerQrSize} ${this.localServerQrSize}`;
	}

}

interface LocalServerUrlResponse {
	url?: string;
}

const localServerQrMargin = 3;

export default toNative(DevToolsPage);
</script>

<style scoped>
.dev-tools-page {
	align-content: start;
	min-height: 210px;
}

.dev-tools-page__section {
	align-content: start;
}

.dev-tools-page__status {
	color: var(--muted-text);
	font-size: var(--font-size-sm);
	line-height: 1.3;
}

.dev-tools-page__qr-panel {
	padding: 2px 0 4px;
}

.dev-tools-page__qr {
	width: min(68vw, 220px);
	aspect-ratio: 1;
	border-radius: var(--radius-control);
	background: #ffffff;
	color: #000000;
	padding: 16px;
	box-shadow: 0 1px 8px rgba(0, 0, 0, 0.12);
	display: block;
	shape-rendering: crispEdges;
}

.dev-tools-page__qr-bg {
	fill: #ffffff;
}

.dev-tools-page__url {
	max-width: 100%;
	color: var(--text);
	font-size: var(--font-size-sm);
	font-weight: 700;
	overflow-wrap: anywhere;
	text-decoration: none;
}
</style>
