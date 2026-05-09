<template>
  <div class="page-shell facility-theme">
    <section class="page-hero">
      <div class="hero-copy">
        <span class="hero-kicker">Facility</span>
        <h1>校园设施</h1>
        <p>你可以查看所有登记的设施，包括可预约、维护中、已损坏等状态。</p>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-label">全部设施</span>
        <strong>{{ stats.total }}</strong>
        <p>系统当前登记的设施总数</p>
      </article>
      <article class="summary-card">
        <span class="summary-label">可预约</span>
        <strong>{{ stats.available }}</strong>
        <p>状态正常，可进入详情页继续预约</p>
      </article>
      <article class="summary-card">
        <span class="summary-label">维护中</span>
        <strong>{{ stats.maintenance }}</strong>
        <p>正在维护，暂不开放预约</p>
      </article>
      <article class="summary-card">
        <span class="summary-label">已损坏</span>
        <strong>{{ stats.damaged }}</strong>
        <p>等待处理，当前不可预约</p>
      </article>
    </section>

    <section class="panel-card control-card">
      <div class="control-copy">
        <h2>筛选设施</h2>
        <p>按名称、分类和状态快速缩小范围，点击卡片可直接进入独立详情页。</p>
      </div>
      <div class="control-row">
        <el-input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索设施名称"
          clearable
          :prefix-icon="Search"
        />
        <el-select v-model="selectedCategory" class="filter-select" placeholder="全部分类" clearable>
          <el-option value="" label="全部分类" />
          <el-option
            v-for="category in categories"
            :key="category.id"
            :value="getCategoryLabel(category)"
            :label="getCategoryLabel(category)"
          />
        </el-select>
        <el-select v-model="selectedStatus" class="filter-select" placeholder="全部状态" clearable>
          <el-option value="" label="全部状态" />
          <el-option value="AVAILABLE" label="可预约" />
          <el-option value="MAINTENANCE" label="维护中" />
          <el-option value="DAMAGED" label="已损坏" />
        </el-select>
        <el-button class="reset-btn" @click="resetFilters">重置</el-button>
      </div>
    </section>

    <section class="panel-card facility-panel">
      <div class="panel-head">
        <div class="panel-copy">
          <h2>设施列表</h2>
          <p>每张卡片都提供基础信息，进入详情后可查看七天空闲预约时段图与完整预约规则。</p>
        </div>
        <div class="panel-meta">
          <span class="meta-chip">共 {{ filteredFacilityList.length }} 条结果</span>
          <span v-if="searchKeyword || selectedCategory || selectedStatus" class="meta-chip meta-muted">已应用筛选条件</span>
        </div>
      </div>

      <template v-if="loading">
        <div v-loading="loading" class="loading-shell"></div>
      </template>
      <template v-else>
        <div v-if="paginatedFacilityList.length" class="facility-grid">
          <article
            v-for="item in paginatedFacilityList"
            :key="item.id"
            class="facility-card"
            @click="openDetail(item)"
          >
            <div class="card-media">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.name" />
              <div v-else class="card-media-fallback">设施</div>
            </div>
            <div class="card-body">
              <div class="card-tags">
                <el-tag :type="getStatusType(item.status)" effect="light" size="small">
                  {{ getStatusText(item.status) }}
                </el-tag>
                <el-tag effect="light" size="small" class="tag-category">
                  {{ item.category || '未分类' }}
                </el-tag>
              </div>
              <h3 class="card-title">{{ item.name }}</h3>
              <p class="card-desc">{{ item.description || '暂无设施介绍。' }}</p>
              <div class="card-meta">
                <span>{{ item.location || '未填写位置' }}</span>
                <span>{{ item.model || '未填写型号' }}</span>
              </div>
              <div class="card-entry">
                <span>进入详情页查看时段图</span>
                <strong>→</strong>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">
          <h3>暂无设施</h3>
          <p>当前没有符合筛选条件的设施，可以尝试放宽筛选范围。</p>
        </div>
        <div v-if="filteredFacilityList.length" class="pagination-wrap">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[8, 12, 20, 40]"
            :total="filteredFacilityList.length"
            layout="total, sizes, prev, pager, next, jumper"
            background
          />
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { facilityAPI, facilityCategoryAPI } from '../../api';

const router = useRouter();

const allFacilityList = ref([]);
const categories = ref([]);
const loading = ref(false);
const searchKeyword = ref('');
const selectedCategory = ref('');
const selectedStatus = ref('');
const currentPage = ref(1);
const pageSize = ref(8);

