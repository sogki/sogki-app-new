# Placeholder Reference

This file lists placeholders available to templates rendered via `TemplateEngine`.

## Core

- `{brand}`
- `{online}`
- `{maxOnline}`
- `{player}`
- `{world}`
- `{x}`
- `{y}`
- `{z}`

## Cobblemon Stats

- `{pokemonCount}` (unique caught count / Pokedex caught)
- `{pokemonUniqueCaught}` (same as `pokemonCount`)
- `{pokemonOwnedCount}` (party + PC total owned)
- `{partyCount}`
- `{pcCount}`
- `{pokedexCaught}`
- `{pokedexSeen}`

## Team

- `{team}`
- `{teamDisplay}`
- `{teamColor}`
- `{teamSortKey}`
- `{teamTabPrefix}`
- `{teamPoints}`
- `{teamRank}`
- `{teamTotalCatches}`
- `{teamTotalQuizzes}`
- `{teamMissionsCompleted}`

## Titles

- `{title}` (resolved selected title display)
- `{titleDisplay}` (same as `title`)
- `{titlePrefix}` (title only when player chose prefix)
- `{titleSuffix}` (title only when player chose suffix)
- `{titlePosition}` (`prefix` / `suffix` / blank)

## Skill Tree

- `{skillPoints}`
- `{unusedSkillPoints}`
- `{skillUnlockedTotal}`
- `{skillMilestoneStep}`
- `{skillFishingGoodLootBonus}`
- `{skillCobblemonFirstTryCatchBonus}`
- `{skillLineSummary}`

Dynamic per-skill-line placeholders (generated from category id):

- `{skillTier_<categoryId>}`
- `{skillNextTier_<categoryId>}`

Examples with default categories:

- `{skillTier_recon}`
- `{skillTier_survival}`
- `{skillTier_tactics}`
- `{skillTier_creature_ops}`
- `{skillNextTier_recon}`
- `{skillNextTier_survival}`
- `{skillNextTier_tactics}`
- `{skillNextTier_creature_ops}`

## Skill Tooltip YAML (`skill-tooltips.yml`)

These placeholders are available in tooltip `title*` and `lore` lines:

- `{nodeId}`
- `{nodeName}`
- `{description}`
- `{descriptionColored}`
- `{path}`
- `{cost}`
- `{status}` (localized status with configured color; same as `{statusColored}`)
- `{statusText}` (localized status text without color)
- `{statusColored}` (status text with configured color)
- `{statusRaw}` (`unlocked`, `available`, `locked`)
- `{points}` (same as `{playerPoints}`)
- `{playerPoints}`
- `{unlockedTotal}`
- `{requires}` (comma-separated requirement names)
- `{requiresLine}` (full formatted requirement line, blank when none)
- `{actionLine}` (e.g. click to unlock / unlocked, blank when none)
- `{effectType}`
- `{progressType}`
- `{perkType}`
- `{value}`
- `{amplifier}`

Tip: Use `""` as a lore entry for an empty line.

## Capture Event Counters

- `{catchesTotal}`
- `{catchesShiny}`
- `{catchesLegendary}`
- `{lastCaughtPokemon}`
- `{lastCaughtShiny}`
- `{lastCaughtLegendary}`

## Context-Specific Placeholders

These placeholders are only available in specific message/template contexts:

- `{town}`
- `{day}`
- `{rewards}`
- `{streak}`
- `{status}`
- `{question}`
- `{seconds}`
- `{answer}`
- `{message}`
- `{mission}`
- `{current}`
- `{target}`
- `{period}`
- `{days}`
- `{rank}`
