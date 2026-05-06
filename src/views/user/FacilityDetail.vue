<template>
  <div class="facility-detail-page">
    <section class="hero-card">
      <div class="hero-top">
        <el-button class="back-btn" @click="goBack">返回设施列表</el-button>
        <el-tag
          v-if="facility"
          :type="getStatusType(facility.status)"
          effect="light"
          round
          class="status-tag"
        >
          {{ getStatusText(facility.status) }}
        </el-tag>
      </div>

      <div v-if="facility" class="hero-content">
        <div class="hero-copy">
          <span class="hero-kicker">设施预约详情</span>
          <h1>{{ facility.name }}</h1>
          <p>{{ facility.description || '这里展示设施详情、预约规则以及未来七天的预约时段明细。' }}</p>
          <div class="hero-actions">
            <el-button
              type="primary"
              class="primary-btn"
              :disabled="facility.status !== 'AVAILABLE'"
              @click="handleReserve"
            >
              立即预约
            </el-button>
            <el-button class="secondary-btn" @click="scrollToTimeline">查看时段明细</el-button>
          </div>
        </div>

        <div class="hero-media">
          <img v-if="facility.imageUrl" :src="facility.imageUrl" :alt="facility.name" class="hero-image" />
          <div v-else class="hero-fallback">设施</div>
        </div>
      </div>

      <div v-else class="hero-empty">
        <h1>设施详情</h1>
        <p>正在获取设施信息...</p>
      </div>
    </section>

    <section v-if="loading" class="loading-card">
      <el-icon class="is-loading loading-icon"><Loading /></el-icon>
      <p>正在加载设施详情与预约时段...</p>
    </section>

    <template v-else-if="facility">
      <section class="summary-grid">
        <article class="summary-card">
          <span class="summary-label">设施分类</span>
          <strong>{{ facility.category || '未分类' }}</strong>
          <p>当前设施所属分类</p>
        </article>
        <article class="summary-card">
          <span class="summary-label">未来七天空闲时长</span>
          <strong>{{ availableDurationText }}</strong>
          <p>按 1 小时粒度统计的可预约总时长</p>
        </article>
        <article class="summary-card">
          <span class="summary-label">未来七天已占用时长</span>
          <strong>{{ occupiedDurationText }}</strong>
          <p>含待审批和已通过的有效预约占用</p>
        </article>
        <article class="summary-card">
          <span class="summary-label">预约时段粒度</span>
          <strong>{{ formatMinutes(slotMinutes) }}</strong>
          <p>时段明细统一按 1 小时展示</p>
        </article>
      </section>

      <section class="content-grid">
        <article class="info-card">
          <div class="section-head">
            <h2>基础信息</h2>
            <p>统一查看设施资料、规则和说明，预约前可以先确认开放时间与时长限制。</p>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <label>设施名称</label>
              <strong>{{ facility.name }}</strong>
            </div>
            <div class="info-item">
              <label>设施型号</label>
              <strong>{{ facility.model || '未填写' }}</strong>
            </div>
            <div class="info-item">
              <label>设施分类</label>
              <strong>{{ facility.category || '未分类' }}</strong>
            </div>
            <div class="info-item">
              <label>存放位置</label>
              <strong>{{ facility.location || '未填写' }}</strong>
            </div>
            <div class="info-item">
              <label>购入日期</label>
              <strong>{{ facility.purchaseDate || '未填写' }}</strong>
            </div>
            <div class="info-item">
              <label>参考价格</label>
              <strong>{{ formatPrice(facility.price) }}</strong>
            </div>
          </div>

          <div class="description-box">
            <h3>详细描述</h3>
            <p>{{ facility.description || '暂无设施详细说明。' }}</p>
          </div>

          <div class="rule-section">
            <div class="section-head compact-head">
              <h2>预约规则</h2>
              <p>提交预约前先确认开放时段、最短时长、预约提前期与审批要求。</p>
            </div>

            <div v-if="ruleConfigLoading" class="rule-loading">正在加载设施预约规则...</div>
            <div v-else-if="currentRuleConfig" class="rule-grid">
              <article class="rule-item">
                <span>适用规则</span>
                <strong>{{ currentRuleConfig.categoryName || facility.category || '全局默认' }}</strong>
              </article>
              <article class="rule-item">
                <span>开放时段</span>
                <strong>{{ formatRuleTime(currentRuleConfig.openTime) }} - {{ formatRuleTime(currentRuleConfig.closeTime) }}</strong>
              </article>
              <article class="rule-item">
                <span>可预约时长</span>
                <strong>{{ formatMinutes(currentRuleConfig.minDurationMinutes) }} - {{ formatMinutes(currentRuleConfig.maxDurationMinutes) }}</strong>
              </article>
              <article class="rule-item">
                <span>时间粒度</span>
                <strong>{{ formatMinutes(slotMinutes) }}</strong>
              </article>
              <article class="rule-item">
                <span>提前预约</span>
                <strong>最多 {{ currentRuleConfig.advanceDaysMax }} 天</strong>
              </article>
              <article class="rule-item">
                <span>取消截止</span>
                <strong>开始前 {{ formatMinutes(currentRuleConfig.cancelDeadlineMinutes) }}</strong>
              </article>
              <article class="rule-item">
                <span>当天预约</span>
                <strong>{{ currentRuleConfig.allowSameDayBooking ? '允许' : '不允许' }}</strong>
              </article>
              <article class="rule-item">
                <span>审批要求</span>
                <strong>{{ currentRuleConfig.needApproval ? '需要管理员审批' : '无需额外审批' }}</strong>
              </article>
            </div>
            <p v-else class="rule-empty">当前未匹配到特殊预约规则，可按系统默认规则安排预约。</p>
          </div>
        </article>

        <article ref="timelineSection" class="timeline-card">
          <div class="section-head timeline-head">
            <div>
              <h2>未来七天时段明细</h2>
              <p>未来七天统一放在一张总表里，不再按每天拆块，方便直接横向比较同一时段的空闲情况。</p>
            </div>
            <div class="timeline-summary">
              <span class="meta-chip">可约 {{ availableFutureSlotCount }}/{{ futureSlotCount }} 时段</span>
              <span class="meta-chip muted-chip">占用率 {{ occupiedRateText }}</span>
            </div>
          </div>

          <div class="schedule-shell">
            <div class="schedule-table">
              <div class="schedule-header schedule-row">
                <div class="schedule-time-head">时段</div>
                <div
                  v-for="header in scheduleHeaders"
                  :key="header.dateKey"
                  class="schedule-day-head"
                >
                  <strong>{{ header.dateStr }}</strong>
                  <span>{{ header.weekDay }}</span>
                </div>
              </div>

              <div
                v-for="row in scheduleRows"
                :key="row.time"
                class="schedule-row schedule-data-row"
              >
                <div class="schedule-time-cell">{{ row.time }}</div>
                <div
                  v-for="cell in row.cells"
                  :key="`${row.time}-${cell.dateKey}`"
                  class="schedule-cell"
                  :class="getSlotClass(cell.slot)"
                >
                  <span class="cell-status">{{ getSlotLabel(cell.slot) }}</span>
                  <el-tooltip
                    v-if="cell.slot?.reservation"
                    :content="`${cell.slot.reservation.startTime} - ${cell.slot.reservation.endTime} | 预约人：${cell.slot.reservation.userName || '未知'} | 用途：${cell.slot.reservation.purpose || '未填写'}`"
                    placement="top"
                  >
                    <span class="slot-detail">详情</span>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </template>

    <section v-else class="empty-card">
      <h2>未找到设施</h2>
      <p>你访问的设施不存在，或已被删除。</p>
      <el-button type="primary" class="primary-btn" @click="goBack">返回设施列表</el-button>
    </section>

    <el-dialog v-model="dialogVisible" width="620px" class="reserve-dialog" :show-close="false">
      <div class="dialog-header">
        <span class="dialog-kicker">提交预约</span>
        <h3>{{ facility?.name || '设施预约' }}</h3>
      </div>

      <div class="dialog-body">
        <div class="dialog-facility-card">
          <strong>{{ facility?.name }}</strong>
          <span>{{ facility?.model || '未填写型号' }} · {{ facility?.location || '未填写位置' }}</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
          <div class="form-grid">
            <el-form-item label="开始时间" prop="startTime">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="选择开始日期时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
                format="YYYY-MM-DD HH:mm"
                :disabled-date="disabledStartDate"
                @change="checkAvailability"
              />
            </el-form-item>
            <el-form-item label="结束时间" prop="endTime">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                placeholder="选择结束日期时间"
                style="width: 100%"
                value-format="YYYY-MM-DD HH:mm:ss"
                format="YYYY-MM-DD HH:mm"
                :disabled-date="disabledEndDate"
                @change="checkAvailability"
              />
            </el-form-item>
          </div>

          <el-form-item label="使用目的" prop="purpose">
            <el-input
              v-model="form.purpose"
              type="textarea"
              :rows="4"
              maxlength="500"
              show-word-limit
              placeholder="请简要描述使用目的和活动内容"
            />
          </el-form-item>

          <div
            v-if="form.startTime && form.endTime"
            class="availability-bar"
            :class="isTimeAvailable ? 'available' : 'unavailable'"
          >
            <span v-if="checkingAvailability">正在检查时间可用性...</span>
            <span v-else>{{ availabilityMessage || '请继续填写预约信息' }}</span>
          </div>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button class="secondary-btn" @click="dialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            class="primary-btn"
            :disabled="!isTimeAvailable || checkingAvailability"
            @click="handleSubmit"
          >
            提交预约
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import { facilityAPI, reservationAPI, userClientAPI } from '../../api';
import { normalizeUserMessage } from '../../utils/messageText';
import { findApplicableRuleConfig, formatMinutes, formatRuleTime } from '../../utils/facilityRules';

