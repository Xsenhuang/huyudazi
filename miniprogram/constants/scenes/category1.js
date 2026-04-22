/**
 * 大类 1：发音与打招呼
 */
import { SCENE_COVER } from '../assets/index.js';

export const CATEGORY_1_SCENES = [
  {
    id: 102,
    title: '小区碰头',
    description: '早晨在小区碰到邻居怎么打招呼',
    target: '早晨问候 → 寒暄近况 → 聊聊家常 → 礼貌道别',
    coverIcon: SCENE_COVER.GREETING,
    
    vocabularies: [
      { word: '侬早', pinyin: 'nong zao', mandarin: '您早', note: '早晨问候语' },
      { word: '长远勿见', pinyin: 'dzan yeu veq ci', mandarin: '好久不见', note: '久别重逢用语'},
      { word: '蛮好', pinyin: 'me hao', mandarin: '挺好', note: '表示程度"挺"' },
      { word: '介', pinyin: 'ga', mandarin: '这么', note: '程度副词', audio: ''},
      { word: '老', pinyin: 'lao', mandarin: '很', note: '程度副词' },
      { word: '最近', pinyin: 'zoe jhin', mandarin: '最近', note: '时间词' },
      { word: '买小菜', pinyin: 'ma xiao ce', mandarin: '买菜', note: '日常活动' },
      { word: '小囡', pinyin: 'xiao noe', mandarin: '小孩', note: '家庭成员' },
      { word: '先走一步', pinyin: 'xi zoe yik bu', mandarin: '先走一步', note: '道别用语' }
    ],

    // 万能句/核心句：完全原创的生活化对话
    keySentences: [
      { text: '王阿姨，侬早啊！买小菜去啊？', pinyin: 'Wang a yi, nong zao a! Ma xiao ce qi a?', mandarin: '王阿姨，您早啊！去买菜吗？' },
      { text: '是额呀，小李。长远勿见，侬最近老忙额嘛！', pinyin: 'Zy e ya, xiao li. Dzan yeu veq ci, nong zoe jhin lao mang e ma!', mandarin: '是啊，小李。好久不见，你最近很忙嘛！' },
      { text: '蛮好蛮好，最近公司里向事体多。', pinyin: 'Me hao me hao, zoe jhin gong sy li xiang zy ti du.', mandarin: '挺好挺好，最近公司里事情多。' },
      { text: '小囡介大了呀，上幼儿园了伐？', pinyin: 'Xiao noe ga dhu le ya, zhang yhoe yhoe yhoe le va?', mandarin: '小孩这么大了呀，上幼儿园了吗？' },
      { text: '下个礼拜就去了。王阿姨，我先走一步，明朝会。', pinyin: 'Hho ge li ba jio qi le. Wang a yi, ngo xi zoe yik bu, min zao hhue.', mandarin: '下个礼拜就去了。王阿姨，我先走一步，明天见。' }
    ],

    // 第1关：听懂（识别）- 根据新句子生成的听力题
    level1_listening: {
      questions: [
        {
          id: 'l1_q1',
          audioText: '王阿姨，侬早啊！买小菜去啊？',
          pinyin: 'Wang a yi, nong zao a! Ma xiao ce qi a?',
          type: 'meaning',
          options: [
            '王阿姨，您早啊！去买菜吗？',
            '王阿姨，好久不见，去上班吗？',
            '王阿姨，今天天气真好。'
          ],
          answerIndex: 0
        },
        {
          id: 'l1_q2',
          audioText: '是额呀，小李。长远勿见，侬最近老忙额嘛！',
          pinyin: 'Zy e ya, xiao li. Dzan yeu veq ci, nong zoe jhin lao mang e ma!',
          type: 'meaning',
          options: [
            '是啊，小李。好久不见，你最近很忙嘛！',
            '挺好挺好，最近公司里事情多。'
          ],
          answerIndex: 0
        },
        {
          id: 'l1_q3',
          audioText: '蛮好蛮好，最近公司里向事体多。',
          pinyin: 'Me hao me hao, zoe jhin gong sy li xiang zy ti du.',
          type: 'meaning',
          options: [
            '挺好挺好，最近公司里事情多。',
            '挺好挺好，最近公司里事情少。'
          ],
          answerIndex: 0
        },
        {
          id: 'l1_q4',
          audioText: '小囡介大了呀，上幼儿园了伐？',
          pinyin: 'Xiao noe ga dhu le ya, zhang yhoe yhoe yhoe le va?',
          type: 'meaning',
          options: [
            '小孩这么大了呀，上小学了吗？',
            '小孩这么大了呀，上幼儿园了吗？'
          ],
          answerIndex: 1
        },
        {
          id: 'l1_q5',
          audioText: '下个礼拜就去了。王阿姨，我先走一步，明朝会。',
          pinyin: 'Hho ge li ba jio qi le. Wang a yi, ngo xi zoe yik bu, min zao hhue.',
          type: 'meaning',
          options: [
            '下个礼拜就去了。王阿姨，我先走一步，明天见。',
            '明天就去了。王阿姨，有空来家里玩。'
          ],
          answerIndex: 0
        }
      ]
    },

    // 第2关：跟读（模仿）
    level2_shadowing: {
      sentences: [
        { id: 's102_1', text: '王阿姨，侬早啊！买小菜去啊？', pinyin: 'Wang a yi, nong zao a! Ma xiao ce qi a?', mandarin: '王阿姨，您早啊！去买菜吗？', keywords: ['侬早', '买小菜'], required: true },
        { id: 's102_2', text: '是额呀，小李。长远勿见，侬最近老忙额嘛！', pinyin: 'Zy e ya, xiao li. Dzan yeu veq ci, nong zoe jhin lao mang e ma!', mandarin: '好久不见，你最近很忙嘛！', keywords: ['长远勿见', '老忙额'], required: true },
        { id: 's102_3', text: '蛮好蛮好，最近公司里向事体多。', pinyin: 'Me hao me hao, zoe jhin gong sy li xiang zy ti du.', mandarin: '挺好挺好，最近公司里事情多。', keywords: ['蛮好蛮好', '事体多'], required: false },
        { id: 's102_4', text: '小囡介大了呀，上幼儿园了伐？', pinyin: 'Xiao noe ga dhu le ya, zhang yhoe yhoe yhoe le va?', mandarin: '小孩这么大了呀，上幼儿园了吗？', keywords: ['小囡', '介大了呀'], required: false }
      ]
    },

    // 第3关：实战（对话推进）- 逻辑清晰的树状对话
    level3_practical: {
      taskDesc: '早晨在小区偶遇邻居王阿姨，完成“早晨问候→寒暄近况→聊聊小孩→礼貌道别”。',
      dialogueTree: [
        {
          id: 'n1',
          speakerType: 'NPC',
          text: '喔唷，小李啊，去上班啦？',
          pinyin: 'O yo, xiao li a, qi shang be la?',
          mandarin: '哎哟，小李啊，去上班啦？'
        },
        {
          id: 'u1',
          speakerType: 'USER_OPTIONS',
          options: [
            { text: '王阿姨，侬早啊！买小菜去啊？', pinyin: 'Wang a yi, nong zao a! Ma xiao ce qi a?', mandarin: '王阿姨，您早啊！去买菜吗？', next: 'n2' },
            { text: '王阿姨好，我是小李。', pinyin: 'Wang a yi hao, ngo zy xiao li.', mandarin: '王阿姨好，我是小李。', next: 'n2' }
          ]
        },
        {
          id: 'n2',
          speakerType: 'NPC',
          text: '是额呀，小李。长远勿见，侬最近老忙额嘛！',
          pinyin: 'Zy e ya, xiao li. Dzan yeu veq ci, nong zoe jhin lao mang e ma!',
          mandarin: '是啊。好久不见，你最近很忙嘛！'
        },
        {
          id: 'u2',
          speakerType: 'USER_OPTIONS',
          options: [
            { text: '蛮好蛮好，最近公司里向事体多。', pinyin: 'Me hao me hao, zoe jhin gong sy li xiang zy ti du.', mandarin: '挺好挺好，最近公司里事情多。', next: 'n3' },
            { text: '有点忙额，天天加班。', pinyin: 'Yoe di mang e, ti ti ga be.', mandarin: '有点忙的，天天加班。', next: 'n3' }
          ]
        },
        {
          id: 'n3',
          speakerType: 'NPC',
          text: '小囡介大了呀，上幼儿园了伐？',
          pinyin: 'Xiao noe ga dhu le ya, zhang yhoe yhoe yhoe le va?',
          mandarin: '小孩这么大了呀，上幼儿园了吗？'
        },
        {
          id: 'u3',
          speakerType: 'USER_OPTIONS',
          options: [
            { text: '下个礼拜就去了。王阿姨，我先走一步，明朝会。', pinyin: 'Hho ge li ba jio qi le. Wang a yi, ngo xi zoe yik bu, min zao hhue.', mandarin: '下个礼拜就去了。王阿姨，我先走一步，明天见。', next: 'end' },
            { text: '还没呢。我先走一步。', pinyin: 'Hha mi ne. Ngo xi zoe yik bu.', mandarin: '还没呢。我先走一步。', next: 'end' }
          ]
        }
      ]
    }
  },
  {
    id: 103,
    title: '接人送人',
    source: '第1课·迎接客人·送人出门',
    description: '接站、送客出门的客套',
    target: '接人、接待、简单招呼与安排',
    coverIcon: SCENE_COVER.GREETING,
    level1_listening: {}, level2_shadowing: {}, level3_practical: {}
  },
  {
    id: 104,
    title: '致谢与回应',
    source: '第1课·代劳致谢',
    description: '帮忙/代劳后的致谢与客气回应',
    target: '别人帮忙后的感谢与回应',
    coverIcon: SCENE_COVER.GREETING,
    level1_listening: {}, level2_shadowing: {}, level3_practical: {}
  },
  {
    id: 105,
    title: '请让与“碰撞”场景',
    source: '第1课·请让和碰撞',
    description: '挤地铁/公交道歉与请让',
    target: '在拥挤环境中礼貌请让、道歉和化解尴尬',
    coverIcon: SCENE_COVER.GREETING,
    level1_listening: {}, level2_shadowing: {}, level3_practical: {}
  },
  {
    id: 106,
    title: '自我介绍',
    source: '第2课·介绍认识·问人',
    description: '姓名、单位、关系说明',
    target: '自我介绍 → 问对方基本信息 → 找共同点 → 自然约定后续联系',
    coverIcon: SCENE_COVER.GREETING,
    
    keySentences: [
      { text: '阿拉姓张，叫张三。', pinyin: 'ak la xin zang, jiao zang se.', mandarin: '我姓张，叫张三。' },
      { text: '侬做啥个工作个？', pinyin: 'non zu sa ge gon zok ge?', mandarin: '你是做什么工作的？' },
      { text: '方便伐？加个微信。', pinyin: 'fang bi va? ga ge wei xin.', mandarin: '方便吗？加个微信。' }
    ],

    level1_listening: {
      questions: [
        {
          id: 'l1_q1',
          audioText: '阿拉姓张，叫张三。',
          pinyin: 'ak la xin zang, jiao zang se.',
          type: 'meaning',
          options: ['我姓张，叫张三。', '他姓张，叫张三。', '你好，张三。'],
          answerIndex: 0
        },
        {
          id: 'l1_q2',
          audioText: '侬做啥个工作个？',
          pinyin: 'non zu sa ge gon zok ge?',
          type: 'meaning',
          options: ['你去哪里？', '你在做什么工作？', '你叫什么名字？'],
          answerIndex: 1
        },
        {
          id: 'l1_q3',
          audioText: '方便伐？加个微信。',
          pinyin: 'fang bi va? ga ge wei xin.',
          type: 'response',
          options: ['好个。', '我是老师。', '谢谢侬。'],
          answerIndex: 0
        }
      ]
    },

    level2_shadowing: {
      sentences: [
        { id: 's106_1', text: '阿拉姓张，叫张三。', pinyin: 'ak la xin zang, jiao zang se.', mandarin: '我姓张，叫张三。', keywords: ['阿拉', '姓张', '叫张三'] },
        { id: 's106_2', text: '侬做啥个工作个？', pinyin: 'non zu sa ge gon zok ge?', mandarin: '你是做什么工作的？', keywords: ['侬做啥个', '工作个'] },
        { id: 's106_3', text: '方便伐，加个微信。', pinyin: 'fang bi va, ga ge wei xin.', mandarin: '方便吗，加个微信。', keywords: ['方便伐', '加个微信'] }
      ]
    },

    level3_practical: {
      taskDesc: '在朋友介绍下认识新朋友，完成“自我介绍→问工作→约后续联系”。',
      dialogueTree: [
        {
          id: 'n1',
          speakerType: 'NPC',
          text: '侬好，我姓李，叫李雷。',
          pinyin: 'non hao, ngo xin li, jiao li le.',
          mandarin: '你好，我姓李，叫李雷。'
        },
        {
          id: 'u1',
          speakerType: 'USER_OPTIONS',
          options: [
            { text: '侬好，阿拉姓张，叫张三。', pinyin: 'non hao, ak la xin zang, jiao zang se.', mandarin: '你好，我姓张，叫张三。', next: 'n2' }
          ]
        },
        {
          id: 'n2',
          speakerType: 'NPC',
          text: '我哪能称呼侬？叫侬小张可以伐？',
          pinyin: 'ngo na nen cen hu non? jiao non xiao zang ke yi va?',
          mandarin: '我怎么称呼你？叫你小张可以吗？'
        },
        {
          id: 'u2',
          speakerType: 'USER_OPTIONS',
          options: [
            { text: '可以个。侬做啥个工作个？', pinyin: 'ke yi ge. non zu sa ge gon zok ge?', mandarin: '可以的。你是做什么工作的？', next: 'n3' }
          ]
        },
        {
          id: 'n3',
          speakerType: 'NPC',
          text: '阿拉做设计个。侬呢？',
          pinyin: 'ak la zu sek ji ge. non ne?',
          mandarin: '我是做设计的。你呢？'
        },
        {
          id: 'u3',
          speakerType: 'USER_OPTIONS',
          options: [
            { text: '阿拉做产品个。方便伐？加个微信。', pinyin: 'ak la zu ce pin ge. fang bi va? ga ge wei xin.', mandarin: '我是做产品的。方便吗？加个微信。', next: 'n4' }
          ]
        },
        {
          id: 'n4',
          speakerType: 'NPC',
          text: '好个好个。',
          pinyin: 'hao ge hao ge.',
          mandarin: '好的好的。'
        }
      ]
    }
  },
  {
    id: 107,
    title: '熟人搭话与建立关系',
    source: '第2课·熟悉地方·建立关系',
    description: '问住在哪里、做什么工作',
    target: '建立后续联系',
    coverIcon: SCENE_COVER.GREETING,
    level1_listening: {}, level2_shadowing: {}, level3_practical: {}
  }
];