const filteredFacilityList = computed(() => {
  let filtered = [...allFacilityList.value];
  const keyword = searchKeyword.value.trim().toLowerCase();

  if (keyword) {
    filtered = filtered.filter((item) => item.name && item.name.toLowerCase().includes(keyword));
  }

  if (selectedCategory.value) {
    filtered = filtered.filter((item) => item.category === selectedCategory.value);
  }

  if (selectedStatus.value) {
    filtered = filtered.filter((item) => item.status === selectedStatus.value);
  }

  return filtered;
});

const paginatedFacilityList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredFacilityList.value.slice(start, end);
});

const stats = computed(() => ({
  total: allFacilityList.value.length,
  available: allFacilityList.value.filter((item) => item.status === 'AVAILABLE').length,
  maintenance: allFacilityList.value.filter((item) => item.status === 'MAINTENANCE').length,
  damaged: allFacilityList.value.filter((item) => item.status === 'DAMAGED').length
}));

watch(
  () => [filteredFacilityList.value.length, pageSize.value],
  () => {
    const maxPage = Math.max(1, Math.ceil(filteredFacilityList.value.length / pageSize.value));
    if (currentPage.value > maxPage) {
      currentPage.value = maxPage;
    }
  }
);

onMounted(() => {
  loadFacilityList();
  loadCategories();
});

