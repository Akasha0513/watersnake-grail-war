<template>
	<!-- 방어/스탯 보정: 자동계산값 위에 ADD로 합산됨('default' 단계). -->
	<div class="form-group">
		<label> 신체 방어 </label>
		<div class="field">
			<input type="number" v-model="viewModel.pdBonus" placeholder="0" />
		</div>
	</div>

	<div class="form-group">
		<label> 정신 방어 </label>
		<div class="field">
			<input type="number" v-model="viewModel.mdBonus" placeholder="0" />
		</div>
	</div>

	<div class="form-group">
		<label> HP </label>
		<div class="field">
			<input type="number" v-model="viewModel.hpMax" placeholder="0" />
		</div>
	</div>

	<div class="form-group">
		<label> MP </label>
		<div class="field">
			<input type="number" v-model="viewModel.mpMax" placeholder="0" />
		</div>
	</div>

	<div class="form-group">
		<label> SP </label>
		<div class="field">
			<input type="number" v-model="viewModel.spMax" placeholder="0" />
		</div>
	</div>

	<div class="form-group">
		<label> 이니셔티브 </label>
		<div class="field">
			<input type="number" v-model="viewModel.initBonus" placeholder="0" />
		</div>
	</div>
</template>

<script setup>
const props = defineProps(['viewModel']);
</script>
