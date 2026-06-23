<template>
	<!-- 능력치 보정: system.abilities.X.value 에 ADD. 'pre' 단계에서 적용돼
	     수정치·HP·MP·SP·방어까지 자동 반영됨(강화/광화/약화 효과용). -->
	<div class="form-group">
		<label> 근력 </label>
		<div class="field">
			<input type="number" v-model="viewModel.strBonus" placeholder="0" />
		</div>
	</div>
	<div class="form-group">
		<label> 내구 </label>
		<div class="field">
			<input type="number" v-model="viewModel.endBonus" placeholder="0" />
		</div>
	</div>
	<div class="form-group">
		<label> 민첩 </label>
		<div class="field">
			<input type="number" v-model="viewModel.agiBonus" placeholder="0" />
		</div>
	</div>
	<div class="form-group">
		<label> 마력 </label>
		<div class="field">
			<input type="number" v-model="viewModel.mgiBonus" placeholder="0" />
		</div>
	</div>
	<div class="form-group">
		<label> 행운 </label>
		<div class="field">
			<input type="number" v-model="viewModel.lckBonus" placeholder="0" />
		</div>
	</div>
	<div class="form-group">
		<label> 통찰 </label>
		<div class="field">
			<input type="number" v-model="viewModel.insBonus" placeholder="0" />
		</div>
	</div>
</template>

<script setup>
const props = defineProps(['viewModel']);
</script>
