<template>
  <div class="welcome-page">
    <section class="welcome-hero">
      <div class="hero-copy">
        <span class="hero-kicker">Welcome</span>
        <h1>欢迎回来，{{ displayName }}</h1>
        <p>
          今天也适合高效安排课程、实验和活动。这里保留用户端的轻量操作流，让你可以更快进入设施浏览、预约管理和反馈处理。
        </p>
        <div class="hero-actions">
          <el-button type="primary" class="primary-btn" @click="goTo('/user/facility')">
            浏览设施
          </el-button>
          <el-button class="secondary-btn" @click="goTo('/user/my-reservation')">
            查看预约
          </el-button>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <article class="feature-card weather-card">
        <div class="card-head">
          <div>
            <h2>今日心情与天气</h2>
            <p></p>
          </div>
          <el-button class="refresh-btn" :loading="loading" @click="fetchWeather">刷新天气</el-button>
        </div>

        <div v-if="!weatherReady" class="weather-loading">
          <div class="weather-loading-visual">
            <span class="weather-loading-icon"></span>
            <span class="weather-loading-temp"></span>
            <span class="weather-loading-type"></span>
          </div>

          <div class="weather-loading-content">
            <span class="weather-loading-row"></span>
            <span class="weather-loading-row"></span>
            <span class="weather-loading-row weather-loading-row--wide"></span>
            <span class="weather-loading-row"></span>
            <span class="weather-loading-quote"></span>
          </div>
        </div>

        <div v-else class="weather-layout">
          <div class="weather-visual">
            <img
              v-if="isRenderableWeatherImage"
              :src="resolvedWeatherIcon"
              :alt="weatherInfo.weatherType || '天气图标'"
              class="weather-icon"
              @error="handleWeatherIconError"
            />
            <span v-else class="weather-emoji">{{ weatherEmoji }}</span>
            <strong>{{ weatherInfo.temperature || '--' }}</strong>
            <span class="weather-type">{{ weatherInfo.weatherType || '晴' }}</span>
          </div>

          <div class="weather-content">
            <div class="weather-row">
              <label>城市</label>
              <span class="weather-row-value">{{ weatherInfo.city || '校园附近' }}</span>
            </div>
            <div class="weather-row">
              <label>当前 IP</label>
              <span class="weather-row-value">{{ weatherInfo.ipAddress || '--' }}</span>
            </div>
            <div class="weather-row weather-row--multiline">
              <label>IP 归属地</label>
              <span class="weather-row-value">{{ weatherInfo.regionAddress || '暂无定位信息' }}</span>
            </div>
            <div class="weather-row">
              <label>更新时间</label>
              <span class="weather-row-value">{{ weatherInfo.updateTime || '刚刚' }}</span>
            </div>
            <p class="weather-quote">
              {{ weatherInfo.moodQuote || '愿你今天的学习和预约都顺顺利利。' }}
            </p>
          </div>
        </div>
      </article>

      <article class="feature-card action-card">
        <div class="card-head">
          <div>
            <h2>快捷功能</h2>
            <p>你可以快速访问常用功能，如浏览设施、查看预约、反馈问题等。</p>
          </div>
        </div>

        <div class="action-grid">
          <button
            v-for="item in quickActions"
            :key="item.path"
            type="button"
            class="quick-action"
            @click="goTo(item.path)"
          >
            <span class="quick-action-badge" :class="item.tone">{{ item.short }}</span>
            <div class="quick-action-copy">
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </div>
            <span class="quick-action-arrow">→</span>
          </button>
        </div>
      </article>
    </section>
    <!-- 推荐模块 
    <section v-if="currentUser?.id" class="recommend-shell">
      <div class="recommend-head">
        <div>
          <h2>个性化推荐</h2>
          <p>沿用当前清新的卡片风格，但内容更偏向用户实际使用场景。</p>
        </div>
      </div>
      <RecommendWidget :userId="currentUser.id" />
    </section>
    -->
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { weatherAPI } from '../../api/weather';
import { apiBaseUrl } from '../../config/env';
import RecommendWidget from '../../components/RecommendWidget.vue';

const router = useRouter();
const currentUser = ref(null);
const loading = ref(false);
const weatherReady = ref(false);
const weatherIconBroken = ref(false);

