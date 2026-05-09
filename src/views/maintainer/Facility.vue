<template>
  <div class="page-shell facility-theme" :style="featureVars">
    <section class="page-hero">
      <div class="hero-copy">
        <span class="eyebrow">Facility Management</span>
        <h1>设施管理</h1>
        <p>
          管理所有设施，包括新增、删除、更新和查询。
        </p>
      </div>
      <div class="hero-badge">
        <span>当前负责</span>
        <strong>{{ stats.total }}</strong>
        <small>个设施</small>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-label">设施总数</span>
        <strong>{{ stats.total }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">可用中</span>
        <strong>{{ stats.available }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">维护中</span>
        <strong>{{ stats.maintenance }}</strong>
      </article>
      <article class="summary-card">
        <span class="summary-label">停用或损坏</span>
        <strong>{{ stats.damaged }}</strong>
      </article>
    </section>

    <section class="control-card">
      <div class="control-copy">
        <h2>设施列表</h2>
        <p>支持按名称、型号和分类快速检索，点击详情可查看基础信息与近期预约明细。</p>
      </div>

      <div class="control-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索设施名称、型号或分类"
          clearable
          class="search-input"
          @keyup.enter="handleSearch"
          @clear="handleClearSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button class="action-btn search-btn" type="primary" @click="handleSearch">
          搜索
        </el-button>
        <el-button class="action-btn create-btn" type="success" @click="openCreateDialog">
          新建设施
        </el-button>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <h2>设施清单</h2>
          <p>当前共 {{ pagination.total }} 条结果，可直接查看详情或删除记录。</p>
        </div>
      </div>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="paginatedFacilities"
        stripe
        highlight-current-row
        empty-text="暂无设施数据"
      >
        <el-table-column label="设施" min-width="240">
          <template #default="{ row }">
            <div class="facility-cell">
              <div class="facility-thumb">
                <img :src="getImageSrc(row.image)" :alt="row.name" />
              </div>
              <div class="facility-copy">
                <div class="facility-name">
                  <el-link type="primary" :underline="false" @click="handleRowClick(row)">
                    {{ row.name }}
                  </el-link>
                </div>
                <div class="facility-meta">
                  {{ row.model ? `${row.model} / ` : '' }}{{ row.categoryName || '-' }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="location" label="位置" min-width="150" show-overflow-tooltip />

        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button
                size="small"
                type="primary"
                class="row-btn detail-btn"
                @click="handleRowClick(row)"
              >
                详情
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                class="row-btn delete-btn"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          layout="prev, pager, next, total"
          @current-change="handlePageChange"
        />
      </div>
    </section>

    <el-dialog
      v-model="detailDialogVisible"
      title="设施详情"
      width="920px"
      destroy-on-close
      class="facility-detail-dialog"
    >
      <div v-if="selectedFacility" class="detail-layout">
        <div class="detail-hero">
          <img :src="getImageSrc(selectedFacility.image)" :alt="selectedFacility.name" />
          <div class="detail-hero-copy">
            <h2>{{ selectedFacility.name }}</h2>
            <p>{{ selectedFacility.description || '暂无描述' }}</p>
            <div class="detail-tags">
              <el-tag size="small" effect="plain">{{ selectedFacility.categoryName || '-' }}</el-tag>
              <el-tag size="small" effect="plain">{{ selectedFacility.location || '-' }}</el-tag>
              <el-tag size="small" :type="statusType(selectedFacility.status)">
                {{ statusLabel(selectedFacility.status) }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-info-card">
            <span class="detail-label">型号</span>
            <strong>{{ selectedFacility.model || '-' }}</strong>
          </div>
          <div class="detail-info-card">
            <span class="detail-label">购置时间</span>
            <strong>{{ formatDate(selectedFacility.purchaseDate) }}</strong>
          </div>
          <div class="detail-info-card">
            <span class="detail-label">价格</span>
            <strong>{{ formatPrice(selectedFacility.price) }}</strong>
          </div>
          <div class="detail-info-card">
            <span class="detail-label">负责人</span>
            <strong>{{ selectedFacility.maintainerName || '当前账号' }}</strong>
          </div>
        </div>

        <div class="timeline-panel">
          <div class="section-title">
            <h3>近期预约明细</h3>
            <span>未来 30 天共 {{ facilityTimeline.length }} 条</span>
          </div>

          <div v-loading="timelineLoading">
            <div v-if="facilityTimeline.length" class="timeline-list">
              <div v-for="event in facilityTimeline" :key="event.id" class="timeline-item">
                <div class="timeline-dot" />
                <div class="timeline-content">
                  <div class="timeline-top">
                    <el-tag size="small" effect="plain">
                      {{ reservationStatusLabel(event.status) }}
                    </el-tag>
                    <span>{{ formatRange(event.startTime, event.endTime) }}</span>
                  </div>
                  <p>{{ event.username || '未知用户' }} / {{ event.purpose || '无备注' }}</p>
                  <span v-if="event.createdAt">预约时间：{{ formatDateTime(event.createdAt) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="timeline-empty">当前暂无未来预约安排</div>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="createVisible" title="新建设施" width="560px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入设施名称" />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="createForm.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="位置" prop="location">
          <el-input v-model="createForm.location" placeholder="例如：体育馆 A 区 101" />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="createForm.model" placeholder="选填" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
        <el-form-item label="购置时间">
          <el-date-picker
            v-model="createForm.purchaseDate"
            type="date"
            placeholder="选填"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="使用年限">
          <el-input-number v-model="createForm.lifespan" :min="0" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="价格(元)">
          <el-input-number v-model="createForm.price" :min="0" :step="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            @change="handleImageChange"
          >
            <el-button size="small" class="upload-btn">选择图片</el-button>
            <template #tip>
              <span v-if="createForm.image" class="image-name">{{ createForm.image.name }}</span>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreate">确认新建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { facilityAPI, facilityCategoryAPI } from '../../api'
import { buildFeatureVars, getRoleTheme } from '../../utils/featureTheme'

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
const theme = getRoleTheme(userInfo.role || 'maintainer')
const featureVars = buildFeatureVars(theme)

const tableRef = ref(null)
const createFormRef = ref(null)

const loading = ref(false)
const timelineLoading = ref(false)
const searchKeyword = ref('')
const facilities = ref([])
const paginatedFacilities = ref([])
const categories = ref([])
const selectedFacility = ref(null)
const facilityTimeline = ref([])

const createVisible = ref(false)
const createLoading = ref(false)
const detailDialogVisible = ref(false)

const createForm = ref({
  name: '',
  categoryId: null,
  location: '',
  model: '',
  description: '',
  purchaseDate: null,
  lifespan: null,
  price: null,
  image: null
})

const createRules = {
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  name: [{ required: true, message: '请输入设施名称', trigger: 'blur' }],
  location: [{ required: true, message: '请输入位置', trigger: 'blur' }]
}

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

const stats = ref({
  total: 0,
  available: 0,
  maintenance: 0,
  damaged: 0
})

const normalizeFacility = (facility = {}) => ({
  ...facility,
  categoryName: facility.categoryName || facility.category || '-',
  image: facility.image || facility.imageUrl || '',
  imageUrl: facility.imageUrl || facility.image || '',
  maintainerName: facility.maintainerName || facility.maintainer || ''
})

onMounted(async () => {
  await Promise.all([loadFacilities(), loadCategories()])
  applyPagination()
})

const loadFacilities = async () => {
  loading.value = true
  try {
    const response = await facilityAPI.mine()
    const rawList = response.data?.list || response.data?.records || response.data || []
    const list = Array.isArray(rawList) ? rawList.map(normalizeFacility) : []

    facilities.value = list
    stats.value.total = list.length
    stats.value.available = list.filter(
      (item) => item.status === 'AVAILABLE' || item.status === 'ACTIVE'
    ).length
    stats.value.maintenance = list.filter((item) => item.status === 'MAINTENANCE').length
    stats.value.damaged = list.filter(
      (item) => item.status === 'DAMAGED' || item.status === 'INACTIVE'
    ).length
  } catch (error) {
    console.error('加载设施列表失败', error)
    ElMessage.error(error?.response?.data?.message || '加载设施列表失败')
    facilities.value = []
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const response = await facilityCategoryAPI.getCategoryList()
    const rawList = response.data?.list || response.data?.records || response.data || []
    categories.value = Array.isArray(rawList)
      ? rawList.map((item) => ({
          ...item,
          name: item.name || item.categoryName || item.category || '未命名分类'
        }))
      : []
  } catch (error) {
    console.error('加载分类失败', error)
  }
}

const getFilteredFacilities = () => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return [...facilities.value]
  }

  return facilities.value.filter((item) =>
    [item.name, item.model, item.categoryName, item.location]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(keyword))
  )
}

const applyPagination = () => {
  const list = getFilteredFacilities()
  pagination.value.total = list.length

  const maxPage = Math.max(1, Math.ceil(list.length / pagination.value.pageSize))
  if (pagination.value.current > maxPage) {
    pagination.value.current = maxPage
  }

  const start = (pagination.value.current - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  paginatedFacilities.value = list.slice(start, end)
}

const handleSearch = () => {
  pagination.value.current = 1
  applyPagination()
}

const handleClearSearch = () => {
  pagination.value.current = 1
  applyPagination()
}

const handlePageChange = () => {
  applyPagination()
}

const handleRowClick = (row) => {
  selectedFacility.value = normalizeFacility(row)
  facilityTimeline.value = []
  detailDialogVisible.value = true
  loadTimeline(row.id)
}

const loadTimeline = async (facilityId) => {
  timelineLoading.value = true
  try {
    const response = await facilityAPI.getFacilityTimeline(facilityId, 30)
    const rawList = response.data?.reservations || response.data || []
    facilityTimeline.value = Array.isArray(rawList)
      ? rawList.map((item) => ({
          ...item,
          username: item.username || item.userName || '未知用户'
        }))
      : []
  } catch (error) {
    console.error('加载预约明细失败', error)
    facilityTimeline.value = []
    ElMessage.error(error?.response?.data?.message || '加载预约明细失败')
  } finally {
    timelineLoading.value = false
  }
}

const openCreateDialog = () => {
  createForm.value = {
    name: '',
    categoryId: null,
    location: '',
    model: '',
    description: '',
    purchaseDate: null,
    lifespan: null,
    price: null,
    image: null
  }
  createVisible.value = true
}

const handleImageChange = (uploadFile) => {
  createForm.value.image = uploadFile.raw || uploadFile
}

const handleCreate = async () => {
  ElMessage.info('新增设施请使用系统管理员账号操作')
  createVisible.value = false
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认删除“${row.name}”吗？删除后将无法恢复。`,
      '删除设施',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await facilityAPI.deleteFacility(row.id)
    ElMessage.success('设施删除成功')

    if (selectedFacility.value?.id === row.id) {
      detailDialogVisible.value = false
      selectedFacility.value = null
      facilityTimeline.value = []
    }

    await loadFacilities()
    applyPagination()
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    console.error('删除设施失败', error)
    ElMessage.error(error?.response?.data?.message || error?.message || '删除设施失败')
  }
}

const statusType = (status) => {
  const map = {
    AVAILABLE: 'success',
    ACTIVE: 'success',
    MAINTENANCE: 'warning',
    DAMAGED: 'danger',
    INACTIVE: 'info'
  }
  return map[status] || 'info'
}

const statusLabel = (status) => {
  const map = {
    AVAILABLE: '可用',
    ACTIVE: '可用',
    MAINTENANCE: '维护中',
    DAMAGED: '损坏',
    INACTIVE: '停用'
  }
  return map[status] || status || '-'
}

const reservationStatusLabel = (status) => {
  const map = {
    PENDING: '待审核',
    APPROVED: '已通过',
    ACTIVE: '进行中',
    COMPLETED: '已完成',
    REJECTED: '已拒绝',
    CANCELLED: '已取消'
  }
  return map[status] || status || '-'
}

const getImageSrc = (image) => {
  if (!image) return '/files/facility/default-facility.svg'
  if (image.startsWith('http') || image.startsWith('/')) return image
  return `http://localhost:8081/api/files/${image}`
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('zh-CN')
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

const formatRange = (start, end) => {
  if (!start || !end) return '-'
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleDateString('zh-CN')} ${startDate.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })} - ${endDate.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })}`
}

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const amount = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  if (Number.isNaN(amount)) return '-'
  return `¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`
}
</script>

<style scoped>
.facility-theme {
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(circle at top left, var(--feature-soft), transparent 24%),
    linear-gradient(180deg, var(--layout-shell-top) 0%, var(--layout-shell-bottom) 100%);
}

.page-hero,
.control-card,
.panel-card {
  animation: rise-in 0.55s ease both;
}

.page-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px;
  gap: 20px;
  align-items: stretch;
  padding: 28px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid var(--feature-soft);
  box-shadow: 0 24px 60px var(--feature-glow);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--feature-soft);
  color: var(--feature-primary);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 14px 0 10px;
  color: #102a27;
  font-size: 32px;
}

.hero-copy p {
  margin: 0;
  color: #52606d;
  line-height: 1.75;
}

.hero-badge {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 22px 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--feature-surface) 0%, #ffffff 100%);
  border: 1px solid var(--feature-soft);
}

.hero-badge span,
.hero-badge small {
  color: #5f6b75;
}

.hero-badge strong {
  margin: 10px 0 4px;
  color: #102a27;
  font-size: 36px;
  line-height: 1;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.summary-card {
  padding: 18px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(17, 24, 39, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 46px rgba(17, 24, 39, 0.1);
}

.summary-label {
  color: #6b7280;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  color: #0f172a;
  font-size: 28px;
}

.control-card,
.panel-card {
  margin-top: 20px;
  padding: 22px 24px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 42px rgba(17, 24, 39, 0.08);
}

.control-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.control-copy h2,
.panel-header h2 {
  margin: 0;
  color: #102a27;
  font-size: 20px;
}

.control-copy p,
.panel-header p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.7;
}

.control-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.action-btn {
  min-height: 42px;
  padding: 0 18px;
  border-radius: 14px;
  border: none;
  font-weight: 600;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.search-btn {
  background: linear-gradient(135deg, var(--feature-primary) 0%, #4d8761 100%);
}

.create-btn {
  background: linear-gradient(135deg, #6fb985 0%, var(--feature-primary) 100%);
}

.upload-btn {
  border-radius: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.facility-cell {
  display: flex;
  align-items: center;
  gap: 14px;
}

.facility-thumb {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--feature-surface);
}

.facility-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.facility-copy {
  min-width: 0;
}

.facility-name {
  color: #0f172a;
  font-weight: 700;
}

.facility-meta {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}

.row-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.row-btn {
  min-width: 76px;
  border-radius: 999px;
  font-weight: 600;
}

.detail-btn {
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.14);
}

.delete-btn {
  border-color: rgba(220, 38, 38, 0.28);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.facility-detail-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}

.detail-layout {
  display: grid;
  gap: 22px;
}

.detail-hero {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--feature-surface) 0%, #ffffff 100%);
}

.detail-hero img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 20px;
}

.detail-hero-copy h2 {
  margin: 12px 0 10px;
  color: #102a27;
}

.detail-hero-copy p {
  margin: 0;
  color: #56616b;
  line-height: 1.7;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.detail-info-card {
  padding: 16px;
  border-radius: 18px;
  background: var(--feature-surface);
  border: 1px solid var(--feature-soft);
}

.detail-label {
  display: block;
  color: #6b7280;
  font-size: 12px;
}

.detail-info-card strong {
  display: block;
  margin-top: 10px;
  color: #102a27;
  line-height: 1.5;
}

.timeline-panel {
  padding: 18px;
  border-radius: 24px;
  background: var(--feature-surface);
  border: 1px solid var(--feature-soft);
}

.section-title {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title h3 {
  margin: 0;
  color: #0f172a;
}

.section-title span {
  color: #6b7280;
  font-size: 12px;
}

.timeline-list {
  display: grid;
  gap: 14px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 14px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  margin-top: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--feature-primary), var(--feature-secondary));
  box-shadow: 0 0 0 6px var(--feature-glow);
}

.timeline-content {
  padding: 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid var(--feature-soft);
}

.timeline-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline-content p {
  margin: 10px 0 6px;
  color: #1f2937;
}

.timeline-content span {
  color: #6b7280;
  font-size: 12px;
}

.timeline-empty {
  padding: 28px 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px dashed var(--feature-soft);
  color: #6b7280;
  text-align: center;
}

.image-name {
  margin-left: 10px;
  color: #667085;
  font-size: 12px;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1200px) {
  .summary-grid,
  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .page-hero,
  .control-card,
  .detail-hero {
    grid-template-columns: 1fr;
  }

  .control-card {
    align-items: stretch;
  }

  .control-actions {
    justify-content: flex-start;
  }

  .search-input {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .facility-theme {
    padding: 16px;
  }

  .summary-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .row-actions {
    flex-wrap: wrap;
  }
}
</style>
