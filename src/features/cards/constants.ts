export const MONSTER_CLASSES = [
  "Effect","Normal","Ritual","Fusion","Synchro","Xyz","Link","Pendulum",
] as const;

export const MONSTER_RACES = [
  "Spellcaster","Dragon","Warrior","Beast","Beast-Warrior","Winged Beast","Aqua","Fish","Sea Serpent",
  "Reptile","Dinosaur","Machine","Psychic","Rock","Pyro","Thunder","Plant","Insect","Zombie",
  "Fairy","Fiend","Divine-Beast","Wyrm","Cyberse", "Illusion"
] as const;

export const ATTRIBUTES = ["DARK","LIGHT","EARTH","WIND","WATER","FIRE","DIVINE"] as const;

export const SPELL_SUBTYPES = ["Normal","Quick-Play","Continuous","Field","Equip","Ritual"] as const;
export const TRAP_SUBTYPES  = ["Normal","Continuous","Counter"] as const;

export type MonsterClass = typeof MONSTER_CLASSES[number];
export type MonsterRace  = typeof MONSTER_RACES[number];
export type Attribute    = typeof ATTRIBUTES[number];
export type SpellSubtype = typeof SPELL_SUBTYPES[number];
export type TrapSubtype  = typeof TRAP_SUBTYPES[number];

export type CardType = "ALL" | "MONSTER" | "SPELL" | "TRAP";
export type StockFilter = "all" | "owned" | "unowned";
export type BanFilter   = "any" | "legal" | "limited" | "semi_limited" | "banned";
