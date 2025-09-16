import type { CardType, StockFilter, BanFilter } from "./constants";

export type CardSearchFilters = {
  q?: string;
  page?: number;
  pageSize?: number;

  cardType?: CardType;

  monsterClass?: string;
  race?: string;
  monsterRace?: string;
  attribute?: string;

  spellSubtype?: string;
  trapSubtype?: string;

  levelMin?: string | number;
  levelMax?: string | number;
  atkMin?: string | number;
  atkMax?: string | number;
  defMin?: string | number;
  defMax?: string | number;

  stock?: StockFilter;
  ban?: BanFilter;
};

export function buildCardSearchParams(f: CardSearchFilters) {
  const sp = new URLSearchParams();

  if (f.page) sp.set("page", String(f.page));
  if (f.pageSize) sp.set("pageSize", String(f.pageSize));
  if (f.q) sp.set("q", f.q);

  if (f.cardType && f.cardType !== "ALL") sp.set("cardType", f.cardType);

  if (f.cardType === "MONSTER") {
    if (f.monsterClass) sp.set("monsterClass", f.monsterClass);
    const raceValue = f.race ?? f.monsterRace;
    if (raceValue)      sp.set("race", raceValue);
    if (f.attribute)    sp.set("attribute", f.attribute);

    if (f.levelMin) sp.set("levelMin", String(f.levelMin));
    if (f.levelMax) sp.set("levelMax", String(f.levelMax));
    if (f.atkMin)   sp.set("atkMin",   String(f.atkMin));
    if (f.atkMax)   sp.set("atkMax",   String(f.atkMax));
    if (f.defMin)   sp.set("defMin",   String(f.defMin));
    if (f.defMax)   sp.set("defMax",   String(f.defMax));
  } else if (f.cardType === "SPELL") {
    if (f.spellSubtype) sp.set("spellSubtype", f.spellSubtype);
  } else if (f.cardType === "TRAP") {
    if (f.trapSubtype)  sp.set("trapSubtype",  f.trapSubtype);
  }

  if (f.stock && f.stock !== "all") sp.set("stock", f.stock);
  if (f.ban && f.ban !== "any")     sp.set("ban", f.ban);

  return sp;
}
