import { BanFilter, CardType, StockFilter } from "@/features/cards/constants";

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

export type CardRow = {
  id: number;
  name: string;
  type?: string | null;
  imageSmallUrl?: string | null
};

export type Filters = {
  cardType: CardType;
  monsterClass: string;
  monsterRace: string;
  attribute: string;
  spellSubtype: string;
  trapSubtype: string;
  levelMin: string; levelMax: string;
  atkMin: string;   atkMax: string;
  defMin: string;   defMax: string;
  stock: StockFilter;
  ban: BanFilter;
};

export type ListResp = { total: number; page: number; pageSize: number; data: CardRow[] };