import type { ShotDef } from './schema';

/**
 * Photo-craft ideas that suit any occasion: different angles, light and
 * moments that make an album feel rich. All priority 3, so they mostly
 * appear in Extravagant albums. Appended to every occasion.
 */
const NOT_SOLO: ShotDef['when'] = { notGroups: ['solo'] };

export const CRAFT_SHOTS: ShotDef[] = [
  { id: 'craft-first', title: 'The first photo of the day', category: 'moments', chapter: 'setting-off', priority: 3 },
  { id: 'craft-wide-close', title: 'A wide shot, then a close-up of the same moment', hint: 'They sit beautifully side by side on a page.', category: 'moments', chapter: 'exploring', priority: 3 },
  { id: 'craft-low-angle', title: 'Something shot from a low angle', category: 'places', chapter: 'exploring', priority: 3 },
  { id: 'craft-overhead', title: 'An overhead flat-lay', hint: 'Food, keepsakes or bits from a bag, shot straight down.', category: 'details', chapter: 'flavours', priority: 3 },
  { id: 'craft-silhouette', title: 'A silhouette against the light', category: 'moments', chapter: 'exploring', priority: 3 },
  { id: 'craft-frame', title: 'A view framed by a doorway or window', category: 'places', chapter: 'exploring', priority: 3 },
  { id: 'craft-motion', title: 'Movement: a blur of dancing, running or traffic', category: 'moments', chapter: 'exploring', priority: 3 },
  { id: 'craft-shadows', title: 'Interesting shadows', category: 'details', chapter: 'exploring', priority: 3 },
  { id: 'craft-colour', title: 'Something in the day’s main colour', category: 'details', chapter: 'exploring', priority: 3 },
  { id: 'craft-hands', title: 'Hands busy doing something', category: 'details', chapter: 'together', priority: 3 },
  { id: 'craft-shoes', title: 'Everyone’s shoes', category: 'details', chapter: 'together', priority: 3, when: NOT_SOLO },
  { id: 'craft-across-room', title: 'A candid from across the room', category: 'people', chapter: 'together', priority: 3, when: NOT_SOLO },
  { id: 'craft-in-between', title: 'An in-between moment nobody posed for', category: 'moments', chapter: 'together', priority: 3, when: NOT_SOLO },
  { id: 'craft-pov', title: 'Your point of view: your hands, your feet, your view', category: 'details', chapter: 'exploring', priority: 3 },
  { id: 'craft-mirror', title: 'A mirror selfie', category: 'people', chapter: 'together', priority: 3 },
  { id: 'craft-portrait-blur', title: 'A close portrait with the background blurred', hint: 'Portrait mode, or step close and zoom a little.', category: 'people', chapter: 'together', priority: 3 },
  { id: 'craft-panorama', title: 'A panorama', category: 'places', chapter: 'exploring', priority: 3 },
  { id: 'craft-sound', title: 'Something you could hear: music, the sea, a crowd', category: 'moments', chapter: 'exploring', priority: 3 },
  { id: 'craft-taste', title: 'Something you could smell or taste', category: 'food', chapter: 'flavours', priority: 3 },
  { id: 'craft-unusual', title: 'Something you’d never normally photograph', category: 'details', chapter: 'exploring', priority: 3 },
  { id: 'craft-behind', title: 'Behind the scenes', category: 'moments', chapter: 'together', priority: 3 },
  { id: 'craft-laugh', title: 'Whatever made you laugh most', category: 'moments', chapter: 'together', priority: 3 },
  { id: 'craft-last', title: 'The last photo of the day', category: 'moments', chapter: 'end', priority: 3 },
];
