/*
    SPDX-FileCopyrightText: 2018 Eon S. Jeon <esjeon@hyunmu.am>
    SPDX-FileCopyrightText: 2024 Vjatcheslav V. Kolchkov <akl334@protonmail.ch>

    SPDX-License-Identifier: MIT
*/

class KWinConfig implements IConfig {
    public screenGapTop: number;
    public screenGapLeft: number;
    public screenGapBetween: number;
    public screenGapRight: number;
    public screenGapBottom: number;
    public movePointerOnFocus: boolean;
    public defaultSplitOrientation: 'horizontal' | 'vertical';
    public ignoreClass: string[];
    public ignoreTitle: string[];
    public ignoreRole: string[];
    public floatingClass: string[];
    public floatingTitle: string[];
    public floatDefault: boolean;
    public floatUtility: boolean;
    public preventMinimize: boolean;
    public floatSkipPager: boolean;
    public notificationDuration: number;

    // Legacy/Unused options required by interface or logic
    public gapsOverrideConfig: string[] = [];

    // Meta config - kept minimal to avoid breaks
    public metaIsToggle: boolean = false;
    public metaIsPushedTwice: boolean = false;
    public metaTimeout: number = 0;
    public metaConf: string[] = [];
    public defaultMetaConfig: { [key: string]: Shortcut } = {};

    constructor() {
        // Hardcoded defaults for minimal setup
        this.screenGapTop = 0;
        this.screenGapBottom = 0;
        this.screenGapLeft = 0;
        this.screenGapRight = 0;
        this.screenGapBetween = 0;
        this.movePointerOnFocus = false;
        this.defaultSplitOrientation = 'horizontal';

        this.ignoreClass = ['krunner', 'yakuake', 'spectacle', 'kded5'];
        this.ignoreTitle = [];
        this.ignoreRole = ['hider'];

        this.floatingClass = [];
        this.floatingTitle = [];

        this.floatDefault = false;
        this.floatUtility = true;
        this.preventMinimize = false;
        this.floatSkipPager = true;
        this.notificationDuration = 2000;
        
        this.readConfig();
    }
    
    private readConfig() {
        // In a real scenario, this would read from KWin configuration
        // For now, we use defaults.
        // If we want to read actual config, we need KWin API calls.
        // Assuming this script replaces the complex config loader.
    }
    
    public toString(): string {
        return 'KWinConfig(minimal)';
    }
}
var KWINCONFIG: KWinConfig; // Keep unique specific var if needed, or remove.
// var CONFIG is in common.ts