const weatherInfo = ref({
  weatherType: '获取中',
  temperature: '--',
  weatherIcon: '/files/weather/update.ico',
  moodQuote: '正在根据当前 IP 和地理位置同步天气信息。',
  city: '定位中',
  ipAddress: '',
  regionAddress: '',
  updateTime: ''
});

const MAX_AUTO_WEATHER_RETRIES = 2;
const WEATHER_RETRY_DELAY = 1200;
const MIN_INITIAL_WEATHER_DELAY = 700;

let weatherRequestId = 0;
let weatherRetryTimer = null;
let weatherBootStartedAt = 0;

const quickActions = [
  {
    path: '/user/facility',
    title: '设施浏览',
    desc: '查看当前可预约设施与详细信息',
    short: '设',
    tone: 'mint'
  },
  {
    path: '/user/my-reservation',
    title: '我的预约',
    desc: '快速查看审批、签到和历史预约记录',
    short: '约',
    tone: 'sky'
  },
  {
    path: '/user/violation-records',
    title: '违规记录',
    desc: '了解信用扣分和历史违规处理情况',
    short: '规',
    tone: 'peach'
  },
  {
    path: '/user/feedback',
    title: '意见反馈',
    desc: '提交建议、投诉或咨询并查看回复',
    short: '反',
    tone: 'gold'
  }
];

const displayName = computed(() => currentUser.value?.realName || currentUser.value?.username || '同学');

const resolveBackendAssetUrl = (path) => {
  if (typeof path !== 'string' || !path.startsWith('/files/')) {
    return path;
  }

  if (!/^(https?:)?\/\//i.test(apiBaseUrl)) {
    return path;
  }

  try {
    const apiUrl = new URL(apiBaseUrl);
    return `${apiUrl.origin}${path}`;
  } catch (error) {
    return path;
  }
};

const normalizeWeatherIcon = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }

  if (/^(https?:|data:image)/i.test(normalized)) {
    return normalized;
  }

  const filesIndex = normalized.indexOf('/files/');
  if (filesIndex >= 0) {
    return resolveBackendAssetUrl(normalized.slice(filesIndex));
  }

  if (normalized.startsWith('files/')) {
    return resolveBackendAssetUrl(`/${normalized}`);
  }

  if (normalized.startsWith('/')) {
    return resolveBackendAssetUrl(normalized);
  }

  return '';
};

const resolvedWeatherIcon = computed(() => normalizeWeatherIcon(weatherInfo.value.weatherIcon));

const isRenderableWeatherImage = computed(() => {
  if (weatherIconBroken.value) {
    return false;
  }
  return /\.(png|jpe?g|gif|svg|webp|bmp|ico)(\?.*)?$/i.test(resolvedWeatherIcon.value);
});

const weatherEmoji = computed(() => {
  if (typeof weatherInfo.value.weatherIcon === 'string' && !resolvedWeatherIcon.value) {
    return weatherInfo.value.weatherIcon || '☀';
  }
  return '☀';
});

const initUserInfo = () => {
  currentUser.value = JSON.parse(localStorage.getItem('userInfo') || '{}');
};

const goTo = (path) => {
  router.push(path);
};

const hasLocationDetails = (data) => {
  const ipAddress = typeof data?.ipAddress === 'string' ? data.ipAddress.trim() : '';
  const regionAddress = typeof data?.regionAddress === 'string' ? data.regionAddress.trim() : '';
  return Boolean(ipAddress && regionAddress);
};

const clearWeatherRetryTimer = () => {
  if (weatherRetryTimer) {
    window.clearTimeout(weatherRetryTimer);
    weatherRetryTimer = null;
  }
};

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const revealInitialWeather = async (requestId) => {
  if (weatherReady.value) {
    return;
  }

  const elapsed = Date.now() - weatherBootStartedAt;
  const remaining = MIN_INITIAL_WEATHER_DELAY - elapsed;
  if (remaining > 0) {
    await wait(remaining);
  }

  if (requestId === weatherRequestId) {
    weatherReady.value = true;
  }
};

