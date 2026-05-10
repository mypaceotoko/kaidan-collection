/**
 * storyIndex.js
 * Master list of all available stories/episodes.
 *
 * ═══════════════════════════════════════════════════════════
 *  HOW TO ADD A NEW STORY
 * ═══════════════════════════════════════════════════════════
 *  1. Create stories/chapterN.json  (copy chapter1.json as template)
 *  2. Write your scenario scenes in that file
 *  3. Add an entry to the array below with:
 *       id       — unique key, must match the filename (without .json)
 *       chapter  — display label shown on the select screen
 *       title    — story title (Japanese)
 *       subtitle — short sub-title or keyword
 *       path     — relative path from index.html to the JSON file
 *       available— set to true when the story is ready to play
 *  4. Reload the page — it appears automatically on the story select screen
 * ═══════════════════════════════════════════════════════════
 *
 * @type {Array<{
 *   id:        string,
 *   chapter:   string,
 *   title:     string,
 *   subtitle:  string,
 *   path:      string,
 *   available: boolean
 * }>}
 */
export const STORY_INDEX = [
  {
    id:        'chapter1',
    chapter:   'Episode 1',
    title:     '放課後の教室',
    subtitle:  '忘れ物',
    path:      './stories/chapter1.json',
    available: true,
  },

  {
    id:        'chapter2',
    chapter:   'Episode 2',
    title:     '留守番',
    subtitle:  '六時になったら帰るから',
    path:      './stories/chapter2.json',
    available: true,
  },

  {
    id:        'chapter3',
    chapter:   'Episode 3',
    title:     'ひとり分の波',
    subtitle:  '海は、ちゃんと呼んでいた',
    path:      './stories/chapter3.json',
    available: true,
  },

  {
    id:        'chapter4',
    chapter:   'Episode 4',
    title:     'ここに住んでいた',
    subtitle:  '玄関の灯りが、まだついていた',
    path:      './stories/chapter4.json',
    available: true,
  },

  {
    id:        'chapter5',
    chapter:   'Episode 5',
    title:     '巡回中',
    subtitle:  '最後の記録は、誰が書いたのか',
    path:      './stories/chapter5.json',
    available: true,
  },

  {
    id:        'chapter6',
    chapter:   'Episode 6',
    title:     '赤い配信室',
    subtitle:  'コメント欄に「うしろ」と流れた',
    path:      './stories/chapter6.json',
    available: true,
  },
];
