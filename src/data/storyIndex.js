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

  // ── Placeholder for future episodes ─────────────────────────────────────
  // {
  //   id:        'chapter3',
  //   chapter:   'Episode 3',
  //   title:     '新しい話のタイトル',
  //   subtitle:  'サブタイトル',
  //   path:      './stories/chapter3.json',
  //   available: false,
  // },
];