const scheduleWeatherRetry = (retryCount) => {
  if (retryCount > MAX_AUTO_WEATHER_RETRIES || weatherRetryTimer) {
    return;
  }

  weatherRetryTimer = window.setTimeout(() => {
    weatherRetryTimer = null;
    fetchWeather({ background: true, retryCount, autoOnly: true });
  }, WEATHER_RETRY_DELAY * retryCount);
};

const applyWeatherData = (data, options = {}) => {
  const preserveLocation = options.preserveLocation ?? false;
  const currentLocation = preserveLocation ? weatherInfo.value : null;

  weatherIconBroken.value = false;
  weatherInfo.value = {
    weatherType: data?.weatherType || '未知',
    temperature: data?.temperature || '--',
    weatherIcon: data?.weatherIcon || '/files/weather/未知.ico',
    moodQuote: data?.moodQuote || '天气信息暂时不可用，请稍后刷新重试。',
    city: data?.city || currentLocation?.city || '定位失败',
    ipAddress: data?.ipAddress || currentLocation?.ipAddress || '',
    regionAddress: data?.regionAddress || currentLocation?.regionAddress || '',
    updateTime: data?.updateTime || new Date().toLocaleString('zh-CN', { hour12: false })
  };
};

const fetchWeatherLegacy = async () => {
  loading.value = true;
  try {
    const autoResponse = await weatherAPI.getAutoWeather();
    if (autoResponse.data?.data) {
      applyWeatherData(autoResponse.data.data);
      return;
    }
  } catch (error) {
    console.error('自动定位获取天气失败:', error);
  }

  try {
    const fallbackResponse = await weatherAPI.getWeather('北京');
    if (fallbackResponse.data?.data) {
      applyWeatherData(fallbackResponse.data.data);
      return;
    }
  } catch (error) {
    console.error('默认城市天气获取失败:', error);
  } finally {
    loading.value = false;
  }

  applyWeatherData({
    weatherType: '未知',
    temperature: '--',
    weatherIcon: '/files/weather/未知.ico',
    moodQuote: '天气数据暂时未刷新成功，请稍后重试。',
    city: '定位失败',
    ipAddress: '',
    regionAddress: '暂无可用的 IP 归属地信息',
    updateTime: new Date().toLocaleString('zh-CN', { hour12: false })
  });
  loading.value = false;
};

const fetchAutoWeather = async (requestId, retryCount) => {
  try {
    const autoResponse = await weatherAPI.getAutoWeather();
    if (requestId !== weatherRequestId) {
      return false;
    }

    const weatherData = autoResponse.data?.data;
    if (!weatherData) {
      return false;
    }

    applyWeatherData(weatherData, { preserveLocation: true });
    if (!hasLocationDetails(weatherData)) {
      scheduleWeatherRetry(retryCount + 1);
    }
    return true;
  } catch (error) {
    console.error('Auto weather fetch failed:', error);
    return false;
  }
};

const fetchWeather = async (options = {}) => {
  const { background = false, retryCount = 0, autoOnly = false } = options;
  const requestId = ++weatherRequestId;

  clearWeatherRetryTimer();

  if (!background) {
    loading.value = true;
  }

  const autoLoaded = await fetchAutoWeather(requestId, retryCount);
  if (autoLoaded) {
    if (!background) {
      await revealInitialWeather(requestId);
    }
    if (!background && requestId === weatherRequestId) {
      loading.value = false;
    }
    return;
  }

  if (autoOnly) {
    if (!background) {
      await revealInitialWeather(requestId);
    }
    if (!background && requestId === weatherRequestId) {
      loading.value = false;
    }
    return;
  }

  try {
    const fallbackResponse = await weatherAPI.getWeather('北京');
    if (requestId === weatherRequestId && fallbackResponse.data?.data) {
      applyWeatherData(fallbackResponse.data.data, { preserveLocation: true });
      scheduleWeatherRetry(retryCount + 1);
      if (!background) {
        await revealInitialWeather(requestId);
      }
      return;
    }
  } catch (error) {
    console.error('Fallback weather fetch failed:', error);
  } finally {
    if (!background && requestId === weatherRequestId) {
      loading.value = false;
    }
  }

  if (requestId === weatherRequestId) {
    applyWeatherData({
      updateTime: new Date().toLocaleString('zh-CN', { hour12: false })
    }, { preserveLocation: true });
    scheduleWeatherRetry(retryCount + 1);
    if (!background) {
      await revealInitialWeather(requestId);
    }
  }
};

