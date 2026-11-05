import type { ShotDef } from './schema';

/**
 * Reusable shot prompts. Occasions reference these by id and may override
 * fields (most often `chapter`). Titles only use facts the user typed
 * (location, names); nothing is invented about their event.
 */
const COUPLE: ShotDef['when'] = { groups: ['couple'] };
const NOT_SOLO: ShotDef['when'] = { notGroups: ['solo'] };
const SOLO: ShotDef['when'] = { groups: ['solo'] };
const KIDS: ShotDef['when'] = { children: true };
const CROWD: ShotDef['when'] = { groups: ['family', 'friends', 'group'] };

const list: ShotDef[] = [
  // ── Journeys ──────────────────────────────────────────────
  { id: 'packing', title: 'Bags packed by the door', hint: 'The before shot: suitcases, tickets, passports.', category: 'details', chapter: 'setting-off', priority: 2 },
  { id: 'departure', title: 'Setting off', hint: 'At the airport, station or car — the moment it begins.', category: 'moments', chapter: 'setting-off', priority: 1 },
  { id: 'transport-window', title: 'The view from the window on the way', hint: 'Plane wing, train window, open road.', category: 'places', chapter: 'setting-off', priority: 2 },
  { id: 'tickets', title: 'Tickets, boarding passes or a map', hint: 'Flat-lay of the small paper things you will want to remember.', category: 'details', chapter: 'setting-off', priority: 3 },
  { id: 'first-view', title: 'First view of {location}', fallbackTitle: 'First view on arrival', hint: 'Snap it before you unpack — first impressions fade fast.', category: 'places', chapter: 'arrival', priority: 1 },
  { id: 'stay', title: 'Where you stayed', hint: 'The room, the balcony, the front door, the view.', category: 'places', chapter: 'arrival', priority: 2 },
  { id: 'local-street', title: 'A beautiful street in {location}', fallbackTitle: 'A beautiful local street', hint: 'Doorways, shutters, signs, the colour of the place.', category: 'places', chapter: 'exploring', priority: 1, target: { base: 1, perDay: 0.5, max: 4 } },
  { id: 'landmark', title: 'A famous landmark', hint: 'Step back to show its scale; then one with you in it.', category: 'places', chapter: 'exploring', priority: 1, target: { base: 2, perDay: 0.5, max: 6 } },
  { id: 'scenic-view', title: 'A favourite scenic view', hint: 'Wide first, then a detail from the same spot.', category: 'places', chapter: 'exploring', priority: 1, target: { base: 1, perDay: 0.5, max: 4 } },
  { id: 'daily-highlight', title: 'Highlight of the day', hint: 'One photo that sums up today.', category: 'moments', chapter: 'exploring', priority: 2, perDay: true, when: { minDays: 2 } },
  { id: 'sunset', title: 'A memorable sunset', hint: 'Turn around too — the light on faces is often better than the sky.', category: 'moments', chapter: 'exploring', priority: 1 },
  { id: 'night', title: 'The place after dark', hint: 'Lights, lanterns, a late walk.', category: 'places', chapter: 'exploring', priority: 3 },
  { id: 'local-food', title: 'Local food or drinks', hint: 'Shoot from above or at table height, in daylight if you can.', category: 'food', chapter: 'flavours', priority: 1, target: { base: 2, perDay: 0.5, max: 6 } },
  { id: 'market', title: 'A market or local shop', hint: 'Colour, crowds, things you have never seen before.', category: 'places', chapter: 'flavours', priority: 3 },
  { id: 'cafe', title: 'A favourite café or coffee stop', category: 'food', chapter: 'flavours', priority: 2 },
  { id: 'souvenir', title: 'A souvenir or small detail worth remembering', hint: 'Shells, a postcard, a ticket stub, a handwritten menu.', category: 'details', chapter: 'last-day', priority: 1 },
  { id: 'final-day', title: 'A photograph from the final day', hint: 'One last look before you leave.', category: 'moments', chapter: 'last-day', priority: 1 },
  { id: 'heading-home', title: 'Heading home', hint: 'Tired, happy faces on the way back.', category: 'moments', chapter: 'last-day', priority: 3 },

  // ── People ────────────────────────────────────────────────
  { id: 'couple-laughing', title: 'A candid photograph of you both laughing', hint: 'Ask someone to keep shooting while you talk — the in-between frames are the good ones.', category: 'people', chapter: 'together', priority: 1, when: COUPLE },
  { id: 'couple-portrait', title: 'A portrait of {names}', fallbackTitle: 'A portrait of the two of you', hint: 'Find soft light: shade, or the hour before sunset.', category: 'people', chapter: 'together', priority: 1, when: COUPLE },
  { id: 'couple-selfie', title: 'A close-up selfie together', category: 'people', chapter: 'together', priority: 2, when: COUPLE },
  { id: 'hands', title: 'Hands held, or rings', hint: 'A close detail that says "us".', category: 'details', chapter: 'together', priority: 2, when: COUPLE },
  { id: 'solo-portrait', title: 'You in the frame', hint: 'Use a timer or ask a passer-by — future you will want proof you were there.', category: 'people', chapter: 'together', priority: 1, when: SOLO },
  { id: 'solo-moment', title: 'A quiet moment on your own', hint: 'A book, a view, a coffee — what solo time felt like.', category: 'moments', chapter: 'together', priority: 2, when: SOLO },
  { id: 'group-photo', title: 'Everyone together', hint: 'Shoot several frames so everyone has their eyes open in one.', category: 'people', chapter: 'together', priority: 1, when: CROWD },
  { id: 'each-person', title: 'A portrait of each person', hint: 'One person per photo, in their element.', category: 'people', chapter: 'together', priority: 2, when: { notGroups: ['solo', 'couple'], minParticipants: 2 }, target: { base: 1, perPerson: 1, max: 8 } },
  { id: 'kids-candid', title: 'The children exploring', hint: 'Get down to their eye level.', category: 'people', chapter: 'together', priority: 1, when: KIDS },
  { id: 'kids-reaction', title: 'A big reaction from the kids', hint: 'Wonder, giggles, the face on seeing something new.', category: 'moments', chapter: 'together', priority: 2, when: KIDS },
  { id: 'candid-laugh', title: 'Someone mid-laugh', hint: 'Keep shooting through the joke.', category: 'people', chapter: 'together', priority: 2, when: NOT_SOLO },
  { id: 'generations', title: 'Generations together', hint: 'Grandparents, parents and children in one frame.', category: 'people', chapter: 'together', priority: 2, when: { groups: ['family'] } },
  { id: 'photographer', title: 'The person usually behind the camera', hint: 'Hand the phone over — they belong in the album too.', category: 'people', chapter: 'together', priority: 3, when: NOT_SOLO },

  // ── Celebrations ──────────────────────────────────────────
  { id: 'getting-ready', title: 'Getting ready', hint: 'Outfits laid out, last touches, nervous smiles.', category: 'moments', chapter: 'getting-ready', priority: 2 },
  { id: 'outfit', title: 'Outfit details', hint: 'Shoes, jewellery, a buttonhole, a dress hanging up.', category: 'details', chapter: 'getting-ready', priority: 2 },
  { id: 'venue', title: 'The venue before everyone arrives', hint: 'Wide shot, then the small styling details.', category: 'places', chapter: 'getting-ready', priority: 2 },
  { id: 'decorations', title: 'Decorations', hint: 'Balloons, flowers, table settings, signs.', category: 'details', chapter: 'celebration', priority: 1 },
  { id: 'invitation', title: 'The invitation or card', category: 'details', chapter: 'getting-ready', priority: 3 },
  { id: 'cake', title: 'The cake', hint: 'Before anyone cuts it — then once it is cut.', category: 'food', chapter: 'celebration', priority: 1 },
  { id: 'candles', title: '{honoree} blowing out the candles', fallbackTitle: 'Blowing out the candles', hint: 'Burst mode helps; turn the flash off for the glow.', category: 'moments', chapter: 'celebration', priority: 1 },
  { id: 'toast', title: 'Raising a toast', hint: 'Glasses up, faces lit.', category: 'moments', chapter: 'celebration', priority: 2 },
  { id: 'speech', title: 'Speeches and the faces listening', hint: 'Turn round to catch the reactions.', category: 'moments', chapter: 'celebration', priority: 2 },
  { id: 'gifts', title: 'Opening gifts', category: 'moments', chapter: 'celebration', priority: 2 },
  { id: 'dancing', title: 'On the dance floor', hint: 'Slower shutter or burst mode for movement.', category: 'moments', chapter: 'celebration', priority: 2 },
  { id: 'feast', title: 'The food spread', category: 'food', chapter: 'celebration', priority: 2 },
  { id: 'honoree-portrait', title: 'A portrait of {honoree}', fallbackTitle: 'A portrait of the guest of honour', hint: 'Somewhere quiet, away from the bustle, for one calm frame.', category: 'people', chapter: 'celebration', priority: 1 },
  { id: 'honoree-with-guests', title: '{honoree} with the people who came', fallbackTitle: 'The guest of honour with the people who came', category: 'people', chapter: 'people', priority: 1, target: { base: 2, perPerson: 0.5, max: 8 } },
  { id: 'guests-candid', title: 'Guests enjoying themselves', category: 'people', chapter: 'people', priority: 2, target: 3 },
  { id: 'end-of-night', title: 'The end of the night', hint: 'Shoes off, leftovers, sleepy smiles.', category: 'moments', chapter: 'end', priority: 2 },

  // ── Everyday & home ───────────────────────────────────────
  { id: 'morning-light', title: 'Morning light at home', category: 'places', chapter: 'everyday', priority: 2 },
  { id: 'favourite-spot', title: 'A favourite spot', hint: 'The chair, the window, the bench you always go back to.', category: 'places', chapter: 'everyday', priority: 1 },
  { id: 'meal-together', title: 'A meal together', category: 'food', chapter: 'everyday', priority: 1 },
  { id: 'small-ritual', title: 'A small ritual', hint: 'Coffee, the walk to school, Sunday pancakes.', category: 'moments', chapter: 'everyday', priority: 1 },
  { id: 'season', title: 'What this season looks like', hint: 'Blossom, rain on the window, golden leaves.', category: 'places', chapter: 'everyday', priority: 2 },
  { id: 'handwriting', title: 'Something handwritten', hint: 'A note, a list, a drawing.', category: 'details', chapter: 'everyday', priority: 3 },
];

export const SHOT_LIBRARY: Record<string, ShotDef> = Object.fromEntries(list.map((s) => [s.id, s]));
