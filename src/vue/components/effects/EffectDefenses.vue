<template>
	<p class="effect-hint">값: 숫자 또는 <code>@str.mod</code>·<code>@grade.value</code> 같은 식</p>

	<h3 class="effect-group-title">영령의 급</h3>
	<div class="form-group"><label>증감</label><div class="field"><input type="text" v-model="viewModel.gradeAdd" placeholder="0" /></div></div>
	<div class="form-group"><label>덮어쓰기</label><div class="field"><input type="text" v-model="viewModel.gradeOver" placeholder="—" /></div></div>

	<hr/>

	<table class="effect-abilities-table">
		<thead>
			<tr>
				<th>방어</th>
				<th>보정치 증감</th>
				<th>덮어쓰기</th>
				<th>기반 대체</th>
				<th>수정치 대체</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="ability-label">신방</td>
				<td><input type="text" v-model="viewModel.pdAdd" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.pdOver" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel.pdBaseOver" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel.pdModOver" placeholder="—" /></td>
			</tr>
			<tr>
				<td class="ability-label">정방</td>
				<td><input type="text" v-model="viewModel.mdAdd" placeholder="0" /></td>
				<td><input type="text" v-model="viewModel.mdOver" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel.mdBaseOver" placeholder="—" /></td>
				<td><input type="text" v-model="viewModel.mdModOver" placeholder="—" /></td>
			</tr>
		</tbody>
	</table>
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
.effect-abilities-table { width: 100%; border-collapse: collapse; }
.effect-abilities-table th, .effect-abilities-table td { text-align: center; padding: 2px; }
.effect-abilities-table th { font-size: 0.85em; }
.effect-abilities-table .ability-label { white-space: nowrap; font-weight: bold; }
.effect-abilities-table input { width: 100%; min-width: 0; box-sizing: border-box; text-align: center; }
.effect-hint { font-size: 0.8em; opacity: 0.6; margin: 0 0 6px; }
.effect-hint code { opacity: 0.9; }
</style>
