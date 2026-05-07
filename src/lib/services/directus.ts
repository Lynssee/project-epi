import { createDirectus, rest, staticToken } from '@directus/sdk';

const directus = createDirectus(import.meta.env.VITE_DIRECTUS_API_URL)
	.with(staticToken(import.meta.env.VITE_DIRECTUS_TOKEN))
	.with(rest());

export default directus;

export function handleDirectusError(error: any) {
	// Mencegah error 403 standar sesuai aturan
	if (error?.errors && error.errors.length > 0) {
		const firstError = error.errors[0];
		if (firstError.extensions?.code === 'FORBIDDEN' || error.response?.status === 403) {
			console.error('Terjadi kesalahan saat menarik data dari Directus (Akses ditolak).');
			throw new Error('Gagal mengambil data dari server.');
		}
	}
	throw error;
}
