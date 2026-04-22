import { REVIEW_DECK_TYPE, REVIEW_SRS_INTERVAL_DAYS, REVIEW_SESSION } from '../constants/index';
import { getSceneById } from './store';

const STORAGE_KEY_REVIEW = 'shanghai_roam_review_decks_v1';
const STORAGE_KEY_REVIEW_STATS = 'shanghai_roam_review_stats_v1';

function safeGetStorage(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    if (v && typeof v === 'object') return v;
  } catch (e) {}
  return fallback;
}

function safeSetStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {}
}

function startOfLocalDayMs(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function todayKey(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getReviewState() {
  const raw = safeGetStorage(STORAGE_KEY_REVIEW, { decks: {} });
  if (!raw.decks || typeof raw.decks !== 'object') raw.decks = {};
  return raw;
}

function saveReviewState(state) {
  safeSetStorage(STORAGE_KEY_REVIEW, state);
}

function getReviewStats() {
  const raw = safeGetStorage(STORAGE_KEY_REVIEW_STATS, {
    streak: 0,
    lastReviewDay: '',
    exp: 0,
    winCount: 0
  });
  return raw;
}

function saveReviewStats(stats) {
  safeSetStorage(STORAGE_KEY_REVIEW_STATS, stats);
}

function buildListeningCards(scene) {
  const qs = scene && scene.level1_listening && Array.isArray(scene.level1_listening.questions)
    ? scene.level1_listening.questions
    : [];

  return qs
    .filter(q => q && q.audioText && Array.isArray(q.options) && q.options.length >= 2)
    .map(q => ({
      id: q.id || uid('lcard'),
      type: REVIEW_DECK_TYPE.LISTENING,
      audioText: q.audioText,
      pinyin: q.pinyin || '',
      options: q.options,
      answerIndex: typeof q.answerIndex === 'number' ? q.answerIndex : 0
    }));
}

function buildProductionCards(scene) {
  const cards = [];
  const seenMandarin = new Set();

  const addItem = (item) => {
    if (!item || !item.mandarin || !item.text) return;
    const key = String(item.mandarin).trim();
    if (!key) return;
    if (seenMandarin.has(key)) return;
    seenMandarin.add(key);

    cards.push({
      id: item.id || uid('pcard'),
      type: REVIEW_DECK_TYPE.PRODUCTION,
      promptMandarin: item.mandarin,
      correctText: item.text,
      correctPinyin: item.pinyin || ''
    });
  };

  const fromKeySentences = scene && Array.isArray(scene.keySentences) ? scene.keySentences : [];
  fromKeySentences.forEach(addItem);

  const fromShadowing = scene && scene.level2_shadowing && Array.isArray(scene.level2_shadowing.sentences)
    ? scene.level2_shadowing.sentences
    : [];
  fromShadowing.forEach(addItem);

  const fromDialogue = scene && scene.level3_practical && Array.isArray(scene.level3_practical.dialogueTree)
    ? scene.level3_practical.dialogueTree
    : [];
  fromDialogue.forEach(node => {
    if (!node || node.speakerType !== 'USER_OPTIONS' || !Array.isArray(node.options)) return;
    node.options.forEach(opt => addItem(opt));
  });

  const pool = cards.map(c => ({ text: c.correctText, pinyin: c.correctPinyin }));
  return cards.map(c => {
    const distractors = pool
      .filter(p => p.text !== c.correctText)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    let options = [{ text: c.correctText, pinyin: c.correctPinyin }, ...distractors];
    const uniq = new Map();
    options.forEach(o => {
      if (o && o.text) uniq.set(o.text, o);
    });
    options = Array.from(uniq.values()).sort(() => Math.random() - 0.5);
    const answerIndex = options.findIndex(o => o.text === c.correctText);

    return {
      id: c.id,
      type: REVIEW_DECK_TYPE.PRODUCTION,
      promptMandarin: c.promptMandarin,
      options,
      answerIndex: answerIndex >= 0 ? answerIndex : 0
    };
  });
}

function computeNextAt(stageIndex, baseMs) {
  const idx = Math.max(0, Math.min(stageIndex, REVIEW_SRS_INTERVAL_DAYS.length - 1));
  const days = REVIEW_SRS_INTERVAL_DAYS[idx];
  return baseMs + days * 24 * 60 * 60 * 1000;
}

function getDeckKey(sceneId, type) {
  return `${sceneId}_${type}`;
}

/**
 * 为某个场景确保生成复习卡组（听懂卡 + 产出卡）
 * @param {number} sceneId
 * @returns {{ created: boolean, updatedDeckKeys: string[] }}
 */
export function ensureReviewDecksForScene(sceneId) {
  const scene = getSceneById(sceneId);
  if (!scene) return { created: false, updatedDeckKeys: [] };

  const now = Date.now();
  const state = getReviewState();
  const updatedDeckKeys = [];

  const upsertDeck = (type, title, cards) => {
    if (!cards || cards.length === 0) return;
    const key = getDeckKey(sceneId, type);
    const existing = state.decks[key];
    const nextAt = existing && existing.srs && existing.srs.nextAt
      ? existing.srs.nextAt
      : now;

    state.decks[key] = {
      id: (existing && existing.id) || uid('deck'),
      key,
      sceneId,
      sceneTitle: scene.title || '',
      type,
      title,
      cards,
      srs: {
        stageIndex: (existing && existing.srs && typeof existing.srs.stageIndex === 'number') ? existing.srs.stageIndex : 0,
        nextAt
      },
      createdAt: (existing && existing.createdAt) || now,
      updatedAt: now
    };
    updatedDeckKeys.push(key);
  };

  upsertDeck(REVIEW_DECK_TYPE.LISTENING, '听懂卡', buildListeningCards(scene));
  upsertDeck(REVIEW_DECK_TYPE.PRODUCTION, '产出卡', buildProductionCards(scene));

  saveReviewState(state);
  return { created: updatedDeckKeys.length > 0, updatedDeckKeys };
}

/**
 * 将“今天新生成的卡组”设为立即到期，方便用户通关后立刻练一轮
 */
export function forceTodayDecksDueNow() {
  const now = Date.now();
  const dayStart = startOfLocalDayMs(now);
  const state = getReviewState();
  const decks = state.decks || {};
  let changed = false;

  Object.keys(decks).forEach(k => {
    const d = decks[k];
    if (!d || !d.srs) return;
    if (typeof d.createdAt !== 'number') return;
    const createdDayStart = startOfLocalDayMs(d.createdAt);
    if (createdDayStart !== dayStart) return;
    if (typeof d.srs.stageIndex === 'number' && d.srs.stageIndex !== 0) return;
    if (typeof d.srs.nextAt === 'number' && d.srs.nextAt <= now) return;
    d.srs.nextAt = now;
    d.updatedAt = now;
    changed = true;
  });

  if (changed) saveReviewState(state);
  return { changed };
}

/**
 * 获取当前到期的卡组列表
 * @param {number} [nowMs]
 */
export function getDueReviewDecks(nowMs) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const state = getReviewState();
  const decks = Object.values(state.decks || {});
  return decks
    .filter(d => d && d.srs && typeof d.srs.nextAt === 'number' && d.srs.nextAt <= now)
    .sort((a, b) => a.srs.nextAt - b.srs.nextAt);
}

/**
 * 生成一次“秒速通”练习的卡片序列
 * @param {{ targetSeconds?: number, maxCards?: number }} config
 */
export function buildReviewSession(config = {}) {
  const now = Date.now();
  const dueDecks = getDueReviewDecks(now);
  const maxCards = typeof config.maxCards === 'number' ? config.maxCards : REVIEW_SESSION.MAX_CARDS;

  const flattened = [];
  dueDecks.forEach(deck => {
    const cards = Array.isArray(deck.cards) ? deck.cards : [];
    cards.forEach(card => {
      if (!card) return;
      flattened.push({
        ...card,
        deckKey: deck.key,
        deckTitle: deck.title,
        sceneId: deck.sceneId,
        sceneTitle: deck.sceneTitle,
        deckType: deck.type
      });
    });
  });

  const shuffled = flattened.sort(() => Math.random() - 0.5);
  return {
    id: uid('session'),
    startedAt: now,
    targetSeconds: typeof config.targetSeconds === 'number' ? config.targetSeconds : REVIEW_SESSION.TARGET_SECONDS,
    cards: shuffled.slice(0, maxCards),
    deckCount: dueDecks.length
  };
}

/**
 * 结算一次练习，按卡组维度推进间隔复习
 * @param {{ sessionId: string, results: Array<{ deckKey: string, cardId: string, correct: boolean }> }} payload
 */
export function settleReviewSession(payload) {
  const now = Date.now();
  const state = getReviewState();
  const stats = getReviewStats();
  const results = Array.isArray(payload && payload.results) ? payload.results : [];

  const byDeck = new Map();
  results.forEach(r => {
    if (!r || !r.deckKey) return;
    if (!byDeck.has(r.deckKey)) byDeck.set(r.deckKey, []);
    byDeck.get(r.deckKey).push(!!r.correct);
  });

  let totalCorrect = 0;
  let total = 0;

  byDeck.forEach((arr, deckKey) => {
    const deck = state.decks && state.decks[deckKey];
    if (!deck || !deck.srs) return;

    const correctCount = arr.filter(Boolean).length;
    const rate = arr.length ? correctCount / arr.length : 0;
    const oldStage = typeof deck.srs.stageIndex === 'number' ? deck.srs.stageIndex : 0;
    const nextStage = rate >= 0.8 ? Math.min(oldStage + 1, REVIEW_SRS_INTERVAL_DAYS.length - 1) : 0;

    deck.srs.stageIndex = nextStage;
    deck.srs.nextAt = computeNextAt(nextStage, startOfLocalDayMs(now));
    deck.updatedAt = now;

    totalCorrect += correctCount;
    total += arr.length;
  });

  const expGained = totalCorrect * 3 + (total ? 5 : 0);
  stats.exp = (stats.exp || 0) + expGained;

  const today = todayKey(now);
  const last = stats.lastReviewDay || '';
  if (today !== last) {
    const yest = todayKey(startOfLocalDayMs(now) - 24 * 60 * 60 * 1000);
    stats.streak = last === yest ? (stats.streak || 0) + 1 : 1;
    stats.lastReviewDay = today;
    stats.winCount = (stats.winCount || 0) + 1;
  }

  saveReviewState(state);
  saveReviewStats(stats);

  return {
    expGained,
    total,
    totalCorrect,
    streak: stats.streak || 0,
    winCount: stats.winCount || 0
  };
}

export function getReviewDashboard() {
  const now = Date.now();
  const dueDecks = getDueReviewDecks(now);
  const stats = getReviewStats();

  const nextAt = Object.values(getReviewState().decks || {})
    .filter(d => d && d.srs && typeof d.srs.nextAt === 'number')
    .map(d => d.srs.nextAt)
    .sort((a, b) => a - b)[0];

  return {
    dueCount: dueDecks.length,
    dueDecks,
    nextAt: typeof nextAt === 'number' ? nextAt : null,
    stats
  };
}
