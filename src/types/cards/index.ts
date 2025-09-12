export type CardDetail = {
  id: number;
  name: string;
  type: string | null;
  attribute?: string | null;
  race?: string | null;          // ex: Spellcaster / Dragon…
  atk?: number | null;
  def?: number | null;
  level?: number | null;
  desc?: string | null;          // effet
  imageSmallUrl?: string | null;
  imageLargeUrl?: string | null; // si dispo
};

export type CardDetailDTO = {
  id: number;
  name: string;
  type: string | null;
  attribute: string | null;
  race: string | null;
  atk: number | null;
  def: number | null;
  level: number | null;
  desc: string | null;
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
};