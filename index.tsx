
/* ———————————————————— Copyright (c) 2021 toastythetoaster ————————————————————
 *
 * Server Features Plugin
 *
 * ————————————————————————————————————————————————————————————————————————————— */

import { UPlugin } from '@classes';
import { Constants, GuildStore, React, getByDisplayName } from '@webpack';
import { after, unpatchAll } from '@patcher';
import { findInReactTree, suppressErrors, useForceUpdate } from '@util';
//@ts-ignore
import { openConfirmationModal } from '@modules/Modals';

import GuildFeatureOverrideManager from './GuildFeatureOverrideManager';

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

const settings = Astra.settings.get('ServerFeatures');

const GuildFeatureOverrides = new GuildFeatureOverrideManager(settings);

const GuildFeatures = Object.keys(Constants.GuildFeatures).sort();

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
    GuildFeatureOverrides.clearAll();
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
      const overridden = GuildFeatureOverrides.has(guildId, Feature);
      const options = { noClose: true, color: overridden ? 'colorBrand' : 'colorDefault' };
      subItems.push(LoafLib.createContextMenuCheckboxItem(Feature, () => {
        GuildFeatureOverrides.toggle(guildId, Feature);
        subItems.filter(i => i.props.id === Feature).forEach(i => {
          i.props.checked = !i.props.checked;
        });
        forceUpdate();
      }, Feature, checked, options));
    });

    subItems.push(LoafLib.createContextMenuSeparator());
    subItems.push(LoafLib.createContextMenuItem('Reset', () => {
      GuildFeatureOverrides.clear(guildId);
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
}
