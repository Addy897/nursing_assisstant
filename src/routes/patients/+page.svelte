<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	let patients_data = {};
	onMount(() => {
		if (browser) {
			patients_data = JSON.parse(localStorage.getItem('patient')) || {};
		}
	});

	let activePatient = null;
</script>

<div
	class="flex flex-col justify-start items-center  gap-y-3 p-6 bg-gray-100 rounded-lg shadow-md"
>
	<div class="text-2xl">Patients</div>
	<div class="flex flex-row justify-start items-start gap-4 p-6 bg-gray-100 rounded-lg shadow-md">
		{#each Object.entries(patients_data) as [name, data]}
			<div class="mb-4">
				<button
					class="bg-white rounded-lg shadow p-4 cursor-pointer"
					on:click={() =>
						activePatient === name ? (activePatient = null) : (activePatient = name)}
				>
					<h2 class="text-lg font-bold text-blue-600">{name}</h2>
					{#if activePatient === name}
						<div class="mt-2 text-start">
							{#each Object.entries(data) as [k, v]}
								<div class="mb-2">
									{#if typeof v === 'object'}
										<strong class="text-lg">{k.toUpperCase()}:</strong>
										<ul class="ml-4 list-none">
											{#each Object.entries(v) as [k1, v1]}
												<li class="text-gray-700">
													{k1.toUpperCase()}: <span class="font-medium">{v1}</span>
												</li>
											{/each}
										</ul>
									{:else}
										<p class="text-lg">
											<strong>{k.toUpperCase()}:</strong> <span class="font-medium">{v}</span>
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</button>
			</div>
		{/each}
	</div>
</div>

<style>
	.cursor-pointer {
		cursor: pointer;
	}
	.bg-white {
		background-color: white;
	}
	.shadow {
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}
</style>
