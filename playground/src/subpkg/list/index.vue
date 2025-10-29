<script setup lang="ts">
import VirtualButton from '@/components/VirtualButton.vue'
</script>

<template>
  <section class="subpkg">
    <h2>subpkg/list/index.vue</h2>
    <p>子包页面，同样通过 pages.json 被标记为页面。</p>
    <VirtualButton />
  </section>
</template>

<style scoped>
.subpkg {
  border-left: 4px solid #10b981;
  padding: 12px 16px;
  margin-top: 12px;
  background-color: rgba(16, 185, 129, 0.08);
  color: #064e3b;
  font-size: 14px;
}
</style>
