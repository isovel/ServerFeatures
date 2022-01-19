
/* ——————— Copyright (c) 2021-2022 toastythetoaster. All rights reserved. ———————
 *
 * GuildFeatureOverrideManager Module
 *
 * —————————————————————————————————————————————————————————————————————————————— */

import { GuildStore } from '@webpack';
import { SettingsObject } from '@classes';

export default class GuildFeatureOverrideManager {
  protected settings: SettingsObject;

  constructor(settings: any) {
    this.settings = settings;
  }

  protected get(guildId: string): Set<string> {
    const overrides: any = this.settings.get('overrides', {});
    if (!overrides[guildId]) overrides[guildId] = new Set();
    if (!(overrides[guildId] instanceof Set)) overrides[guildId] = new Set(overrides[guildId]);
    return overrides[guildId];
  }

  protected set(guildId: string, features: Set<string>): void {
    const overrides = this.settings.get('overrides', {});
    if (features.size === 0) delete overrides[guildId];
    else overrides[guildId] = features;
    this.settings.set('overrides', overrides);
  }

  public has(guildId: string, feature: string): boolean {
    return this.get(guildId).has(feature);
  }

  protected add(guildId: string, feature: string): void {
    const overrides = this.get(guildId);
    overrides.add(feature);
    this.toggleFeature(guildId, feature);
    this.set(guildId, overrides);
  }

  protected delete(guildId: string, feature: string): void {
    const overrides = this.get(guildId);
    overrides.delete(feature);
    this.toggleFeature(guildId, feature);
    this.set(guildId, overrides);
  }

  public toggle(guildId: string, feature: string): void {
    const overrides = this.get(guildId);
    if (overrides.has(feature)) this.delete(guildId, feature);
    else this.add(guildId, feature);
  }

  public clear(guildId: string): void {
    this.get(guildId).forEach(feature => this.toggleFeature(guildId, feature));
    this.set(guildId, new Set());
  }

  public clearAll(): void {
    const overrides = this.settings.get('overrides', {});
    Object.keys(overrides).forEach(guildId => this.clear(guildId));
  }

  protected toggleFeature(guildId: string, feature: string): void {
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return;
    const guildFeatures = guild.features;
    if (guildFeatures.has(feature)) guildFeatures.delete(feature);
    else guildFeatures.add(feature);
  }
}
