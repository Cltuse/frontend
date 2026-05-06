<template>
  <div class="admin-reservation-page" :style="themeVars">
    <section class="page-hero">
      <div class="hero-copy">
        <span class="hero-eyebrow">Reservation</span>
        <h1>预约记录管理</h1>
        <p>统一查看、筛选和维护预约记录，也可以直接编辑未签到的待审核/已通过预约。</p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" class="primary-btn" @click="loadReservationList">刷新列表</el-button>
        <el-button class="secondary-btn" @click="handleClearSearch">清空筛选</el-button>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">预约总数</span>
        <strong>{{ stats.total }}</strong>
        <p>系统内全部预约记录</p>
      </article>
      <article class="stat-card warning-card">
        <span class="stat-label">待审核</span>
        <strong>{{ stats.pending }}</strong>
        <p>等待管理员处理的预约申请</p>
      </article>
      <article class="stat-card success-card">
        <span class="stat-label">已通过</span>
        <strong>{{ stats.approved }}</strong>
        <p>已进入执行流程的预约</p>
      </article>
      <article class="stat-card info-card">
        <span class="stat-label">已完成</span>
        <strong>{{ stats.completed }}</strong>
        <p>已完成或归档的预约记录</p>
      </article>
    </section>

    <section class="control-card">
      <div class="section-copy">
        <h2>筛选与检索</h2>
        <p>按预约状态、设施名称或申请人快速定位目标记录。</p>
      </div>

      <el-tabs v-model="activeTab" class="status-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="待审核" name="PENDING" />
        <el-tab-pane label="已通过" name="APPROVED" />
        <el-tab-pane label="已完成" name="COMPLETED" />
        <el-tab-pane label="已拒绝" name="REJECTED" />
        <el-tab-pane label="全部" name="ALL" />
      </el-tabs>

      <div class="search-toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索设施名称或申请人"
          class="search-input"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleClearSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <div class="search-buttons">
          <el-button type="primary" class="primary-btn small-btn" @click="handleSearch">搜索</el-button>
          <el-button class="secondary-btn small-btn" @click="handleClearSearch">重置</el-button>
        </div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-head">
        <div class="section-copy">
          <h2>预约记录列表</h2>
          <p>支持查看详情与编辑预约时间、用途和备注。</p>
        </div>
        <div class="panel-meta">
          <span class="meta-chip">共 {{ total }} 条</span>
          <span class="meta-chip muted-chip">当前页 {{ reservationList.length }} 条</span>
        </div>
      </div>

      <el-table
        :data="reservationList"
        v-loading="loading"
        class="reservation-table"
        empty-text="当前没有符合条件的预约记录"
        @row-click="handleRowClick"
      >
        <el-table-column prop="facilityName" label="设施名称" min-width="160" />
        <el-table-column prop="userName" label="申请人" min-width="120" />
        <el-table-column prop="startTime" label="开始时间" min-width="170" />
        <el-table-column prop="endTime" label="结束时间" min-width="170" />
        <el-table-column prop="purpose" label="使用用途" min-width="200" show-overflow-tooltip />
        <el-table-column prop="verificationCode" label="核销码" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.verificationCode" type="info" effect="plain" round>{{ row.verificationCode }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="checkinStatus" label="签到状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getCheckinStatusType(row.checkinStatus)" effect="light" round>
              {{ getCheckinStatusText(row.checkinStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="预约状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="light" round>
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" type="primary" plain class="view-btn" @click.stop="handleRowClick(row)">
                查看
              </el-button>
              <el-button size="small" plain class="edit-btn" @click.stop="handleEdit(row)">
                编辑
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-if="total > 0"
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </section>

    <el-dialog v-model="detailDialogVisible" width="760px" class="detail-dialog" :show-close="false">
      <template #header>
        <div class="dialog-header">
          <div class="dialog-badge">
            <el-icon><Document /></el-icon>
          </div>
          <div>
            <h3>预约详情</h3>
            <p>{{ currentRow?.facilityName || '预约记录' }}</p>
          </div>
        </div>
      </template>

      <div v-if="currentRow" class="detail-layout">
        <section class="detail-summary-grid">
          <article class="detail-summary-card">
            <span>申请人</span>
            <strong>{{ currentRow.userName }}</strong>
          </article>
          <article class="detail-summary-card">
            <span>预约状态</span>
            <strong>{{ getStatusText(currentRow.status) }}</strong>
          </article>
          <article class="detail-summary-card">
            <span>签到状态</span>
            <strong>{{ getCheckinStatusText(currentRow.checkinStatus) }}</strong>
          </article>
          <article class="detail-summary-card">
            <span>核销码</span>
            <strong>{{ currentRow.verificationCode || '未生成' }}</strong>
          </article>
        </section>

        <section class="detail-panel">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="设施名称">{{ currentRow.facilityName }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ currentRow.userName }}</el-descriptions-item>
            <el-descriptions-item label="开始时间">{{ currentRow.startTime }}</el-descriptions-item>
            <el-descriptions-item label="结束时间">{{ currentRow.endTime }}</el-descriptions-item>
            <el-descriptions-item label="预约状态">
              <el-tag :type="getStatusType(currentRow.status)" effect="light" round>
                {{ getStatusText(currentRow.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="签到状态">
              <el-tag :type="getCheckinStatusType(currentRow.checkinStatus)" effect="light" round>
                {{ getCheckinStatusText(currentRow.checkinStatus) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="currentRow.verifiedByName" label="核销人">
              {{ currentRow.verifiedByName }}
            </el-descriptions-item>
            <el-descriptions-item v-if="currentRow.checkinTime" label="签到时间">
              {{ currentRow.checkinTime }}
            </el-descriptions-item>
            <el-descriptions-item v-if="currentRow.checkoutTime" label="签退时间">
              {{ currentRow.checkoutTime }}
            </el-descriptions-item>
            <el-descriptions-item label="使用用途" :span="2">
              {{ currentRow.purpose || '无' }}
            </el-descriptions-item>
            <el-descriptions-item label="审核备注" :span="2">
              {{ currentRow.adminRemark || '无' }}
            </el-descriptions-item>
          </el-descriptions>
        </section>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" plain class="view-btn" @click="handleEdit(currentRow)">编辑预约</el-button>
          <el-button class="secondary-btn" @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialogVisible" width="680px" class="detail-dialog" :show-close="false">
      <template #header>
        <div class="dialog-header">
          <div class="dialog-badge">
            <el-icon><Document /></el-icon>
          </div>
          <div>
            <h3>编辑预约</h3>
            <p>{{ editForm.facilityName || '预约记录' }}</p>
          </div>
        </div>
      </template>

      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-position="top" class="edit-form">
        <div class="edit-form-grid">
          <el-form-item label="设施名称">
            <el-input :model-value="editForm.facilityName" disabled />
          </el-form-item>
          <el-form-item label="申请人">
            <el-input :model-value="editForm.userName" disabled />
          </el-form-item>
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="editForm.startTime"
              type="datetime"
              placeholder="选择开始时间"
              style="width: 100%"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
            />
          </el-form-item>
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker
              v-model="editForm.endTime"
              type="datetime"
              placeholder="选择结束时间"
              style="width: 100%"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
            />
          </el-form-item>
        </div>

        <el-form-item label="使用用途" prop="purpose">
          <el-input
            v-model="editForm.purpose"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="请输入预约用途"
          />
        </el-form-item>

        <el-form-item label="管理员备注" prop="adminRemark">
          <el-input
            v-model="editForm.adminRemark"
            type="textarea"
            :rows="3"
            maxlength="300"
            show-word-limit
            placeholder="可选：记录编辑原因或补充说明"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button class="secondary-btn" @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" class="primary-btn" :loading="savingEdit" @click="handleSaveEdit">
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, Search } from '@element-plus/icons-vue';
import { reservationAPI } from '../../api';
import { buildFeatureVars, getRoleTheme } from '../../utils/featureTheme';

const themeVars = computed(() => ({
  ...buildFeatureVars(getRoleTheme('admin'))
}));

const loading = ref(false);
const savingEdit = ref(false);
const activeTab = ref('PENDING');
const searchKeyword = ref('');
const isSearchMode = ref(false);
const reservationList = ref([]);
const allReservations = ref([]);
const total = ref(0);
const detailDialogVisible = ref(false);
const editDialogVisible = ref(false);
const currentRow = ref(null);
const editFormRef = ref(null);

const pagination = ref({
  page: 1,
  size: 10
});

const editForm = ref({
  id: null,
  facilityName: '',
  userName: '',
  startTime: '',
  endTime: '',
  purpose: '',
  adminRemark: ''
});

function validateEditStart(rule, value, callback) {
  if (!value) {
    callback(new Error('请选择开始时间'));
    return;
  }
  if (new Date(value) < new Date()) {
    callback(new Error('开始时间不能早于当前时间'));
    return;
  }
  callback();
}

function validateEditEnd(rule, value, callback) {
  if (!value) {
    callback(new Error('请选择结束时间'));
    return;
  }
  if (editForm.value.startTime && new Date(value) <= new Date(editForm.value.startTime)) {
    callback(new Error('结束时间必须晚于开始时间'));
    return;
  }
  callback();
}

const editRules = {
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' },
    { validator: validateEditStart, trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    { validator: validateEditEnd, trigger: 'change' }
  ],
  purpose: [{ required: true, message: '请输入预约用途', trigger: 'blur' }]
};

const stats = computed(() => ({
  total: allReservations.value.length,
  pending: allReservations.value.filter((item) => item.status === 'PENDING').length,
  approved: allReservations.value.filter((item) => item.status === 'APPROVED').length,
  completed: allReservations.value.filter((item) => item.status === 'COMPLETED').length
}));

onMounted(() => {
  loadReservationList();
});

async function loadReservationList() {
  try {
    loading.value = true;
    const res = await reservationAPI.list();
    const source = Array.isArray(res.data) ? res.data : [];
    allReservations.value = source;

    let filtered = source;
    if (activeTab.value !== 'ALL') {
      filtered = filtered.filter((item) => item.status === activeTab.value);
    }

    if (isSearchMode.value && searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.facilityName && item.facilityName.toLowerCase().includes(keyword)) ||
          (item.userName && item.userName.toLowerCase().includes(keyword))
      );
    }

    total.value = filtered.length;
    const startIndex = (pagination.value.page - 1) * pagination.value.size;
    const endIndex = startIndex + pagination.value.size;
    reservationList.value = filtered.slice(startIndex, endIndex);
  } catch (error) {
    console.error('加载预约列表失败:', error);
    ElMessage.error('加载预约列表失败');
  } finally {
    loading.value = false;
  }
}

function handleTabChange() {
  pagination.value.page = 1;
  loadReservationList();
}

function handleSearch() {
  pagination.value.page = 1;
  isSearchMode.value = Boolean(searchKeyword.value.trim());
  loadReservationList();
}

function handleClearSearch() {
  searchKeyword.value = '';
  isSearchMode.value = false;
  pagination.value.page = 1;
  loadReservationList();
}

function handleSizeChange(size) {
  pagination.value.size = size;
  pagination.value.page = 1;
  loadReservationList();
}

function handleCurrentChange(page) {
  pagination.value.page = page;
  loadReservationList();
}

function handleRowClick(row) {
  currentRow.value = row;
  detailDialogVisible.value = true;
}

function handleEdit(row) {
  if (!row) {
    return;
  }

  editForm.value = {
    id: row.id,
    facilityName: row.facilityName || '',
    userName: row.userName || '',
    startTime: row.startTime || '',
    endTime: row.endTime || '',
    purpose: row.purpose || '',
    adminRemark: row.adminRemark || ''
  };
  editDialogVisible.value = true;
  editFormRef.value?.clearValidate();
}

async function handleSaveEdit() {
  try {
    await editFormRef.value?.validate();
    savingEdit.value = true;

    const payload = {
      startTime: editForm.value.startTime,
      endTime: editForm.value.endTime,
      purpose: editForm.value.purpose,
      adminRemark: editForm.value.adminRemark
    };

    const res = await reservationAPI.update(editForm.value.id, payload);
    const updatedRow = res.data || { ...payload, id: editForm.value.id };

    ElMessage.success(res.message || '预约更新成功');
    editDialogVisible.value = false;

    if (currentRow.value?.id === editForm.value.id) {
      currentRow.value = {
        ...currentRow.value,
        ...updatedRow
      };
    }

    await loadReservationList();
  } catch (error) {
    console.error('更新预约失败:', error);
    ElMessage.error(error.response?.data?.message || error.message || '更新预约失败');
  } finally {
    savingEdit.value = false;
  }
}

const getStatusType = (status) =>
  ({
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
    COMPLETED: 'info',
    CANCELLED: 'info'
  })[status] || '';

const getStatusText = (status) =>
  ({
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  })[status] || status;

const getCheckinStatusType = (status) =>
  ({
    NOT_CHECKED: 'info',
    CHECKED_IN: 'success',
    CHECKED_OUT: 'success',
    MISSED: 'danger'
  })[status] || '';

const getCheckinStatusText = (status) =>
  ({
    NOT_CHECKED: '未签到',
    CHECKED_IN: '已签到',
    CHECKED_OUT: '已签退',
    MISSED: '爽约'
  })[status] || status;
</script>

<style scoped>
.admin-reservation-page {
  min-height: 100%;
  display: grid;
  gap: 20px;
  background:
    radial-gradient(circle at top left, rgba(226, 236, 249, 0.72), transparent 26%),
    radial-gradient(circle at right center, rgba(240, 249, 252, 0.92), transparent 24%),
    linear-gradient(180deg, #f9fbff 0%, #f5f8fd 48%, #f3f7fc 100%);
}

.page-hero,
.stat-card,
.control-card,
.panel-card,
.detail-panel,
.detail-summary-card {
  border-radius: 28px;
  border: 1px solid var(--feature-border);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 22px 50px var(--feature-glow);
}

.page-hero,
.control-card,
.panel-card {
  padding: 28px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.hero-eyebrow {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--feature-soft);
  color: var(--feature-strong);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hero-copy h1,
.section-copy h2 {
  margin: 14px 0 10px;
  color: #23344d;
}

.hero-copy p,
.section-copy p,
.stat-card p {
  margin: 0;
  color: #667892;
  line-height: 1.7;
}

.hero-actions,
.search-buttons,
.dialog-footer,
.table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.primary-btn,
.secondary-btn,
.small-btn,
.view-btn,
.edit-btn {
  border-radius: 14px;
  font-weight: 600;
}

.primary-btn {
  min-height: 44px;
}

.secondary-btn {
  min-height: 44px;
  border: 1px solid var(--feature-border);
  background: rgba(255, 255, 255, 0.92);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 22px 20px;
  display: grid;
  gap: 8px;
}

.stat-card strong {
  font-size: 34px;
  color: #23344d;
}

.warning-card strong {
  color: #d88b35;
}

.success-card strong {
  color: #4d9c73;
}

.info-card strong {
  color: #5486c7;
}

.stat-label,
.meta-chip {
  font-size: 13px;
  font-weight: 600;
  color: #70839f;
}

.status-tabs {
  margin-top: 18px;
}

.search-toolbar {
  margin-top: 18px;
  display: flex;
  gap: 14px;
  align-items: center;
}

.search-input {
  flex: 1;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.panel-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(240, 245, 255, 0.92);
}

.muted-chip {
  color: #8a9ab0;
}

.reservation-table :deep(.el-table__row) {
  cursor: pointer;
}

.pagination-wrap {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.dialog-header {
  display: flex;
  gap: 14px;
  align-items: center;
}

.dialog-header h3 {
  margin: 0 0 6px;
  color: #23344d;
}

.dialog-header p {
  margin: 0;
  color: #70839f;
}

.dialog-badge {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--feature-soft);
  color: var(--feature-strong);
}

.detail-layout {
  display: grid;
  gap: 18px;
}

.detail-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.detail-summary-card {
  padding: 18px;
  display: grid;
  gap: 8px;
}

.detail-summary-card span {
  color: #70839f;
  font-size: 13px;
}

.detail-summary-card strong {
  color: #23344d;
  font-size: 20px;
}

.detail-panel {
  padding: 18px;
}

.edit-form {
  display: grid;
  gap: 8px;
}

.edit-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.edit-btn {
  border-color: rgba(122, 153, 214, 0.35);
  color: #4a74b6;
}

@media (max-width: 1100px) {
  .stats-grid,
  .detail-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-hero,
  .search-toolbar,
  .panel-head {
    flex-direction: column;
  }

  .stats-grid,
  .detail-summary-grid,
  .edit-form-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .pagination-wrap {
    justify-content: flex-start;
  }
}
</style>
