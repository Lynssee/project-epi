<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		IconArrowLeft, IconUserPlus, IconLoader2, IconMail,
		IconShieldCheck, IconCheck, IconInfoCircle
	} from '@tabler/icons-svelte';
	import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
	import { initializeApp, getApps, getApp } from 'firebase/app';
	import { getAuth } from 'firebase/auth';
	import { createAppUser, ROLE_OPTIONS } from '$lib/services/users';

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let role = $state('leader');
	let department = $state('');
	let phone = $state('');
	let submitting = $state(false);
	let errorMsg = $state('');
	let successMsg = $state('');

	// Secondary Firebase app to create users without signing out admin
	function getSecondaryAuth() {
		const config = {
			apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
			authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
			projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
		};
		const existingApps = getApps();
		const secondaryExists = existingApps.find(a => a.name === 'secondary');
		const secondaryApp = secondaryExists ? getApp('secondary') : initializeApp(config, 'secondary');
		return getAuth(secondaryApp);
	}

	async function handleSubmit() {
		errorMsg = '';
		successMsg = '';

		if (!firstName.trim()) { errorMsg = 'Nama depan harus diisi.'; return; }
		if (!email.trim()) { errorMsg = 'Email harus diisi.'; return; }
		if (!password) { errorMsg = 'Password harus diisi.'; return; }
		if (password.length < 6) { errorMsg = 'Password minimal 6 karakter.'; return; }
		if (password !== confirmPassword) { errorMsg = 'Konfirmasi password tidak cocok.'; return; }

		try {
			submitting = true;

			// 1. Create Firebase Auth user via secondary app
			let firebaseUid = '';
			try {
				const secondaryAuth = getSecondaryAuth();
				const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
				firebaseUid = cred.user.uid;

				const displayName = `${firstName} ${lastName}`.trim().toUpperCase();
				await updateProfile(cred.user, { displayName });

				// Sign out secondary immediately
				await secondaryAuth.signOut();
			} catch (e: any) {
				if (e.code === 'auth/email-already-in-use') {
					errorMsg = 'Email sudah terdaftar di Firebase.';
				} else if (e.code === 'auth/invalid-email') {
					errorMsg = 'Format email tidak valid.';
				} else if (e.code === 'auth/weak-password') {
					errorMsg = 'Password terlalu lemah.';
				} else {
					errorMsg = 'Gagal membuat akun: ' + (e.message || e.code);
				}
				return;
			}

			// 2. Save to Firestore users collection (doc ID = Firebase UID)
			const selectedRole = ROLE_OPTIONS.find(r => r.id === role);
			const success = await createAppUser(firebaseUid, {
				email: email.toLowerCase(),
				firstName: firstName.toUpperCase(),
				lastName: lastName.toUpperCase(),
				role: selectedRole?.label || role,
				roleId: role,
				department: department,
				departmentId: department.toLowerCase().replace(/\s+/g, '_'),
				phone: phone
			});

			if (success) {
				successMsg = `Pengguna "${firstName} ${lastName}" berhasil dibuat!`;
				firstName = ''; lastName = ''; email = ''; password = '';
				confirmPassword = ''; role = 'leader'; department = ''; phone = '';
			} else {
				errorMsg = 'Akun Firebase berhasil dibuat, tapi gagal menyimpan ke Firestore.';
			}
		} catch (e: any) {
			errorMsg = 'Terjadi kesalahan: ' + (e.message || 'Unknown');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb" style="background: var(--re);">
		<button class="tbb" onclick={() => goto('/admin/users')}><IconArrowLeft size={22} /></button>
		<h1>Tambah User Baru</h1>
		<div class="w-7"></div>
	</div>

	<div class="scroll-body px-4 py-3">
		{#if successMsg}
			<div class="mb-4 p-3.5 rounded-xl bg-[var(--gl)] border border-[var(--g)]/20 flex items-start gap-2.5">
				<div class="w-6 h-6 rounded-full bg-[var(--g)] flex items-center justify-center shrink-0 mt-0.5">
					<IconCheck size={14} class="text-white" />
				</div>
				<div>
					<p class="text-[13px] font-medium text-[var(--gd)]">{successMsg}</p>
					<button class="text-[12px] text-[var(--g)] underline mt-1" onclick={() => goto('/admin/users')}>Lihat daftar pengguna →</button>
				</div>
			</div>
		{/if}

		{#if errorMsg}
			<div class="mb-4 p-3 rounded-xl bg-[var(--rel)] border border-red-200 flex items-center gap-2">
				<span class="text-[14px]">⚠</span>
				<p class="text-[12px] text-[var(--red)]">{errorMsg}</p>
			</div>
		{/if}

		<!-- Account Info -->
		<div class="card-section">
			<h4><IconMail size={16} class="text-[var(--re)]" /> Informasi akun</h4>
			<div class="grid grid-cols-2 gap-2 mb-2.5">
				<div><label class="f-label">Nama depan</label><input type="text" bind:value={firstName} class="f-input" placeholder="Nama depan"></div>
				<div><label class="f-label">Nama belakang</label><input type="text" bind:value={lastName} class="f-input" placeholder="Nama belakang"></div>
			</div>
			<div class="mb-2.5"><label class="f-label">Email</label><input type="email" bind:value={email} class="f-input" placeholder="user@eltamaprimaindo.com"></div>
			<div class="grid grid-cols-2 gap-2 mb-2.5">
				<div><label class="f-label">Department</label><input type="text" bind:value={department} class="f-input" placeholder="HRD, Finance..."></div>
				<div><label class="f-label">Telepon</label><input type="tel" bind:value={phone} class="f-input" placeholder="0812..."></div>
			</div>
			<div class="mb-2.5"><label class="f-label">Password</label><input type="password" bind:value={password} class="f-input" placeholder="Minimal 6 karakter"></div>
			<div><label class="f-label">Konfirmasi Password</label><input type="password" bind:value={confirmPassword} class="f-input" placeholder="Ulangi password"></div>
		</div>

		<!-- Role Selection -->
		<div class="card-section">
			<h4><IconShieldCheck size={16} class="text-[var(--re)]" /> Pilih role</h4>
			<div class="flex flex-col gap-2">
				{#each ROLE_OPTIONS as opt}
					<button
						class="p-3 rounded-xl border text-left flex items-center gap-3 transition-all {role === opt.id ? 'border-[var(--re)] bg-[var(--rel)]' : 'border-gray-200 hover:border-gray-300'}"
						onclick={() => role = opt.id}
					>
						<div class="flex-1">
							<p class="text-[13px] font-medium text-gray-800">{opt.label}</p>
							<p class="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
						</div>
						{#if role === opt.id}
							<div class="w-5 h-5 rounded-full bg-[var(--re)] flex items-center justify-center shrink-0">
								<span class="text-white text-[11px]">✓</span>
							</div>
						{:else}
							<div class="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0"></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Info -->
		<div class="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 mb-4">
			<IconInfoCircle size={16} class="text-gray-400 shrink-0 mt-0.5" />
			<p class="text-[11px] text-gray-400 leading-relaxed">
				User akan terdaftar di Firebase Auth + Firestore database.
				Data role dan profil mengikuti struktur yang sudah ada.
			</p>
		</div>
	</div>

	<div class="bottom-bar shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
		<button
			class="w-full py-3 rounded-xl text-[14px] font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
			style="background: var(--re);"
			onclick={handleSubmit}
			disabled={submitting}
		>
			{#if submitting}
				<IconLoader2 size={18} class="animate-spin" /> Membuat akun...
			{:else}
				<IconUserPlus size={18} /> Buat akun pengguna
			{/if}
		</button>
	</div>
</div>
