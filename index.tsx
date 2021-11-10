/* ———————————————————— Copyright (c) 2021 toastythetoaster ————————————————————
 *
 * Server Features Plugin
 *
 * ————————————————————————————————————————————————————————————————————————————— */

import { UPlugin } from '@classes';
import { Constants, GuildStore, React, getByDisplayName } from '@webpack';
import { after, unpatchAll } from '@patcher';
import { findInReactTree, suppressErrors, useForceUpdate } from '@util';
import { openConfirmationModal } from '@modules/Modals';

let LoafLib: any | null = null;
try {
  LoafLib = require('../LoafLib');
} catch (e) {
  const { Text } = require('@webpack').DNGetter;
  openConfirmationModal(
    'Missing Library', 
    <Text color={Text.Colors.STANDARD} size={Text.Sizes.SIZE_16}>
      The library <strong>LoafLib</strong> required for <strong>ServerFeatures</strong> is missing. 
      Please click Download Now to download it.
    </Text>,
    { 
      cancelText: 'Cancel',
      confirmText: 'Download Now',
      modalKey: 'ServerFeatures_DEP_MODAL',
      onConfirm: () => {
        const path = require('path');
        const git = require('isomorphic-git');
        const http = require('isomorphic-git/http/node');
        const fs = require('fs');
        git.clone({ fs, http, dir: path.join(__dirname, '../', 'LoafLib'), url: 'https://github.com/toastythetoaster/LoafLib' }).then(() => {
          Astra.plugins.reload('ServerFeatures');
        });
      }
    }
  );
}

const GuildFeatures = Object.keys(Constants.GuildFeatures).sort();

const settings = Astra.settings.get('ServerFeatures');

class Icon extends React.Component<{ displayName: string }> {
  render(): React.ReactNode {
    return (
      <>
        {this.props.children}
      </>
    );
  }
}

export default class ServerFeatures extends UPlugin {
  start(): void {
    if (LoafLib === null) return;
    suppressErrors(this.patchGuildContextMenu.bind(this))(this.promises);
  }

  stop(): void {
    if (LoafLib === null) return;
    this.GuildFeatureOverrides.clearAll();
    unpatchAll('guildCtxMenu');
  }

  constructMenu(guildId: string, features: string[], forceUpdate: any): any {
    const subItems = [];

    // Search bar
    // subItems.push(LoafLib.createContextMenuControlItem((_e, _t) => (
    //   <span style = {{ fontSize: '32px', fontFamily: 'Whitney', background: 'linear-gradient(#FFF 49%, #000 50%)' }}>
    //     <span style = {{ fontSize: '32px', fontFamily: 'Whitney', background: 'linear-gradient(#000 49%, #FFF 50%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>isotach</span>
    //   </span>
    // ), 'search'));
    // subItems.push(LoafLib.createContextMenuSeparator());

    GuildFeatures.forEach(Feature => {
      const checked = features.includes(Feature);
      const overridden = this.GuildFeatureOverrides.has(guildId, Feature);
      const options = { noClose: true, color: overridden ? 'colorBrand' : 'colorDefault' };
      subItems.push(LoafLib.createContextMenuCheckboxItem(Feature, () => {
        this.GuildFeatureOverrides.toggle(guildId, Feature);
        subItems.filter(i => i.props.id === Feature).forEach(i => {
          i.props.checked = !i.props.checked;
        });
        forceUpdate();
      }, Feature, checked, options));
    });

    subItems.push(LoafLib.createContextMenuSeparator());
    subItems.push(LoafLib.createContextMenuItem('Reset', () => {
      this.GuildFeatureOverrides.clear(guildId);
      forceUpdate();
    }, 'reset', { noClose: true, color: 'colorDanger', icon: () => React.createElement(Icon, { displayName: 'Trash' }, (<svg className='icon-LYJorE' aria-hidden='false' width='24' height='24' viewBox='0 0 24 24'>
      <path fill='currentColor' d='M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z' />
      <path fill='currentColor' d='M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z' />
    </svg>
    )) }));

    return LoafLib.createContextMenuSubMenu('Server Features', subItems, 'guild-features');
  }

  patchGuildContextMenu(): void {
    after('guildCtxMenu', getByDisplayName('GuildContextMenu', { onlyModule: true }), 'default', (_, [props], ret) => {
      const forceUpdate = useForceUpdate();
      const menu = findInReactTree(ret, e => e.type?.displayName === 'Menu')?.props?.children;
      if (!Array.isArray(menu)) return;
      const guildId: string = props.guild.id;
      if (!guildId) return;
      const featureSet: Set<string> = GuildStore.getGuild(guildId).features;
      const featureArr: string[] = Array.from(featureSet);
      const submenu = this.constructMenu(guildId, featureArr, forceUpdate);
      if (featureSet.has('HUB')) menu.splice(2, 0, LoafLib.createContextMenuGroup(submenu));
      else menu[3].props.children.splice(1, 0, submenu);
    });
  }

  GuildFeatureOverrides = class GuildFeatureOverrides {
    protected static get(guildId: string): Set<string> {
      const overrides = settings.get('overrides', {});
      if (!overrides[guildId] || overrides[guildId] === []) overrides[guildId] = new Set();
      return overrides[guildId];
    }

    protected static set(guildId: string, features: Set<string>): void {
      const overrides = settings.get('overrides', {});
      if (features.size === 0) delete overrides[guildId];
      else overrides[guildId] = features;
      settings.set('overrides', overrides);
    }

    public static has(guildId: string, feature: string): boolean {
      return this.get(guildId).has(feature);
    }

    protected static add(guildId: string, feature: string): void {
      const overrides = this.get(guildId);
      overrides.add(feature);
      this.toggleFeature(guildId, feature);
      this.set(guildId, overrides);
    }

    protected static delete(guildId: string, feature: string): void {
      const overrides = this.get(guildId);
      overrides.delete(feature);
      this.toggleFeature(guildId, feature);
      this.set(guildId, overrides);
    }

    public static toggle(guildId: string, feature: string): void {
      const overrides = this.get(guildId);
      if (overrides.has(feature)) this.delete(guildId, feature);
      else this.add(guildId, feature);
    }

    public static clear(guildId: string): void {
      this.get(guildId).forEach(feature => this.toggleFeature(guildId, feature));
      this.set(guildId, new Set());
    }

    public static clearAll(): void {
      const overrides = settings.get('overrides', {});
      Object.keys(overrides).forEach(guildId => this.clear(guildId));
    }

    // public static initAll(): void {
    //   const overrides = settings.get('overrides', {});
    //   Object.keys(overrides).forEach(guildId => overrides[guildId].forEach(feature => this.toggleFeature(guildId, feature)));
    // }

    protected static toggleFeature(guildId: string, feature: string): void {
      const guild = GuildStore.getGuild(guildId);
      if (!guild) return;
      const guildFeatures = guild.features;
      if (guildFeatures.has(feature)) guildFeatures.delete(feature);
      else guildFeatures.add(feature);
    }
  }
}
