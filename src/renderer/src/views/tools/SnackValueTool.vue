<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NInput, NInputNumber, NText } from 'naive-ui'

const products = ref([
  { id: 1, name: '商品 1', grams: null as number | null, packs: null as number | null, price: null as number | null },
])
let nextProductId = 2

function addProduct() {
  products.value.push({
    id: nextProductId,
    name: `商品 ${nextProductId++}`,
    grams: null,
    packs: null,
    price: null,
  })
}

function removeProduct(id: number) {
  if (products.value.length > 1) {
    products.value = products.value.filter((product) => product.id !== id)
  }
}

const results = computed(() => products.value.map((product) => {
  const { grams, packs, price } = product
  if (!packs || price == null || packs <= 0 || price < 0 || (grams != null && grams <= 0)) return null
  return {
    totalGrams: grams == null ? null : grams * packs,
    perPack: price / packs,
    perGram: grams == null ? null : price / (grams * packs),
  }
}))

const bestIndices = computed(() => {
  const groups = [
    results.value.flatMap((result, index) => result?.perGram != null ? [{ index, price: result.perGram }] : []),
    results.value.flatMap((result, index) => result?.perGram == null && result ? [{ index, price: result.perPack }] : []),
  ]
  return new Set(groups.flatMap((group) => {
    if (group.length < 2) return []
    const min = Math.min(...group.map((item) => item.price))
    return group.filter((item) => item.price === min).map((item) => item.index)
  }))
})

function formatPrice(value: number) {
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}
</script>

<template>
  <div class="tool-page">
    <div class="products">
      <section v-for="(product, index) in products" :key="product.id" class="product-card" :class="{ best: bestIndices.has(index) }">
        <div class="card-heading">
          <NInput v-model:value="product.name" class="product-name" :maxlength="20" />
          <span v-if="bestIndices.has(index)" class="best-tag">更划算</span>
          <NButton v-if="products.length > 1" quaternary size="small" @click="removeProduct(product.id)">删除</NButton>
        </div>

        <div class="fields">
          <label class="field">
            <span>每包重量（克，可选）</span>
            <NInputNumber v-model:value="product.grams" :min="0" :precision="2" :show-button="false" placeholder="例如 180" />
          </label>
          <label class="field">
            <span>包数</span>
            <NInputNumber v-model:value="product.packs" :min="1" :precision="0" :show-button="false" placeholder="例如 10" />
          </label>
          <label class="field">
            <span>整组总价（元）</span>
            <NInputNumber v-model:value="product.price" :min="0" :precision="2" :show-button="false" placeholder="例如 99.9" />
          </label>
        </div>

        <div v-if="results[index]" class="result">
          <div v-if="results[index]?.totalGrams != null"><span>总重量</span><strong>{{ results[index]?.totalGrams }} 克</strong></div>
          <div><span>每包</span><strong>¥{{ formatPrice(results[index]!.perPack) }}</strong></div>
          <div v-if="results[index]?.perGram != null"><span>每克</span><strong>¥{{ formatPrice(results[index]!.perGram!) }}</strong></div>
        </div>
        <NText v-else depth="3" class="placeholder">填写重量、包数和总价后自动计算</NText>
      </section>
    </div>
    <NButton dashed class="add-button" @click="addProduct">+ 添加商品</NButton>
    <NText depth="3" class="hint">填写重量的商品按每克单价比较；未填重量的商品按每包价格比较。</NText>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 820px;
}

.products {
  display: grid;
  gap: 12px;
}

.product-card {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}

.product-card.best {
  border-color: rgba(47, 111, 237, 0.45);
  background: rgba(47, 111, 237, 0.04);
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
}

.best-tag {
  flex-shrink: 0;
  color: #2f6fed;
  font-size: 12px;
}

.field {
  display: block;
  font-size: 13px;
}

.fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.field span {
  display: block;
  margin-bottom: 7px;
  opacity: 0.7;
}

.field :deep(.n-input-number) {
  width: 100%;
}

.result {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.result div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.result strong {
  font-weight: 600;
}

.placeholder,
.hint {
  font-size: 12px;
}

.placeholder {
  display: block;
  margin-top: 18px;
}

.hint {
  display: block;
  margin-top: 14px;
}

.add-button {
  margin-top: 16px;
}

@media (max-width: 600px) {
  .fields {
    grid-template-columns: 1fr;
  }

  .result {
    grid-template-columns: 1fr;
  }
}
</style>