const DEFAULT_OPEN_MINUTES = 8 * 60;
const DEFAULT_CLOSE_MINUTES = 23 * 60;
const DEFAULT_SLOT_MINUTES = 60;

const route = useRoute();
const router = useRouter();

const facility = ref(null);
const reservations = ref([]);
const ruleConfigs = ref([]);
const queryDays = ref(7);
const loading = ref(true);
const ruleConfigLoading = ref(false);
const dialogVisible = ref(false);
const formRef = ref(null);
const timelineSection = ref(null);
const userInfo = ref({});
const checkingAvailability = ref(false);
const isTimeAvailable = ref(true);
const availabilityMessage = ref('');

const currentRuleConfig = computed(() => findApplicableRuleConfig(ruleConfigs.value, facility.value?.category));
const slotMinutes = computed(() => DEFAULT_SLOT_MINUTES);
const bookingStartMinutes = computed(() => parseTimeToMinutes(currentRuleConfig.value?.openTime, DEFAULT_OPEN_MINUTES));
const bookingEndMinutes = computed(() => {
  const value = parseTimeToMinutes(currentRuleConfig.value?.closeTime, DEFAULT_CLOSE_MINUTES);
  return value > bookingStartMinutes.value ? value : bookingStartMinutes.value + DEFAULT_SLOT_MINUTES;
});

