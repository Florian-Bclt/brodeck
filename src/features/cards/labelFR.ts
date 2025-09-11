import { Attribute, ATTRIBUTES, MONSTER_CLASSES, MONSTER_RACES, MonsterClass, MonsterRace, SPELL_SUBTYPES, SpellSubtype, TRAP_SUBTYPES, TrapSubtype } from "./constants";

// Petites maps FR (on garde les valeurs en EN côté "value")
const FR_CARD_TYPE: Record<string,string> = {
  ALL: "Tous", MONSTER: "Monstre", SPELL: "Magie", TRAP: "Piège",
};

const FR_MONSTER_CLASS: Partial<Record<typeof MONSTER_CLASSES[number], string>> = {
  Effect: "Effet", Normal: "Normal", Ritual: "Rituel",
  Fusion: "Fusion", Synchro: "Synchro", Xyz: "Xyz",
  Link: "Lien", Pendulum: "Pendule",
};

const FR_MONSTER_RACE: Partial<Record<typeof MONSTER_RACES[number], string>> = {
  Spellcaster: "Magicien", Dragon: "Dragon", Warrior: "Guerrier", Beast: "Bête",
  "Beast-Warrior": "Bête-Guerrier", "Winged Beast": "Bête Ailée",
  Aqua: "Aqua", Fish: "Poisson", "Sea Serpent": "Serpent de Mer",
  Reptile: "Reptile", Dinosaur: "Dinosaure", Machine: "Machine", Psychic: "Psychique",
  Rock: "Rocher", Pyro: "Pyro", Thunder: "Tonnerre", Plant: "Plante", Insect: "Insecte",
  Zombie: "Zombie", Fairy: "Fée", Fiend: "Démon", "Divine-Beast": "Bête Divine",
  Wyrm: "Wyrm", Cyberse: "Cyberse", Illusion: "Illusion"
};

const FR_ATTRIBUTE: Partial<Record<typeof ATTRIBUTES[number], string>> = {
  DARK: "Ténèbres", LIGHT: "Lumière", EARTH: "Terre", WIND: "Vent",
  WATER: "Eau", FIRE: "Feu", DIVINE: "Divin",
};

const FR_SPELL_SUBTYPE: Partial<Record<typeof SPELL_SUBTYPES[number], string>> = {
  Normal: "Normale", "Quick-Play": "Magie-Rapide", Continuous: "Continue",
  Field: "Terrain", Equip: "Équipement", Ritual: "Rituel",
};

const FR_TRAP_SUBTYPE: Partial<Record<typeof TRAP_SUBTYPES[number], string>> = {
  Normal: "Normale", Continuous: "Continue", Counter: "Contre-Piège",
};

const FR_BAN: Record<string,string> = {
  any: "Toutes", legal: "Autorisée", limited: "Limitée",
  semi_limited: "Semi-limitée", banned: "Bannie",
};

// Helpers — surchargés pour accepter union OU string, sans erreur d’indexation
export function tCardType(v: string): string {
  return FR_CARD_TYPE[v] ?? v;
}
export function tMonsterClass(v: MonsterClass | string): string {
  return (FR_MONSTER_CLASS as Record<string, string>)[v] ?? v;
}
export function tMonsterRace(v: MonsterRace | string): string {
  return (FR_MONSTER_RACE as Record<string, string>)[v] ?? v;
}
export function tAttribute(v: Attribute | string): string {
  return (FR_ATTRIBUTE as Record<string, string>)[v] ?? v;
}
export function tSpellSubtype(v: SpellSubtype | string): string {
  return (FR_SPELL_SUBTYPE as Record<string, string>)[v] ?? v;
}
export function tTrapSubtype(v: TrapSubtype | string): string {
  return (FR_TRAP_SUBTYPE as Record<string, string>)[v] ?? v;
}
export function tBan(v: string): string {
  return FR_BAN[v] ?? v;
}

// Génère des options {value, label} avec traduction
export function toOptions<T extends string>(
  values: readonly T[],
  t?: (v: T) => string
): { value: T; label: string }[] {
  return values.map((v) => ({ value: v, label: t ? t(v) : v }));
}
