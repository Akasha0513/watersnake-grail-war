<template>
	<!-- 값에는 숫자 또는 @참조/산술식(@str.mod, @grade.value 등)을 넣을 수 있음. -->
	<p class="effect-hint">값: 숫자 또는 <code>@str.mod</code>·<code>@grade.value</code> 같은 식</p>

	<!-- 영령의 급 -->
	<h3 class="effect-group-title">영령의 급</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.gradeAdd" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.gradeOver" placeholder="—" /></div></div>

	<hr/>

	<!-- 최대 HP -->
	<h3 class="effect-group-title">최대 HP</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.hpMax" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.hpMaxOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.hpBaseOver" placeholder="—" /></div></div>

	<!-- 최대 MP -->
	<h3 class="effect-group-title">최대 MP</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.mpMax" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.mpMaxOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.mpBaseOver" placeholder="—" /></div></div>

	<!-- 최대 SP -->
	<h3 class="effect-group-title">최대 SP</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.spMax" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.spMaxOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.spBaseOver" placeholder="—" /></div></div>

	<hr/>

	<!-- 신체방어(신방) -->
	<h3 class="effect-group-title">신체방어(신방)</h3>
	<div class="form-group"><label>보정치 증감</label><div class="field"><input type="text" v-model="viewModel.pdAdd" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.pdOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.pdBaseOver" placeholder="—" /></div></div>
	<div class="form-group"><label>수정치 대체</label><div class="field"><input type="text" v-model="viewModel.pdModOver" placeholder="—" /></div></div>

	<!-- 정신방어(정방) -->
	<h3 class="effect-group-title">정신방어(정방)</h3>
	<div class="form-group"><label>보정치 증감</label><div class="field"><input type="text" v-model="viewModel.mdAdd" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.mdOver" placeholder="—" /></div></div>
	<div class="form-group"><label>기반 대체</label><div class="field"><input type="text" v-model="viewModel.mdBaseOver" placeholder="—" /></div></div>
	<div class="form-group"><label>수정치 대체</label><div class="field"><input type="text" v-model="viewModel.mdModOver" placeholder="—" /></div></div>

	<hr/>

	<div class="form-group"><label>이니셔티브 증감</label><div class="field"><input type="text" v-model="viewModel.initAdd" placeholder="0" /></div></div>
	<div class="form-group"><label>모든 판정 보정</label><div class="field"><input type="text" v-model="viewModel.checkBonusAdd" placeholder="0" /></div></div>
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
.effect-hint {
	font-size: 0.8em;
	opacity: 0.6;
	margin: 0 0 6px;
}
.effect-hint code {
	opacity: 0.9;
}
</style>
