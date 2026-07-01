<template>
	<p class="effect-hint">값: 숫자 또는 <code>@end.mod</code> 같은 식</p>

	<h3 class="effect-group-title">최대 HP</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.hpMax" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.hpMaxOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.hpBaseOver" placeholder="—" /></div></div>

	<h3 class="effect-group-title">최대 MP</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.mpMax" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.mpMaxOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.mpBaseOver" placeholder="—" /></div></div>

	<h3 class="effect-group-title">최대 SP</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.spMax" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.spMaxOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.spBaseOver" placeholder="—" /></div></div>

	<hr/>

	<div class="form-group"><label>이니셔티브 증감</label><div class="field"><input type="text" v-model="viewModel.initAdd" placeholder="0" /></div></div>
</template>

<script setup>
const props = defineProps(['viewModel']);
</script>

<style scoped>
.effect-group-title {
	margin: 10px 0 2px;
	font-size: 0.95em;
	opacity: 0.85;
	border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.15));
}
.effect-hint { font-size: 0.8em; opacity: 0.6; margin: 0 0 6px; }
.effect-hint code { opacity: 0.9; }
</style>
