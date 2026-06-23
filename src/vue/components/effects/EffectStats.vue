<template>
	<!-- 스탯·방어: 최대 HP/MP/SP 증감(ADD), 신/정방 보정(ADD)·덮어쓰기(OVERRIDE), 급 대체(OVERRIDE) -->
	<div class="form-group">
		<label> 최대 HP 증감 </label>
		<div class="field"><input type="number" v-model="viewModel.hpMax" placeholder="0" /></div>
	</div>
	<div class="form-group">
		<label> 최대 MP 증감 </label>
		<div class="field"><input type="number" v-model="viewModel.mpMax" placeholder="0" /></div>
	</div>
	<div class="form-group">
		<label> 최대 SP 증감 </label>
		<div class="field"><input type="number" v-model="viewModel.spMax" placeholder="0" /></div>
	</div>

	<hr/>

	<div class="form-group">
		<label> 신방 보정치 </label>
		<div class="field"><input type="number" v-model="viewModel.pdAdd" placeholder="0" /></div>
	</div>
	<div class="form-group">
		<label> 신방 덮어쓰기 </label>
		<div class="field"><input type="number" v-model="viewModel.pdOver" placeholder="—" /></div>
	</div>
	<div class="form-group">
		<label> 정방 보정치 </label>
		<div class="field"><input type="number" v-model="viewModel.mdAdd" placeholder="0" /></div>
	</div>
	<div class="form-group">
		<label> 정방 덮어쓰기 </label>
		<div class="field"><input type="number" v-model="viewModel.mdOver" placeholder="—" /></div>
	</div>

	<hr/>

	<div class="form-group">
		<label> 급 대체 </label>
		<div class="field"><input type="number" v-model="viewModel.gradeOver" placeholder="—" /></div>
	</div>
</template>

<script setup>
const props = defineProps(['viewModel']);
</script>
