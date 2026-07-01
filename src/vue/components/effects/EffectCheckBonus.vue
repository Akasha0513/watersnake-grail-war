<template>
	<p class="effect-hint">각 항목은 굴림 대화상자 수정치에 <b>토글</b>로 추가됩니다. 값: 숫자 또는 <code>@str.mod</code> 식.</p>

	<div class="form-group">
		<label>모든 판정 보정</label>
		<div class="field"><input type="text" v-model="viewModel.checkBonusAdd" placeholder="0" /></div>
	</div>

	<hr/>

	<h3 class="effect-group-title">
		판정 보정 항목
		<a class="cb-add" @click="addRow"><i class="fas fa-plus"></i> 추가</a>
	</h3>
	<div v-for="(cb, i) in list" :key="i" class="cb-row">
		<input type="text" class="cb-label" v-model="cb.label" placeholder="이름" @change="save" />
		<input type="text" class="cb-value" v-model="cb.value" placeholder="+2 / @x" @change="save" />
		<a class="cb-remove" @click="removeRow(i)"><i class="fas fa-times"></i></a>
	</div>
	<p v-if="list.length === 0" class="effect-hint">항목이 없습니다. "추가"로 만드세요.</p>
</template>

<script setup>
import { inject, reactive } from 'vue';
const props = defineProps(['effect', 'viewModel']);
const foundryEffect = inject('itemDocument');

const existing = props.effect?.flags?.['watersnake-grail-war']?.checkBonuses;
const list = reactive(Array.isArray(existing) ? foundry.utils.duplicate(existing) : []);

function addRow() { list.push({ label: '', value: '' }); }
function removeRow(i) { list.splice(i, 1); save(); }
function save() {
	const clean = list.map(c => ({ label: (c.label || '').trim(), value: (c.value || '').trim() }))
		.filter(c => c.value !== '');
	foundryEffect.setFlag('watersnake-grail-war', 'checkBonuses', clean);
}
</script>

<style scoped>
.effect-group-title {
	margin: 10px 0 6px;
	font-size: 0.95em;
	opacity: 0.85;
	border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.15));
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.cb-add { cursor: pointer; font-size: 0.85em; opacity: 0.8; }
.cb-add:hover { opacity: 1; }
.cb-row {
	display: flex;
	gap: 4px;
	align-items: center;
	margin-bottom: 4px;
}
.cb-label { flex: 1 1 40%; }
.cb-value { flex: 1 1 40%; }
.cb-remove { flex: 0 0 auto; cursor: pointer; opacity: 0.6; padding: 0 4px; }
.cb-remove:hover { opacity: 1; color: #c0392b; }
.effect-hint { font-size: 0.8em; opacity: 0.6; margin: 6px 0; }
.effect-hint code { opacity: 0.9; }
</style>
