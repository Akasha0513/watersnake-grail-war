<template>
	<!-- 판정 보정: 근접/사격/마술. system.attributes.attack.{melee,ranged,arcane}.bonus 에 ADD. -->
	<div class="form-group">
		<label> 근접 판정 </label>
		<div class="field">
			<input type="number" v-model="viewModel.meleeBonus" placeholder="0" />
		</div>
	</div>

	<div class="form-group">
		<label> 사격 판정 </label>
		<div class="field">
			<input type="number" v-model="viewModel.rangedBonus" placeholder="0" />
		</div>
	</div>

	<div class="form-group">
		<label> 마술 판정 </label>
		<div class="field">
			<input type="number" v-model="viewModel.arcaneBonus" placeholder="0" />
		</div>
	</div>
</template>

<script setup>
const props = defineProps(['viewModel']);
</script>