const form = ref({
  facilityId: null,
  userId: null,
  startTime: '',
  endTime: '',
  purpose: ''
});

const rules = {
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' },
    { validator: validateStartTime, trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    { validator: validateEndTime, trigger: 'change' }
  ],
  purpose: [{ required: true, message: '请输入使用目的', trigger: 'blur' }]
};

const normalizedReservations = computed(() => (
  reservations.value
    .map((item) => {
      const startDate = toDate(item.startTime);
      const endDate = toDate(item.endTime);
      if (!startDate || !endDate || endDate <= startDate) {
        return null;
      }

      return {
        ...item,
        startDate,
        endDate
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.startDate - b.startDate)
));

const timelineDays = computed(() => {
  const days = [];
  const now = new Date();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  for (let index = 0; index < queryDays.value; index += 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);

    const dayReservations = getReservationsForDay(date);
    const slots = [];

    for (let minute = bookingStartMinutes.value; minute < bookingEndMinutes.value; minute += slotMinutes.value) {
      const nextMinute = Math.min(minute + slotMinutes.value, bookingEndMinutes.value);
      const slotStart = buildDateAtMinutes(date, minute);
      const slotEnd = buildDateAtMinutes(date, nextMinute);
      const reservation = dayReservations.find((item) => item.startDate < slotEnd && item.endDate > slotStart);

      slots.push({
        time: `${formatMinute(minute)} - ${formatMinute(nextMinute)}`,
        occupied: Boolean(reservation),
        isPast: slotEnd <= now,
        reservation
      });
    }

    days.push({
      dateKey: formatDateKey(date),
      dateStr: `${date.getMonth() + 1}/${date.getDate()}`,
      weekDay: weekDays[date.getDay()],
      slots
    });
  }

  return days;
});

const scheduleHeaders = computed(() => (
  timelineDays.value.map((day) => ({
    dateKey: day.dateKey,
    dateStr: day.dateStr,
    weekDay: day.weekDay
  }))
));

const scheduleRows = computed(() => {
  const maxSlotCount = timelineDays.value.reduce((count, day) => Math.max(count, day.slots.length), 0);
  return Array.from({ length: maxSlotCount }, (_, index) => ({
    time: timelineDays.value[0]?.slots[index]?.time || '',
    cells: timelineDays.value.map((day) => ({
      dateKey: day.dateKey,
      slot: day.slots[index] || null
    }))
  }));
});

const futureSlotCount = computed(() => (
  timelineDays.value.reduce((count, day) => count + day.slots.filter((slot) => !slot.isPast).length, 0)
));
const availableFutureSlotCount = computed(() => (
  timelineDays.value.reduce((count, day) => count + day.slots.filter((slot) => !slot.occupied && !slot.isPast).length, 0)
));
const occupiedFutureSlotCount = computed(() => (
  timelineDays.value.reduce((count, day) => count + day.slots.filter((slot) => slot.occupied && !slot.isPast).length, 0)
));
const availableDurationText = computed(() => formatDuration(availableFutureSlotCount.value * slotMinutes.value));
const occupiedDurationText = computed(() => formatDuration(occupiedFutureSlotCount.value * slotMinutes.value));
const occupiedRateText = computed(() => (
  futureSlotCount.value ? `${Math.round((occupiedFutureSlotCount.value / futureSlotCount.value) * 100)}%` : '0%'
));

watch(
  () => route.params.id,
  () => {
    reloadPageData();
  }
);

onMounted(() => {
  const localUserInfo = localStorage.getItem('userInfo');
  if (localUserInfo) {
    userInfo.value = JSON.parse(localUserInfo);
  }

  reloadPageData();
});

async function reloadPageData() {
  await Promise.all([loadFacilityDetail(), loadRuleConfigs()]);
}

async function checkAvailability() {
  if (!form.value.startTime || !form.value.endTime || !form.value.facilityId) {
    isTimeAvailable.value = true;
    availabilityMessage.value = '';
    return;
  }

  try {
    checkingAvailability.value = true;
    const response = await reservationAPI.checkAvailability(
      form.value.facilityId,
      form.value.startTime,
      form.value.endTime
    );

    if (response.data) {
      isTimeAvailable.value = response.data.available;
      availabilityMessage.value = normalizeUserMessage(
        response.data.message,
        response.data.available ? '当前时段可以预约。' : '当前时段已被占用，请重新选择。'
      );
    }
  } catch (error) {
    console.error('检查可用性失败:', error);
    isTimeAvailable.value = true;
    availabilityMessage.value = '';
  } finally {
    checkingAvailability.value = false;
  }
}

function validateStartTime(rule, value, callback) {
  if (!value) {
    callback(new Error('请选择开始时间'));
    return;
  }

  const startDate = new Date(value);
  if (startDate < new Date()) {
    callback(new Error('开始时间不能早于当前时间'));
    return;
  }

  callback();
}

function validateEndTime(rule, value, callback) {
  if (!value) {
    callback(new Error('请选择结束时间'));
    return;
  }

  if (!form.value.startTime) {
    callback();
    return;
  }

  const endDate = new Date(value);
  const startDate = new Date(form.value.startTime);
  if (endDate <= startDate) {
    callback(new Error('结束时间必须晚于开始时间'));
    return;
  }

  callback();
}

function disabledStartDate(time) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return time.getTime() < today.getTime();
}

