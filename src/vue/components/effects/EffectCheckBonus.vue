<template>
	<p class="effect-hint">각 항목은 굴림 대화상자 수정치에 <b>토글</b>로 추가됩니다. 값: 숫자 또는 <code>@str.mod</code> 식. <b>적용</b> = 어떤 판정에 붙는지(명중 판정은 능력치 판정을 겸함).</p>

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
		<select class="cb-apply" v-model="cb.apply" @change="save">
			<option v-for="opt in applyOptions" :key="opt.v" :value="opt.v">{{opt.l}}</option>
		</select>
		<a class="cb-remove" @click="removeRow(i)"><i class="fas fa-times"></i></a>
	</div>
	<p v-if="list.length === 0" class="effect-hint">항목이 없습니다. "추가"로 만드세요.</p>

	<h3 class="effect-group-title">
		대성공 범위 확장
		<a class="cb-add" @click="addCrit"><i class="fas fa-plus"></i> 추가</a>
	</h3>
	<div v-for="(cm, i) in critList" :key="'c' + i" class="cb-row">
		<input type="text" class="cb-value" v-model="cm.value" placeholder="1 / @x" @change="saveCrit" />
		<select class="cb-apply" v-model="cm.apply" @change="saveCrit">
			<option v-for="opt in applyOptions" :key="opt.v" :value="opt.v">{{opt.l}}</option>
		</select>
		<a class="cb-remove" @click="removeCrit(i)"><i class="fas fa-times"></i></a>
	</div>
	<p v-if="critList.length === 0" class="effect-hint">항목 없음 — 예: 근접 명중 +1이면 근접 판정만 크릿 19+.</p>

	<h3 class="effect-group-title">
		대실패 범위 확장
		<a class="cb-add" @click="addFumble"><i class="fas fa-plus"></i> 추가</a>
	</h3>
	<div v-for="(fm, i) in fumbleList" :key="'f' + i" class="cb-row">
		<input type="text" class="cb-value" v-model="fm.value" placeholder="1 / @x" @change="saveFumble" />
		<select class="cb-apply" v-model="fm.apply" @change="saveFumble">
			<option v-for="opt in applyOptions" :key="opt.v" :value="opt.v">{{opt.l}}</option>
		</select>
		<a class="cb-remove" @click="removeFumble(i)"><i class="fas fa-times"></i></a>
	</div>
	<p v-if="fumbleList.length === 0" class="effect-hint">항목 없음</p>
</template>

<script setup>
import { inject, reactive } from 'vue';
const props = defineProps(['effect', 'viewModel']);
const foundryEffect = inject('itemDocument');

const applyOptions = [
	{ v: 'all', l: '모든 판정' },
	{ v: 'str', l: '근력' },
	{ v: 'end', l: '내구' },
	{ v: 'agi', l: '민첩' },
	{ v: 'mgi', l: '마력' },
	{ v: 'lck', l: '행운' },
	{ v: 'ins', l: '통찰' },
	{ v: 'custom', l: '순수값' },
	{ v: 'melee', l: '근접 명중' },
	{ v: 'ranged', l: '사격 명중' },
];

const withApply = (arr) => (Array.isArray(arr) ? foundry.utils.duplicate(arr) : []).map(x => ({ apply: 'all', ...x }));
const flags = props.effect?.flags?.['watersnake-grail-war'] ?? {};
const list = reactive(withApply(flags.checkBonuses));
const critList = reactive(withApply(flags.critMods));
const fumbleList = reactive(withApply(flags.fumbleMods));

const cleanOf = (arr, withLabel) => arr
	.map(c => ({ ...(withLabel ? { label: (c.label || '').trim() } : {}), value: (c.value || '').trim(), apply: c.apply || 'all' }))
	.filter(c => c.value !== '');

function addRow() { list.push({ label: '', value: '', apply: 'all' }); }
function removeRow(i) { list.splice(i, 1); save(); }
function save() {
	foundryEffect.setFlag('watersnake-grail-war', 'checkBonuses', cleanOf(list, true));
}

function addCrit() { critList.push({ value: '', apply: 'all' }); }
function removeCrit(i) { critList.splice(i, 1); saveCrit(); }
function saveCrit() {
	foundryEffect.setFlag('watersnake-grail-war', 'critMods', cleanOf(critList, false));
}

function addFumble() { fumbleList.push({ value: '', apply: 'all' }); }
function removeFumble(i) { fumbleList.splice(i, 1); saveFumble(); }
function saveFumble() {
	foundryEffect.setFlag('watersnake-grail-war', 'fumbleMods', cleanOf(fumbleList, false));
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
.cb-label { flex: 1 1 32%; }
.cb-value { flex: 1 1 30%; }
.cb-apply { flex: 0 0 96px; min-width: 0; }
.cb-remove { flex: 0 0 auto; cursor: pointer; opacity: 0.6; padding: 0 4px; }
.cb-remove:hover { opacity: 1; color: #c0392b; }
.effect-hint { font-size: 0.8em; opacity: 0.6; margin: 6px 0; }
.effect-hint code { opacity: 0.9; }
</style>