const handleWeatherIconError = () => {
  weatherIconBroken.value = true;
};

onMounted(() => {
  initUserInfo();
  weatherBootStartedAt = Date.now();
  fetchWeather();
});

onBeforeUnmount(() => {
  weatherRequestId += 1;
  clearWeatherRetryTimer();
});
</script>

<style scoped>
.welcome-page {
  --page-primary: #f5b7c0;
  min-height: 100%;
  display: grid;
  gap: 20px;
  background:
    radial-gradient(circle at top left, rgba(245, 183, 192, 0.32), transparent 28%),
    radial-gradient(circle at right center, rgba(252, 228, 232, 0.48), transparent 20%),
    linear-gradient(180deg, #fffafb 0%, #fffdfd 100%);
}

.welcome-hero,
.feature-card,
.recommend-shell {
  border-radius: 30px;
  border: 1px solid rgba(245, 183, 192, 0.14);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 20px 44px rgba(94, 52, 62, 0.06);
}

.welcome-hero {
  padding: 30px;
  background:
    radial-gradient(circle at top right, rgba(252, 228, 232, 0.48), transparent 24%),
    linear-gradient(145deg, rgba(245, 183, 192, 0.18) 0%, #ffffff 62%);
}

.hero-kicker {
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
  margin: 16px 0 12px;
  font-size: 36px;
  color: #7a4052;
}

.hero-copy p {
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

.primary-btn,
.secondary-btn,
.refresh-btn {
  min-height: 44px;
  border-radius: 14px;
  font-weight: 600;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #f5b7c0 0%, #e8909d 100%);
  box-shadow: 0 14px 28px rgba(232, 144, 157, 0.2);
}

.secondary-btn,
.refresh-btn {
  border: 1px solid rgba(245, 183, 192, 0.18);
  background: rgba(255, 255, 255, 0.86);
  color: #c4677a;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}

.feature-card,
.recommend-shell {
  padding: 24px;
}

.card-head,
.recommend-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.card-head h2,
.recommend-head h2 {
  margin: 0;
  color: #7a4052;
}

.card-head p,
.recommend-head p {
  margin: 8px 0 0;
  color: #8e717b;
  line-height: 1.7;
}

.weather-card {
  background:
    radial-gradient(circle at top right, rgba(252, 228, 232, 0.48), transparent 22%),
    linear-gradient(155deg, rgba(245, 183, 192, 0.14) 0%, #ffffff 64%);
}

.weather-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.weather-loading {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 18px;
  align-items: stretch;
}

.weather-loading-visual,
.weather-loading-content {
  position: relative;
  overflow: hidden;
}

.weather-loading-visual::before,
.weather-loading-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
  transform: translateX(-100%);
  animation: weather-shimmer 1.4s ease-in-out infinite;
}

.weather-loading-visual {
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(245, 183, 192, 0.16);
  min-height: 240px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 14px;
}

.weather-loading-content {
  display: grid;
  gap: 12px;
}

.weather-loading-icon,
.weather-loading-temp,
.weather-loading-type,
.weather-loading-row,
.weather-loading-quote {
  display: block;
  background: linear-gradient(135deg, rgba(245, 183, 192, 0.18), rgba(240, 224, 206, 0.42));
}

.weather-loading-icon {
  width: 72px;
  height: 72px;
  border-radius: 24px;
}

.weather-loading-temp {
  width: 96px;
  height: 34px;
  border-radius: 14px;
}

.weather-loading-type {
  width: 72px;
  height: 18px;
  border-radius: 999px;
}

.weather-loading-row {
  height: 52px;
  border-radius: 18px;
}

.weather-loading-row--wide {
  height: 72px;
}

.weather-loading-quote {
  height: 90px;
  border-radius: 20px;
}

.weather-visual {
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(245, 183, 192, 0.16);
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: 240px;
  align-content: center;
}

.weather-icon {
  width: 72px;
  height: 72px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(42%) sepia(18%) saturate(633%) hue-rotate(294deg) brightness(90%) contrast(87%);
}

.weather-emoji {
  font-size: 56px;
  line-height: 1;
}

.weather-visual strong {
  font-size: 30px;
  color: #7a4052;
}

.weather-type {
  color: #8e717b;
}

.weather-content {
  display: grid;
  gap: 12px;
}

.weather-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #fef8f9;
}

.weather-row label {
  color: #8e717b;
}

.weather-row-value {
  color: #c4677a;
  font-weight: 600;
  text-align: right;
}

.weather-row--multiline {
  align-items: flex-start;
}

.weather-row--multiline .weather-row-value {
  max-width: 70%;
  white-space: normal;
  overflow-wrap: anywhere;
}

.weather-quote {
  margin: 0;
  padding: 18px;
  border-radius: 20px;
  background: rgba(245, 183, 192, 0.12);
  color: #8a6a76;
  line-height: 1.8;
}

.quick-action {
  appearance: none;
  width: 100%;
  padding: 18px;
  border: 1px solid rgba(245, 183, 192, 0.14);
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(254, 248, 249, 0.98));
  display: flex;
  gap: 14px;
  align-items: center;
  text-align: left;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  font: inherit;
  color: inherit;
}

.quick-action:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 28px rgba(94, 52, 62, 0.08);
}

.quick-action:focus-visible {
  outline: 3px solid rgba(184, 141, 98, 0.28);
  outline-offset: 3px;
}

.quick-action-badge {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 17px;
  font-weight: 700;
  flex-shrink: 0;
}

.quick-action-badge.mint {
  background: linear-gradient(135deg, #f1ddc6 0%, #e2c199 100%);
  color: #6f5234;
}

.quick-action-badge.sky {
  background: linear-gradient(135deg, #f3e6d5 0%, #e4c6a1 100%);
  color: #6c4f31;
}

.quick-action-badge.peach {
  background: linear-gradient(135deg, #f3dccf 0%, #dfb69f 100%);
  color: #754734;
}

.quick-action-badge.gold {
  background: linear-gradient(135deg, #f4e4c8 0%, #dbbc86 100%);
  color: #6c4e24;
}

.quick-action-copy {
  flex: 1;
  min-width: 0;
}

.quick-action-copy strong {
  display: block;
  color: #7a4052;
  font-size: 16px;
}

.quick-action-copy p {
  margin: 6px 0 0;
  color: #8e717b;
  line-height: 1.6;
}

.action-card {
  background:
    radial-gradient(circle at top left, rgba(244, 228, 200, 0.38), transparent 24%),
    linear-gradient(150deg, rgba(244, 228, 200, 0.14) 0%, #ffffff 68%);
}

.quick-action-arrow {
  color: #7a5a3b;
  font-size: 18px;
  font-weight: 700;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 1200px) {
  .action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .weather-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .welcome-hero,
  .feature-card,
  .recommend-shell {
    padding: 18px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .card-head,
  .recommend-head,
  .hero-actions {
    flex-direction: column;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
<style scoped>
.welcome-page {
  --theme-deep: #e8909d;
  --theme-border: rgba(245, 183, 192, 0.16);
  --theme-shadow: rgba(94, 52, 62, 0.08);
  background:
    radial-gradient(circle at top left, rgba(245, 183, 192, 0.38), transparent 28%),
    radial-gradient(circle at right center, rgba(252, 228, 232, 0.48), transparent 20%),
    linear-gradient(180deg, #fffafb 0%, #fffdfd 100%);
}

.welcome-hero,
.feature-card,
.recommend-shell,
.quick-action {
  animation: welcome-rise 0.55s ease both;
  border-color: var(--theme-border);
  box-shadow: 0 20px 46px var(--theme-shadow);
}

.welcome-hero {
  background:
    radial-gradient(circle at top right, rgba(252, 228, 232, 0.48), transparent 24%),
    linear-gradient(145deg, rgba(254, 248, 249, 0.96) 0%, #ffffff 62%);
}

.weather-card {
  background:
    radial-gradient(circle at top right, rgba(252, 228, 232, 0.48), transparent 22%),
    linear-gradient(155deg, rgba(254, 248, 249, 0.96) 0%, #ffffff 64%);
}

.quick-action {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.quick-action:hover {
  box-shadow: 0 18px 30px rgba(94, 52, 62, 0.1);
}

@keyframes welcome-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes weather-shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
</style>