function disabledEndDate(time) {
  if (!form.value.startTime) {
    return false;
  }

  const startDate = new Date(form.value.startTime);
  startDate.setHours(0, 0, 0, 0);
  return time.getTime() < startDate.getTime();
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeToMinutes(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return fallback;
  }

  const colonMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    return hour * 60 + minute;
  }

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length >= 3) {
    const hour = Number(digitsOnly.slice(0, 2));
    const minute = Number(digitsOnly.slice(2, 4) || '0');
    return hour * 60 + minute;
  }

  if (/^\d{1,2}$/.test(normalized)) {
    return Number(normalized) * 60;
  }

  return fallback;
}

function buildDateAtMinutes(baseDate, minutes) {
  const result = new Date(baseDate);
  result.setHours(0, 0, 0, 0);
  result.setMinutes(minutes, 0, 0);
  return result;
}

function formatDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function formatMinute(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  if (!minutes) {
    return '0 小时';
  }

  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} 小时` : `${hours.toFixed(1)} 小时`;
}

function getReservationsForDay(date) {
  const dayStart = buildDateAtMinutes(date, bookingStartMinutes.value);
  const dayEnd = buildDateAtMinutes(date, bookingEndMinutes.value);

  return normalizedReservations.value
    .filter((item) => item.endDate > dayStart && item.startDate < dayEnd)
    .map((item) => ({
      ...item,
      startDate: new Date(Math.max(item.startDate.getTime(), dayStart.getTime())),
      endDate: new Date(Math.min(item.endDate.getTime(), dayEnd.getTime()))
    }))
    .sort((a, b) => a.startDate - b.startDate);
}

async function loadRuleConfigs() {
  try {
    ruleConfigLoading.value = true;
    const response = await userClientAPI.getAllRuleConfigs();
    ruleConfigs.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('加载预约规则失败:', error);
    ruleConfigs.value = [];
  } finally {
    ruleConfigLoading.value = false;
  }
}

async function loadFacilityDetail() {
  try {
    loading.value = true;
    const response = await facilityAPI.getDetail(route.params.id, queryDays.value);
    if (response.code === 200) {
      facility.value = response.data?.facility || null;
      reservations.value = response.data?.reservations || [];
      queryDays.value = Number(response.data?.queryDays) || 7;
      return;
    }

    ElMessage.error(normalizeUserMessage(response.message, '设施详情加载失败，请稍后重试。'));
  } catch (error) {
    console.error('加载设施详情失败:', error);
    ElMessage.error('设施详情加载失败，请稍后重试。');
    facility.value = null;
    reservations.value = [];
  } finally {
    loading.value = false;
  }
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') {
    return '未填写';
  }

  return `￥${value}`;
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
    AVAILABLE: '可用',
    MAINTENANCE: '维护中',
    DAMAGED: '已损坏'
  };

  return statusMap[status] || status;
}

function getSlotLabel(slot) {
  if (!slot) {
    return '--';
  }

  if (slot.occupied) {
    return '已预约';
  }

  if (slot.isPast) {
    return '已过时段';
  }

  return '空闲';
}

function getSlotClass(slot) {
  if (!slot) {
    return 'slot-empty';
  }

  if (slot.occupied) {
    return 'slot-occupied';
  }

  if (slot.isPast) {
    return 'slot-past';
  }

  return 'slot-available';
}

function goBack() {
  router.push('/user/facility');
}

function scrollToTimeline() {
  timelineSection.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}

async function handleReserve() {
  if (!facility.value || facility.value.status !== 'AVAILABLE') {
    return;
  }

  form.value = {
    facilityId: facility.value.id,
    userId: userInfo.value.id,
    startTime: '',
    endTime: '',
    purpose: ''
  };
  isTimeAvailable.value = true;
  availabilityMessage.value = '';
  dialogVisible.value = true;
  await nextTick();
  formRef.value?.clearValidate();
}

async function handleSubmit() {
  try {
    await formRef.value?.validate();
    const response = await reservationAPI.create(form.value);
    ElMessage.success(normalizeUserMessage(response.message, '预约提交成功。'));
    dialogVisible.value = false;
    await loadFacilityDetail();
  } catch (error) {
    console.error('提交预约失败:', error);
    ElMessage.error(
      normalizeUserMessage(error.response?.data?.message, '预约提交失败，请稍后重试。')
    );
  }
}
</script>

<style scoped>
.facility-detail-page {
  --theme-main: #f5b7c0;
  --theme-deep: #e8909d;
  --theme-border: rgba(245, 183, 192, 0.16);
  --theme-shadow: rgba(94, 52, 62, 0.08);
  min-height: 100%;
  display: grid;
  gap: 20px;
  background:
    radial-gradient(circle at top left, rgba(245, 183, 192, 0.38), transparent 28%),
    radial-gradient(circle at right center, rgba(252, 228, 232, 0.96), transparent 24%),
    linear-gradient(180deg, #fffafb 0%, #fffdfd 100%);
}

.hero-card,
.summary-card,
.info-card,
.timeline-card,
.loading-card,
.empty-card {
  border-radius: 30px;
  border: 1px solid var(--theme-border);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 46px var(--theme-shadow);
  animation: detail-rise 0.55s ease both;
}

.hero-card {
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(245, 183, 192, 0.34), transparent 24%),
    linear-gradient(145deg, rgba(254, 248, 249, 0.96) 0%, #ffffff 64%);
}

.hero-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.back-btn,
.primary-btn,
.secondary-btn {
  min-height: 44px;
  border-radius: 14px;
}

.back-btn,
.secondary-btn {
  border: 1px solid rgba(245, 183, 192, 0.18);
  background: #ffffff;
  color: #c4677a;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #f5b7c0 0%, #e8909d 100%);
  box-shadow: 0 14px 28px rgba(232, 144, 157, 0.18);
}

.hero-content {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) 340px;
  gap: 22px;
  align-items: center;
}

.hero-kicker,
.dialog-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(245, 183, 192, 0.14);
  color: #c4677a;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.hero-copy h1 {
  margin: 16px 0 10px;
  font-size: 36px;
  color: #7a4052;
}

.hero-copy p,
.hero-empty p {
  margin: 0;
  color: #8a6a76;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 24px;
}

.hero-media {
  min-height: 260px;
  border-radius: 28px;
  overflow: hidden;
  background: linear-gradient(145deg, #fef8f9 0%, #fef0f2 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #c4677a;
  font-size: 36px;
  font-weight: 700;
}

.hero-empty {
  padding: 18px 6px 6px;
}

.hero-empty h1,
.empty-card h2 {
  margin: 0 0 10px;
  color: #7a4052;
}

.loading-card,
.empty-card {
  min-height: 260px;
  padding: 24px;
  display: grid;
  place-items: center;
  text-align: center;
}

.loading-card p,
.empty-card p {
  margin: 0;
  color: #8a6a76;
}

.loading-icon {
  font-size: 32px;
  color: #e8909d;
  margin-bottom: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  padding: 22px 20px;
  background: linear-gradient(150deg, rgba(254, 248, 249, 0.96), #ffffff 82%);
}

.summary-label {
  display: block;
  color: #8e717b;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin: 12px 0 8px;
  color: #7a4052;
  font-size: 28px;
  line-height: 1.1;
}

.summary-card p {
  margin: 0;
  color: #8e717b;
  line-height: 1.6;
}

.content-grid {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.info-card,
.timeline-card {
  padding: 24px;
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.info-card:hover,
.timeline-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 52px rgba(94, 52, 62, 0.1);
}

.timeline-card {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 0;
}

.timeline-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.timeline-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(245, 183, 192, 0.12);
  color: #c4677a;
  font-size: 13px;
  font-weight: 600;
}

.muted-chip {
  background: rgba(234, 227, 230, 0.72);
  color: #8a6a76;
}

.section-head {
  margin-bottom: 18px;
}

.section-head h2 {
  margin: 0;
  color: #7a4052;
}

.section-head p {
  margin: 8px 0 0;
  color: #8a6a76;
  line-height: 1.7;
}

.info-grid {
  display: grid;
  gap: 12px;
}

.info-item {
  padding: 16px 18px;
  border-radius: 20px;
  background: #fff8fa;
  border: 1px solid rgba(245, 183, 192, 0.14);
}

.info-item label {
  display: block;
  color: #8e717b;
  font-size: 12px;
}

.info-item strong {
  display: block;
  margin-top: 8px;
  color: #7a4052;
  line-height: 1.6;
}

.description-box {
  margin-top: 16px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 246, 248, 0.92);
}

.description-box h3 {
  margin: 0 0 10px;
  color: #7a4052;
}

.description-box p {
  margin: 0;
  color: #8a6a76;
  line-height: 1.8;
}

.compact-head {
  margin-bottom: 14px;
}

.rule-section {
  margin-top: 16px;
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 249, 250, 0.98);
  border: 1px solid rgba(245, 183, 192, 0.14);
}

.rule-loading,
.rule-empty {
  margin: 0;
  color: #8a6a76;
  line-height: 1.8;
}

.rule-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rule-item {
  padding: 14px 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(245, 183, 192, 0.14);
}

.rule-item span {
  display: block;
  color: #8e717b;
  font-size: 12px;
}

.rule-item strong {
  display: block;
  margin-top: 8px;
  color: #7a4052;
  line-height: 1.6;
}

.schedule-shell {
  min-height: 0;
  overflow: auto;
  border-radius: 24px;
  border: 1px solid rgba(245, 183, 192, 0.14);
  background: linear-gradient(180deg, rgba(255, 249, 250, 0.9), rgba(255, 255, 255, 0.98));
}

.schedule-table {
  min-width: 980px;
}

.schedule-row {
  display: grid;
  grid-template-columns: 150px repeat(7, minmax(110px, 1fr));
}

.schedule-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(255, 247, 249, 0.96);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(245, 183, 192, 0.14);
}

.schedule-time-head,
.schedule-day-head,
.schedule-time-cell,
.schedule-cell {
  padding: 14px 12px;
  border-right: 1px solid rgba(245, 183, 192, 0.12);
  border-bottom: 1px solid rgba(245, 183, 192, 0.12);
}

.schedule-row > :last-child {
  border-right: none;
}

.schedule-time-head,
.schedule-time-cell {
  background: rgba(255, 250, 251, 0.98);
}

.schedule-time-head {
  color: #8a6a76;
  font-size: 13px;
  font-weight: 700;
}

.schedule-day-head {
  display: grid;
  gap: 4px;
  text-align: center;
}

.schedule-day-head strong {
  color: #7a4052;
  font-size: 14px;
}

.schedule-day-head span {
  color: #8a6a76;
  font-size: 12px;
}

.schedule-time-cell {
  color: #7a4052;
  font-size: 13px;
  font-weight: 600;
}

.schedule-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.cell-status {
  font-weight: 600;
}

.slot-available {
  background: linear-gradient(135deg, #eefcf5 0%, #dcf7e8 100%);
  color: #2d7e58;
}

.slot-occupied {
  background: linear-gradient(135deg, #fff1f4 0%, #f8dde4 100%);
  color: #a85369;
}

.slot-past {
  background: linear-gradient(135deg, #f4f5f8 0%, #eaecf1 100%);
  color: #81879a;
}

.slot-empty {
  background: #faf7f8;
  color: #b2a4aa;
}

.slot-detail {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: inherit;
  cursor: pointer;
}

.facility-detail-page :deep(.el-dialog) {
  border-radius: 28px;
  overflow: hidden;
}

.facility-detail-page :deep(.el-dialog__header) {
  display: none;
}

.dialog-header {
  padding: 26px 28px 12px;
  background:
    radial-gradient(circle at top right, rgba(245, 183, 192, 0.22), transparent 24%),
    linear-gradient(145deg, rgba(254, 248, 249, 0.96) 0%, #ffffff 64%);
}

.dialog-header h3 {
  margin: 14px 0 0;
  color: #7a4052;
  font-size: 26px;
}

.dialog-body {
  padding: 20px 28px 8px;
}

.dialog-facility-card {
  padding: 18px;
  margin-bottom: 18px;
  border-radius: 22px;
  background: #fff8fa;
  display: grid;
  gap: 6px;
}

.dialog-facility-card strong {
  color: #7a4052;
}

.dialog-facility-card span {
  color: #8a6a76;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.facility-detail-page :deep(.el-input__wrapper),
.facility-detail-page :deep(.el-textarea__inner),
.facility-detail-page :deep(.el-date-editor.el-input__wrapper) {
  border-radius: 16px;
  box-shadow: none;
  background: #fffbfd;
  border: 1px solid rgba(245, 183, 192, 0.18);
}

.availability-bar {
  padding: 14px 16px;
  border-radius: 18px;
  font-size: 14px;
  font-weight: 500;
}

.availability-bar.available {
  background: rgba(214, 244, 228, 0.74);
  color: #2d7e58;
}

.availability-bar.unavailable {
  background: rgba(255, 232, 228, 0.74);
  color: #b35345;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 28px 28px;
}

@keyframes detail-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1200px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .hero-content,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .timeline-head {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .summary-grid,
  .rule-grid {
    grid-template-columns: 1fr;
  }

  .hero-card,
  .info-card,
  .timeline-card,
  .loading-card,
  .empty-card,
  .dialog-header,
  .dialog-body,
  .dialog-footer {
    padding-left: 18px;
    padding-right: 18px;
  }

  .hero-top,
  .hero-actions,
  .dialog-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-copy h1 {
    font-size: 28px;
  }
}
</style>