async function loadFacilityList() {
  try {
    loading.value = true;
    const response = await facilityAPI.list();
    allFacilityList.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('加载设施列表失败:', error);
    ElMessage.error('加载设施列表失败，请稍后重试');
    allFacilityList.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadCategories() {
  try {
    const response = await facilityCategoryAPI.active();
    categories.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('加载设施分类失败:', error);
    categories.value = [];
  }
}

function getCategoryLabel(category) {
  return category?.categoryName || category?.name || '';
}

function getStatusType(status) {
  const statusMap = {
    AVAILABLE: 'success',
    MAINTENANCE: 'warning',
    DAMAGED: 'danger'
  };

  return statusMap[status] || 'info';
}

function getStatusText(status) {
  const statusMap = {
    AVAILABLE: '可预约',
    MAINTENANCE: '维护中',
    DAMAGED: '已损坏'
  };

  return statusMap[status] || status;
}

function resetFilters() {
  searchKeyword.value = '';
  selectedCategory.value = '';
  selectedStatus.value = '';
  currentPage.value = 1;
}

function openDetail(item) {
  router.push(`/user/facility/${item.id}`);
}
</script>

<style scoped>
.facility-theme {
  --theme-main: var(--feature-primary);
  --theme-deep: var(--feature-primary-deep);
  --theme-soft: color-mix(in srgb, var(--feature-primary) 18%, #ffffff 82%);
  --theme-border: var(--feature-border);
  --theme-shadow: color-mix(in srgb, var(--feature-primary) 12%, transparent);
  --theme-surface: color-mix(in srgb, var(--feature-primary) 8%, #ffffff 92%);
  min-height: 100%;
  display: grid;
  gap: 20px;
  padding: 0;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--feature-primary) 20%, transparent), transparent 28%),
    radial-gradient(circle at right center, color-mix(in srgb, var(--feature-primary) 12%, #ffffff 88%), transparent 20%),
    linear-gradient(180deg, #f9fdf9 0%, #f5faf6 48%, #eef6ef 100%);
}

.page-hero,
.control-card,
.panel-card {
  animation: rise-in 0.55s ease both;
}

.page-hero {
  padding: 30px;
  border-radius: 30px;
  border: 1px solid var(--theme-border);
  background:
    radial-gradient(circle at top right, var(--theme-soft), transparent 24%),
    linear-gradient(145deg, color-mix(in srgb, var(--feature-primary) 12%, #ffffff 88%) 0%, #ffffff 62%);
  box-shadow: 0 20px 44px var(--theme-shadow);
}

.hero-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--theme-soft);
  color: var(--theme-deep);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.hero-copy h1 {
  margin: 16px 0 12px;
  font-size: 36px;
  color: var(--feature-strong);
}

.hero-copy p {
  margin: 0;
  color: color-mix(in srgb, var(--feature-strong) 62%, #7f9084 38%);
  line-height: 1.8;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  padding: 22px;
  border-radius: 24px;
  border: 1px solid var(--theme-border);
  background: linear-gradient(150deg, color-mix(in srgb, var(--feature-primary) 12%, #ffffff 88%) 0%, #ffffff 82%);
  box-shadow: 0 18px 38px var(--theme-shadow);
}

.summary-card strong {
  display: block;
  margin: 14px 0 8px;
  font-size: 32px;
  color: var(--feature-strong);
}

.summary-label,
.summary-card p {
  color: color-mix(in srgb, var(--feature-strong) 62%, #7f9084 38%);
}

.control-card {
  padding: 24px;
  border: 1px solid var(--theme-border);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 22px 50px var(--theme-shadow);
}

.control-copy h2,
.panel-copy h2 {
  margin: 0;
  font-size: 20px;
  color: var(--feature-strong);
}

.control-copy p,
.panel-copy p {
  margin: 8px 0 0;
  line-height: 1.7;
  color: color-mix(in srgb, var(--feature-strong) 62%, #7f9084 38%);
}

.control-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 18px;
}

.search-input {
  width: 320px;
}

.search-input :deep(.el-input__wrapper) {
  min-height: 46px;
  border-radius: 16px;
  box-shadow: none;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
}

.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--feature-primary) 12%, transparent);
}

.filter-select {
  width: 160px;
}

.filter-select :deep(.el-select__wrapper) {
  min-height: 46px;
  border-radius: 16px;
  box-shadow: none;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
}

.reset-btn {
  border-radius: 14px;
  min-height: 46px;
  padding: 0 24px;
  border: 1px solid var(--theme-border);
  background: color-mix(in srgb, var(--theme-surface) 72%, #ffffff 28%);
  color: var(--feature-strong);
  transition: all 0.25s ease;
}

.reset-btn:hover {
  background: linear-gradient(135deg, var(--theme-main) 0%, var(--theme-deep) 100%);
  color: #ffffff;
  border-color: transparent;
}

.facility-panel {
  border: 1px solid var(--theme-border);
  border-radius: 30px;
  padding: 8px 24px 24px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 22px 50px var(--theme-shadow);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
}

.panel-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.meta-chip {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--theme-soft);
  color: var(--theme-deep);
  font-size: 12px;
  font-weight: 600;
}

.meta-muted {
  background: rgba(200, 200, 200, 0.14);
  color: #888;
}

.loading-shell {
  min-height: 240px;
}

.facility-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.facility-card {
  border-radius: 24px;
  border: 1px solid var(--theme-border);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), color-mix(in srgb, var(--feature-primary) 6%, #ffffff 94%));
  box-shadow: 0 14px 28px var(--theme-shadow);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.facility-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 44px color-mix(in srgb, var(--feature-primary) 18%, transparent);
}

.card-media {
  height: 176px;
  padding: 10px 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--feature-primary) 8%, #ffffff 92%);
}

.card-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  border-radius: 18px;
}

.card-media-fallback {
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  color: var(--theme-deep);
  font-size: 28px;
  font-weight: 700;
}

.card-body {
  padding: 18px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.card-tags .tag-category {
  background: color-mix(in srgb, var(--feature-primary) 16%, #ffffff 84%) !important;
  border-color: transparent !important;
  color: var(--theme-deep) !important;
}

.card-title {
  margin: 0 0 8px;
  font-size: 17px;
  color: var(--feature-strong);
}

.card-desc {
  margin: 0 0 12px;
  color: color-mix(in srgb, var(--feature-strong) 62%, #7f9084 38%);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: color-mix(in srgb, var(--feature-strong) 54%, #90a090 46%);
  font-size: 12px;
}

.card-entry {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--feature-primary) 10%, #dce7de 90%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--theme-deep);
  font-size: 13px;
  font-weight: 600;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.pagination-wrap :deep(.el-pagination) {
  --el-pagination-button-color: var(--feature-strong);
}

.pagination-wrap :deep(.el-pagination.is-background .el-pager li:not(.is-disabled).is-active) {
  background: linear-gradient(135deg, var(--theme-main) 0%, var(--theme-deep) 100%);
  border: none;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-state h3 {
  margin: 0 0 10px;
  color: var(--feature-strong);
}

.empty-state p {
  margin: 0;
  color: color-mix(in srgb, var(--feature-strong) 62%, #7f9084 38%);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1280px) {
  .facility-grid,
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .search-input,
  .filter-select {
    width: 100%;
  }

  .panel-head {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .facility-theme {
    padding: 16px;
  }

  .summary-grid,
  .facility-grid {
    grid-template-columns: 1fr;
  }

  .page-hero,
  .control-card,
  .panel-card {
    padding: 18px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .card-meta {
    flex-direction: column;
  }
}
</style>
