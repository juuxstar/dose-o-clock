<template>
	<div class="settings-page share-page u-grid u-gap-14 u-justify-items-center u-text-center">
		<div class="share-qr-wrap" aria-label="QR code for https://dose-o-clock.tovig.ca">
			<svg
				class="share-qr u-width-100"
				viewBox="-4 -4 33 33"
				role="img"
				aria-labelledby="shareQrTitle"
			>
				<title id="shareQrTitle">QR code for {{ shareUrl }}</title>
				<path :d="shareQrPath" fill="currentColor" />
			</svg>
		</div>
		<a
			class="share-url"
			:href="shareUrl"
			target="_blank"
			rel="noopener noreferrer"
		>
			{{ shareUrl }}
		</a>
	</div>
</template>

<script lang="ts">
import { Component, toNative, Vue } from 'vue-facing-decorator';

/**
 * Displays the app share URL and QR code.
 */
@Component
class SharePage extends Vue {

	shareUrl    = 'https://dose-o-clock.tovig.ca';
	shareQrPath = shareQrPath;

}

const shareQrPath = [
	'M0 0h7v1H0zM8 0h1v1H8zM10 0h3v1H10zM14 0h1v1H14zM18 0h7v1H18zM0 1h1v1H0zM6 1h1v1H6zM9 1h2v1H9zM18 1h1v1H18zM24 1h1v1H24z',
	'M0 2h1v1H0zM2 2h3v1H2zM6 2h1v1H6zM10 2h1v1H10zM12 2h4v1H12zM18 2h1v1H18zM20 2h3v1H20zM24 2h1v1H24zM0 3h1v1H0zM2 3h3v1H2z',
	'M6 3h1v1H6zM12 3h2v1H12zM15 3h2v1H15zM18 3h1v1H18zM20 3h3v1H20zM24 3h1v1H24zM0 4h1v1H0zM2 4h3v1H2zM6 4h1v1H6zM9 4h1v1H9z',
	'M14 4h1v1H14zM16 4h1v1H16zM18 4h1v1H18zM20 4h3v1H20zM24 4h1v1H24zM0 5h1v1H0zM6 5h1v1H6zM10 5h2v1H10zM13 5h1v1H13z',
	'M18 5h1v1H18zM24 5h1v1H24zM0 6h7v1H0zM8 6h1v1H8zM10 6h1v1H10zM12 6h1v1H12zM14 6h1v1H14zM16 6h1v1H16zM18 6h7v1H18z',
	'M8 7h1v1H8zM10 7h4v1H10zM15 7h1v1H15zM0 8h2v1H0zM3 8h2v1H3zM6 8h1v1H6zM9 8h2v1H9zM12 8h1v1H12zM14 8h3v1H14zM18 8h1v1H18z',
	'M24 8h1v1H24zM0 9h1v1H0zM2 9h3v1H2zM9 9h1v1H9zM11 9h1v1H11zM13 9h3v1H13zM19 9h5v1H19zM0 10h2v1H0zM6 10h1v1H6z',
	'M10 10h7v1H10zM20 10h2v1H20zM24 10h1v1H24zM3 11h2v1H3zM8 11h3v1H8zM14 11h1v1H14zM19 11h1v1H19zM21 11h4v1H21zM0 12h2v1H0z',
	'M6 12h4v1H6zM12 12h1v1H12zM14 12h1v1H14zM16 12h1v1H16zM18 12h2v1H18zM24 12h1v1H24zM0 13h1v1H0zM4 13h2v1H4zM8 13h2v1H8z',
	'M11 13h2v1H11zM14 13h2v1H14zM17 13h1v1H17zM20 13h1v1H20zM23 13h1v1H23zM0 14h7v1H0zM9 14h2v1H9zM14 14h2v1H14z',
	'M18 14h1v1H18zM20 14h5v1H20zM0 15h1v1H0zM2 15h1v1H2zM4 15h2v1H4zM7 15h1v1H7zM9 15h1v1H9zM11 15h1v1H11zM14 15h2v1H14z',
	'M17 15h1v1H17zM19 15h1v1H19zM21 15h2v1H21zM24 15h1v1H24zM0 16h1v1H0zM2 16h2v1H2zM5 16h4v1H5zM11 16h3v1H11zM16 16h5v1H16z',
	'M22 16h2v1H22zM8 17h2v1H8zM14 17h1v1H14zM16 17h1v1H16zM20 17h1v1H20zM22 17h2v1H22zM0 18h7v1H0zM9 18h3v1H9zM13 18h1v1H13z',
	'M16 18h1v1H16zM18 18h1v1H18zM20 18h1v1H20zM24 18h1v1H24zM0 19h1v1H0zM6 19h1v1H6zM9 19h2v1H9zM12 19h5v1H12zM20 19h1v1H20z',
	'M23 19h2v1H23zM0 20h1v1H0zM2 20h3v1H2zM6 20h1v1H6zM8 20h1v1H8zM11 20h2v1H11zM14 20h7v1H14zM23 20h1v1H23zM0 21h1v1H0z',
	'M2 21h3v1H2zM6 21h1v1H6zM8 21h4v1H8zM13 21h6v1H13zM23 21h2v1H23zM0 22h1v1H0zM2 22h3v1H2zM6 22h1v1H6zM9 22h1v1H9z',
	'M11 22h3v1H11zM16 22h2v1H16zM20 22h5v1H20zM0 23h1v1H0zM6 23h1v1H6zM8 23h1v1H8zM10 23h1v1H10zM14 23h1v1H14zM18 23h3v1H18z',
	'M22 23h3v1H22zM0 24h7v1H0zM8 24h4v1H8zM15 24h2v1H15zM18 24h1v1H18zM21 24h1v1H21zM24 24h1v1H24z',
].join('');

export default toNative(SharePage);
</script>

<style scoped>
.share-page {
	min-height: 260px;
	padding-top: 6px;
}

.share-url {
	max-width: 100%;
	color: var(--text);
	font-size: var(--font-size-title);
	font-weight: 800;
	overflow-wrap: anywhere;
	text-decoration: none;
}

.share-qr-wrap {
	width: min(72vw, 260px);
	aspect-ratio: 1;
	display: grid;
	place-items: center;
	border-radius: 50%;
	background: #ffffff;
	color: #000000;
	padding: 22px;
	box-shadow: 0 1px 8px rgba(0, 0, 0, 0.12);
}

.share-qr {
	display: block;
	height: auto;
	shape-rendering: crispEdges;
}
</style>
