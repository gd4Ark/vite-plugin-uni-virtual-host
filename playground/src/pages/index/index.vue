<script setup lang="ts">
import VirtualButton from '@/components/VirtualButton.vue'
</script>

<template>
  <section class="page">
    <h2>pages/index/index.vue</h2>
    <p>列在 pages.json 中，因此不会被插件改写。</p>
    <VirtualButton />
  </section>
</template>

<style scoped>
.page {
  border-left: 4px solid #f97316;
  padding: 12px 16px;
  margin-top: 24px;
  background-color: rgba(249, 115, 22, 0.08);
  color: #7c2d12;
  font-size: 14px;
}
</style>
