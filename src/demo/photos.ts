/**
 * The example album's photos: CC0 (public-domain dedication) pictures from
 * Wikimedia Commons, resized for the web. Credits are shown at #/credits
 * even though CC0 does not require them.
 */

const urls = import.meta.glob<string>('./photos/*.jpg', { eager: true, query: '?url', import: 'default' });

export interface DemoPhotoInfo {
  name: string;
  width: number;
  height: number;
  chapter: string;
  author: string;
  title: string;
  page: string;
  caption?: string;
  favourite?: boolean;
}

type Row = [string, number, number, string, string, string, string, { caption?: string; favourite?: boolean } | undefined];

const ROWS: Row[] = [
  ['harbour', 1100, 736, 'arrival', 'Jebulon', 'Aegina harbour embankment', 'https://commons.wikimedia.org/wiki/File:Aegina_harbour_embankment.jpg', { favourite: true }],
  ['chapel', 1100, 656, 'arrival', 'Jebulon', 'Harbour chapel, red boat, Nea Artaki, Evia Greece', 'https://commons.wikimedia.org/wiki/File:Harbour_chapel,_red_boat,_Nea_Artaki,_Evia_Greece.jpg', undefined],
  ['fishing-boat', 1100, 865, 'arrival', 'Jebulon', 'Blue fishing boat harbour Eretria Euboea Greece', 'https://commons.wikimedia.org/wiki/File:Blue_fishing_boat_harbour_Eretria_Euboea_Greece.jpg', undefined],
  ['lane', 825, 1100, 'exploring', 'Ypsilon from Finland', 'Marbella Old town 1', 'https://commons.wikimedia.org/wiki/File:Marbella_Old_town_1.JPG', undefined],
  ['street', 825, 1100, 'exploring', 'Ypsilon from Finland', 'Marbella old town 4', 'https://commons.wikimedia.org/wiki/File:Marbella_old_town_4.jpg', undefined],
  ['courtyard', 733, 1100, 'exploring', 'Alehladutska', 'Nikosia old town', 'https://commons.wikimedia.org/wiki/File:Nikosia_old_town.jpg', undefined],
  ['marina', 1100, 825, 'exploring', 'weareaway', 'Izola harbour full of boats 2008', 'https://commons.wikimedia.org/wiki/File:Izola_harbour_full_of_boats_2008.jpg', undefined],
  ['bay', 1100, 743, 'exploring', 'Jebulon', 'Agios Minas bay Chalkida boats storm Greece', 'https://commons.wikimedia.org/wiki/File:Agios_Minas_bay_Chalkida_boats_storm_Greece.jpg', undefined],
  ['gelato', 1100, 641, 'flavours', 'Daderot', 'Gelato - Coimbra, Portugal - DSC00320', 'https://commons.wikimedia.org/wiki/File:Gelato_-_Coimbra,_Portugal_-_DSC00320.jpg', { caption: 'Gelato every afternoon' }],
  ['pizza', 1100, 825, 'flavours', 'Kurt Kaiser', 'Pizza 17', 'https://commons.wikimedia.org/wiki/File:Pizza_17.jpg', { caption: 'The pizza place by the port' }],
  ['market', 1100, 628, 'flavours', 'Daderot', 'Fruit market in Genoa, Italy - DSC01268', 'https://commons.wikimedia.org/wiki/File:Fruit_market_in_Genoa,_Italy_-_DSC01268.JPG', undefined],
  ['beach-sunset', 1100, 1100, 'together', 'Kate Branch Photography', 'Cable Beach Sunset by Kate Branch', 'https://commons.wikimedia.org/wiki/File:Cable_Beach_Sunset_by_Kate_Branch.jpg', { caption: 'First swim of the summer', favourite: true }],
  ['beach-bar', 1100, 825, 'together', 'Grandmaster Huon', 'Beach resort in curacao', 'https://commons.wikimedia.org/wiki/File:Beach_resort_in_curacao.jpg', undefined],
  ['sailing', 1100, 698, 'together', 'Wilfredor', 'Sailing boat on the Saint Lawrence at Quebec City', 'https://commons.wikimedia.org/wiki/File:Sailing_boat_on_the_Saint_Lawrence_at_Quebec_City.jpg', undefined],
  ['boats-sunset', 1100, 626, 'last-day', 'Wilfredor', 'Juan Griego Sunset', 'https://commons.wikimedia.org/wiki/File:Juan_Griego_Sunset.jpg', undefined],
  ['last-light', 1100, 733, 'last-day', 'Bonnie Moreland', 'Lone Ranch Beach Oregon at sunset', 'https://commons.wikimedia.org/wiki/File:Lone_Ranch_Beach_Oregon_at_sunset.jpg', undefined],
];

export const DEMO_PHOTO_INFO: DemoPhotoInfo[] = ROWS.map(([name, width, height, chapter, author, title, page, extra]) => ({ name, width, height, chapter, author, title, page, ...extra }));

export const demoPhotoUrl = (name: string): string | undefined => urls[`./photos/${name}.jpg`];
